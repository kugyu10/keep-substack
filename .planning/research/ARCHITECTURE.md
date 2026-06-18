# Architecture Research

**Domain:** Substack Notes PoC（コメント可視化＋Note一覧取得）を既存 Next.js App Router / Supabase / Vercel アプリへ追加統合
**Researched:** 2026-06-18
**Confidence:** HIGH（既存コードベース統合点）/ MEDIUM（Substack 非公式エンドポイント仕様）

---

## 結論サマリー（最初に読む）

- **fetch はどこで起こすか:** サーバー側固定。Substack の非公式エンドポイント（`https://<pub>.substack.com/api/v1/...`）はブラウザから直叩きすると CORS で弾かれ、かつ認証 Cookie（`connect.sid`/`substack.sid`）が必要なため、**ブラウザからは絶対に呼べない**。既存の `fetchFeed.ts` と同じ「サーバーで `fetch()` → 整形して RSC/Action が返す」パターンを踏襲する。機能1は **Server Action**（Note URL/ID をフォーム入力 → fetch → キャッシュ書込 → 再表示）、機能2は **Server Component で fetch して描画**（永続化なし）。Cron/Route Handler は今回は不要（バックグラウンド更新が要件にないため）。
- **コメントキャッシュ table:** 新規 `note_comments` 1テーブル（`note_id, comment_id (複合PK), author_name, author_avatar_url, body, comment_created_at, fetched_at`）。PoC なので TTL は「`fetched_at` が N時間以内ならキャッシュ採用、超過なら再取得」の単純戦略。
- **build order:** ① 取得可否スパイク（最大リスク。STACK 参照）→ ② 機能2（永続化なし・最小・取得検証の延長）→ ③ `note_comments` スキーマ＋ `lib/noteComments.ts` → ④ 機能1（Action＋キャッシュ＋表示UI）。データ取得が通らなければ ② 以降は設計のみで止める。

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                  Browser (Client / RSC payload)                    │
│   ┌────────────────────┐        ┌──────────────────────────────┐  │
│   │ /admin/notes (UI)  │        │ NoteCommentForm (client)     │  │
│   │  - Note一覧表示    │        │  - URL/ID入力 → Action呼出   │  │
│   └─────────┬──────────┘        └──────────────┬───────────────┘  │
│  (RSC: SSR rendered)            (Server Action submit)             │
├────────────┼───────────────────────────────────┼─────────────────┤
│            ▼ server render                       ▼ "use server"    │
│   ┌────────────────────┐        ┌──────────────────────────────┐  │
│   │ Server Component   │        │ Server Action                │  │
│   │ fetchAdminNotes()  │        │ fetchAndCacheComments()      │  │
│   └─────────┬──────────┘        └──────┬─────────────────┬─────┘  │
│             │                          │ cache hit?      │ miss    │
│             ▼                          ▼                 ▼          │
│   ┌──────────────────────────────────────┐   ┌──────────────────┐ │
│   │     lib/notes.ts (server fetcher)     │   │ note_comments    │ │
│   │  fetch(substack /api/v1/..) + 整形     │   │ (Supabase PG)    │ │
│   └────────────────┬──────────────────────┘   └──────────────────┘ │
├────────────────────┼───────────────────────────────────────────────┤
│                     ▼ HTTPS (server-only, cookie auth)              │
│              ┌──────────────────────────────┐                       │
│              │  substack.com /api/v1/...     │ (非公式・未保証)      │
│              └──────────────────────────────┘                       │
└────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `lib/notes.ts`（新規） | Substack 非公式エンドポイントへの **サーバー専用 fetch** ＋ JSON→型整形。`fetchFeed.ts` の双子。AbortSignal.timeout / Promise.allSettled / リトライを踏襲 | `fetch()` + cookie header（env `SUBSTACK_SESSION_COOKIE`） |
| `lib/noteComments.ts`（新規） | `note_comments` への read/upsert／キャッシュ鮮度判定。`articles.ts` の双子 | `createSupabaseAdminClient()` + upsert(onConflict) |
| Server Action `fetchAndCacheComments`（新規） | 機能1の制御フロー：キャッシュ参照→hitなら返す／missなら `lib/notes.ts` で取得→`note_comments` 書込→返す | `"use server"` action（admin guard 内） |
| Server Component `/admin/notes`（新規 route） | 機能1/2の表示 RSC。機能2は描画時に `fetchAdminNotes()` 直呼び（永続化なし） | `app/(main)/admin/notes/page.tsx` |
| `NoteCommentForm`（新規 client component） | Note URL/ID 入力フォーム。`AdminAddForm.tsx` のパターン踏襲（onClick+FormData手動構築の既存規約あり） | client component |
| `middleware.ts`（既存・無変更） | `/admin/*` 配下なので既存認証ガードがそのまま効く | 変更不要 |

---

## Recommended Project Structure

```
src/
├── app/(main)/admin/notes/
│   ├── page.tsx              # 新規: 機能1+2の表示RSC（機能2はここでfetch）
│   ├── actions.ts            # 新規: "use server" fetchAndCacheComments
│   ├── NoteCommentForm.tsx   # 新規: Note URL/ID入力 client component
│   └── NoteCommentList.tsx   # 新規: コメント一覧表示（件数/本文/名前/アイコン）
├── lib/
│   ├── notes.ts              # 新規: Substack非公式APIサーバーfetch（fetchFeed.tsの双子）
│   ├── noteComments.ts       # 新規: note_comments read/upsert+鮮度判定（articles.tsの双子）
│   └── types.ts              # 修正: NoteComment / AdminNote 型を追加
├── app/(main)/admin/page.tsx # 修正: /admin/notes へのリンク1行追加（teams リンクと同様）
supabase/
└── schema.sql                # 修正: note_comments テーブル + RLS を追記（canonical source）
```

### Structure Rationale

- **`/admin/notes` 配下に置く:** 既存 `middleware.ts` が `/admin/*` を認証ガード済み。PoC は admin（開発者本人）が対象なので追加のガード実装ゼロで保護される。機能2の対象が将来メンバー/任意ユーザーへ拡張しても route 移設で対応可。
- **`lib/notes.ts` を `fetchFeed.ts` の双子として独立させる:** 既存の RSS フェッチと責務が完全に分離（RSS feed vs Notes/comments JSON API）。混ぜない。
- **`lib/noteComments.ts` を `articles.ts` の双子に:** `createSupabaseAdminClient()` + upsert(onConflict) の既存パターンをそのまま再利用でき、レビュー負荷が低い。

---

## コメントキャッシュ table スキーマ（機能1・最小）

```sql
-- 機能1: Note のコメントをキャッシュ（再取得回避）
CREATE TABLE IF NOT EXISTS note_comments (
  note_id            TEXT NOT NULL,           -- 対象 Note の識別子（URL/IDから正規化）
  comment_id         TEXT NOT NULL,           -- Substack 側コメントID（冪等upsertキー）
  author_name        TEXT,
  author_avatar_url  TEXT,
  body               TEXT,
  comment_created_at TIMESTAMPTZ,             -- コメント自体の投稿日時（Substack側）
  fetched_at         TIMESTAMPTZ NOT NULL DEFAULT now(),  -- このアプリが取得した時刻＝鮮度判定用
  PRIMARY KEY (note_id, comment_id)           -- onConflict 冪等upsert
);

CREATE INDEX IF NOT EXISTS idx_note_comments_note ON note_comments(note_id);

ALTER TABLE note_comments ENABLE ROW LEVEL SECURITY;
-- PoC: 表示は admin 配下（middlewareガード）。public select は付けず、
-- 読み書きとも service_role（createSupabaseAdminClient）経由に閉じる。
-- 既存 articles 同様に必要なら "public select" を後付け可能。
```

- **件数（comment count）** は `SELECT count(*) FROM note_comments WHERE note_id = ?` で導出（別カラム不要）。
- **`comment_created_at` と `fetched_at` を分離**: 前者は「いつコメントされたか（表示用）」、後者は「いつ我々が取りに行ったか（TTL判定用）」。混同しない。
- **`note_fetch_log`（任意・後付け可）**: `note_id, last_fetched_at, comment_count` を持てば「コメント0件の Note」もキャッシュ済みと判定できる（`note_comments` だけだと0件 Note を毎回再取得してしまう）。PoC では `note_comments` に行が無い＝未取得とみなす単純実装で開始し、0件問題が出たら追加。

### Cache freshness strategy（PoC）

```
fetchAndCacheComments(noteId, force?):
  rows = SELECT * FROM note_comments WHERE note_id = noteId
  if !force AND rows.length > 0 AND max(fetched_at) within TTL (例: 6h):
      return rows                       # キャッシュヒット
  fresh = lib/notes.fetchComments(noteId)   # サーバーfetch
  upsert note_comments (onConflict note_id,comment_id, fetched_at=now())
  return fresh
```

- TTL は env `NOTES_CACHE_TTL_SECONDS`（既存 `REVALIDATE_SECONDS` の流儀）で可変に。PoC 既定は長め（手動再取得が主目的なので 6〜24h で十分）。
- 「強制再取得」ボタンを Action に渡す `force` フラグ1つで TTL を無視できるようにすると検証が楽（PoC として推奨）。

---

## Architectural Patterns

### Pattern 1: Server-only fetch wrapper（最重要）

**What:** Substack 非公式 API を `lib/notes.ts` の中だけで `fetch()` する。client component からは呼ばない。
**When to use:** 全 Substack データ取得。
**Trade-offs:** CORS と認証 Cookie 漏洩を構造的に防げる（＋）／クライアント側の楽観更新はできない（PoC では不要）。

```typescript
// lib/notes.ts （サーバー専用。'server-only' import を付けて誤用を物理的に防ぐ）
import 'server-only'

const COOKIE = process.env.SUBSTACK_SESSION_COOKIE // connect.sid / substack.sid

export async function fetchNoteComments(noteId: string): Promise<NoteComment[]> {
  const res = await fetch(`https://substack.com/api/v1/.../${noteId}/comments`, {
    headers: { Accept: 'application/json', Cookie: `connect.sid=${COOKIE}` },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Substack ${res.status}`)
  // ... JSON → NoteComment[] 整形
}
```

### Pattern 2: Action-gated cache-aside（機能1）

**What:** Server Action がキャッシュ参照を先に行い、miss 時のみ外部 fetch。`articles.ts` の upsert(onConflict) を流用。
**When to use:** 永続化ありの機能1。
**Trade-offs:** Substack への request を最小化（＋・非公式APIのレート対策＝1req/s 推奨に効く）。

### Pattern 3: Ephemeral RSC fetch（機能2）

**What:** Server Component の描画中に `fetchAdminNotes()` を直接 await し、DB を一切経由しない。`dynamic = 'force-dynamic'` で毎回取得。
**When to use:** 永続化なしの機能2。
**Trade-offs:** 実装最小（＋）／毎回 Substack を叩く（PoC・1人運用なら許容）。

## Data Flow

### 機能1（コメント可視化・永続化あり）

```
[admin が Note URL/ID 入力] → NoteCommentForm submit
   ↓ ("use server")
fetchAndCacheComments(noteId)
   ↓ cache hit (fetched_at within TTL)? ── YES ─→ note_comments SELECT → 表示
   ↓ NO
lib/notes.fetchNoteComments() → substack.com/api/v1
   ↓
note_comments UPSERT (onConflict note_id,comment_id)
   ↓
NoteCommentList 再描画（件数=count, 本文, 名前, アイコン）
```

### 機能2（Note一覧・永続化なし）

```
[admin が /admin/notes を開く] → Server Component 描画
   ↓ await lib/notes.fetchAdminNotes()
substack.com/api/v1/notes (cookie auth)
   ↓ 整形
そのまま JSX で一覧描画（DB書込なし）
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| PoC（1 admin） | 現設計でそのまま。手動トリガ＋長めTTLで Substack 負荷ほぼゼロ |
| メンバー全員に拡張 | 機能2にもキャッシュ（`note_comments` 同様の table か Cron 化）を導入。1req/s レート遵守のため Cron バッチ＋ジッタ |
| 任意ユーザー公開 | `connect.sid` 共有は1アカウント上限＝ボトルネック。公開化前に取得手段（認証無しで取れる範囲）を再検証 |

### Scaling Priorities

1. **First bottleneck:** Substack 非公式 API のレート制限（推奨 1req/s）と Cookie 失効。→ 取得は必ずサーバー集約＋キャッシュ＋手動/低頻度トリガ。
2. **Second bottleneck:** ハンドル変更による 404。→ `note_id` は URL ではなく安定 ID で保存し、取得失敗を UI に明示。

## Anti-Patterns

### Anti-Pattern 1: ブラウザから substack.com/api を直 fetch
**What people do:** client component で `fetch('https://substack.com/api/...')`。
**Why it's wrong:** CORS で必ず失敗し、成功しても `connect.sid` Cookie がクライアントに露出する重大なセキュリティ問題。
**Do this instead:** `lib/notes.ts`（`server-only`）経由のサーバー fetch のみ。

### Anti-Pattern 2: 機能2をキャッシュテーブルに永続化する
**What people do:** 「ついでに」Note 一覧も DB 保存。
**Why it's wrong:** 要件は明示的に永続化なし。スキーマと同期ロジックが無駄に増え PoC が肥大化（YAGNI）。
**Do this instead:** RSC 内で fetch して捨てる。

### Anti-Pattern 3: 取得可否未検証のままスキーマ・UI を先に作る
**What people do:** table と画面を先に組む。
**Why it's wrong:** 最大リスクはデータ取得手段（STACK 参照）。取得不能なら全て手戻り。
**Do this instead:** build order ① の取得スパイクを最優先。失敗時は設計のみで停止。

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Substack 非公式 API (`/api/v1/...`) | サーバー fetch + Cookie 認証（env `SUBSTACK_SESSION_COOKIE`） | 公式未保証・ハンドル変更で404・1req/s 推奨。Cookie は Vercel env に秘匿。詳細仕様は STACK / 取得スパイクで確定 |
| Supabase Postgres | 既存 `createSupabaseAdminClient()` + upsert | `note_comments` のみ新規。RLS は service_role 経由に閉じる |
| Vercel | 既存デプロイにそのまま乗る | Cron 不要（手動トリガ）。Server Action の実行時間は短く maxDuration 問題なし |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `/admin/notes` RSC ↔ `lib/notes.ts` | 直接 await（機能2） | DB 非経由 |
| Server Action ↔ `lib/noteComments.ts` ↔ `lib/notes.ts` | cache-aside（機能1） | キャッシュ先行 |
| 既存 `middleware.ts` ↔ `/admin/notes` | 認証ガード（無変更） | `/admin/*` 配下なので自動適用 |

## Suggested Build Order

1. **取得可否スパイク（最大リスク・先行必須）** — `lib/notes.ts` の素案で comments / notes 両エンドポイントを実 Cookie で叩き JSON 形を確認。失敗なら以降を設計のみで停止。
2. **機能2（永続化なし）** — `/admin/notes` RSC ＋ `fetchAdminNotes()` ＋一覧 UI。取得検証の自然な延長で、DB 不要なので最小。
3. **`note_comments` スキーマ ＋ `lib/noteComments.ts`** — schema.sql に追記、本番は SQL Editor で適用（既存運用）。
4. **機能1（永続化あり）** — Server Action `fetchAndCacheComments`（cache-aside + TTL + force フラグ）＋ `NoteCommentForm` / `NoteCommentList`、`/admin` にリンク追加。

## Sources

- 既存コードベース（HIGH）: `src/lib/fetchFeed.ts`, `src/lib/articles.ts`, `src/app/api/cron/route.ts`, `src/app/(main)/admin/page.tsx`, `supabase/schema.sql`, `src/middleware.ts`
- [How I reverse-engineered Substack API](https://iam.slys.dev/p/no-official-api-no-problem-how-i)（MEDIUM）
- [NHagar/substack_api (unofficial wrapper)](https://github.com/NHagar/substack_api)（MEDIUM）
- [Automating Substack Notes](https://mostlypython.substack.com/p/automating-substack-notes)（MEDIUM — `/api/v1/comment/feed`, cookie 認証）
- [Scraping Substack via undocumented API](https://medium.com/@hungcheungchan/scraping-substack-metadata-using-undocumented-unofficial-api-aee82786b507)（LOW）

---
*Architecture research for: Substack Notes PoC integration into existing Next.js/Supabase app*
*Researched: 2026-06-18*
