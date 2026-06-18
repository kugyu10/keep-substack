# Phase 42: 機能1 コメント可視化（キャッシュ基盤 + 永続化） - Research

**Researched:** 2026-06-18
**Domain:** Next.js App Router (RSC) + 非公式 Substack Comment API + Supabase キャッシュ永続化
**Confidence:** HIGH（スパイク Phase 40 GO 済み・既存 Phase 41 パターン実測再利用）

## Summary

スパイク Phase 40 が GO 判定を出しており、エンドポイント仕様・レスポンス構造・Vercel からの到達性は実測確定済み。本フェーズは新規調査ではなく、**Phase 41 の安定パターン（`src/lib/notes.ts` + `admin/notes/page.tsx`）への忠実な再適用** と、**Supabase キャッシュ層の追加設計**が主眼。

実装は3層に分かれる: (1) 純関数 `src/lib/comments.ts`（`parseNoteId` / `parseComment` / `parseReplies` + 型ガード + fetch&retry + 判別ユニオン）、(2) Supabase `note_comments` テーブル（キャッシュ・JSONB 1行保存・`fetched_at` 鮮度判定）、(3) 公開ルート `/notes` ページ（RSC・3状態表示・JST・force 再取得）。フィクスチャ（id=`276780760`）で `reader.comment.children_count`（=4）と `replies.commentBranches.length`（=4）が一致することを実測確認済み — COMMENT-02 の件数は reader の `children_count`、本文一覧は replies の `commentBranches[].comment` から取得する。

**Primary recommendation:** `notes.ts` の構造（純関数 + 判別ユニオン + `no-store`/`AbortSignal.timeout(5000)`/res.ok→throw→1秒リトライ）を 1:1 で踏襲し、その手前に「DB キャッシュ hit/stale/force 判定 → miss 時のみ fetch → upsert」を挟む。アイコンは外部ドメイン許可不要の plain `<img>` + イニシャル fallback。

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| URL/ID 寛容パース (COMMENT-01) | Server (純関数 lib) | — | 入力検証はサーバ純関数。クライアント JS 不要。 |
| コメント件数/本文/著者取得 (COMMENT-02/03/04) | API/Backend (サーバ側 fetch) | — | 非公式 API 呼び出しは cookie 不要のサーバ fetch。CORS/秘匿のためブラウザから直接叩かない。 |
| キャッシュ永続化・鮮度判定・force (COMMENT-05) | Database (Supabase) | API/Backend | 書き込みは service_role。読みは鮮度判定込みでサーバ側。 |
| アイコン fallback (COMMENT-04) | Browser/Client (描画) | Server | `photo_url` 有無の分岐描画。`<img>` の onError ではなく取得時に null 判定推奨。 |
| 3状態表示 (COMMENT-06) | Frontend Server (RSC) | — | 判別ユニオン status で error/0件/キャッシュ無を分岐。`notes/page.tsx` 踏襲。 |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 既存（App Router / RSC） | 公開ルート `/notes` の RSC ページ | プロジェクト既存。`force-dynamic` で永続キャッシュ回避 [VERIFIED: codebase] |
| @supabase/supabase-js | 既存 | service_role 書き込み（`admin.ts`） | 既存規約。BYPASSRLS で upsert [VERIFIED: codebase `src/lib/supabase/admin.ts`] |
| @supabase/ssr | 既存 | anon SELECT（`server.ts`） | 公開 SELECT 読み取り用 [VERIFIED: codebase `src/lib/supabase/server.ts`] |
| vitest | 4.x（既存） | 純関数の単体テスト | `notes.test.ts` 同基盤 [VERIFIED: codebase] |

**新規パッケージは不要。** 既存依存のみで完結する。

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| plain `<img>` でアイコン | `next/image` | `next.config` に `images.remotePatterns`（`substack-post-media.s3.amazonaws.com` 等）追加が必須。PoC では最適化不要・設定負債を避け plain `<img>` を推奨。[VERIFIED: codebase — next.config に images 設定が存在しない] |
| JSONB 1行保存 | コメント行展開（1コメント1行） | 行展開は将来クエリ向きだが PoC では過剰。フラット表示なら JSONB 1行が単純で upsert もアトミック。 |

**Installation:** 新規インストールなし。

## Package Legitimacy Audit

新規外部パッケージのインストールは**なし**（既存依存のみ使用）。Package Legitimacy Gate は適用対象外。

## Architecture Patterns

### System Architecture Diagram

```
[ユーザー] --(URL/ID 入力)--> /notes ページ (RSC, public route)
                                   |
                                   v
                       parseNoteId(input) : string | null  [純関数]
                                   | null → COMMENT-01 入力エラー表示
                                   v (有効 id)
                       getNoteComments(id, {force}) [サーバ専用]
                                   |
                  +----------------+-----------------+
                  | DB SELECT note_comments(note_id) | (anon, server.ts)
                  v                                  
        鮮度判定: now - fetched_at < TTL かつ !force ?
          | YES(hit) → DBの JSONB をそのまま返却 ──────────┐
          | NO (miss/stale/force)                          |
          v                                                |
   fetch reader API  GET .../comment/{id}                  |
   fetch replies API GET .../comment/{id}/replies          |
          | (no-store, AbortSignal.timeout(5000),          |
          |  res.ok 不成立→throw→1秒待ち→1回リトライ)        |
          v                                                |
   parseComment(json) / parseReplies(json) [純関数・型ガード] |
          | throw せず {status:'ok'|'error'} 判別ユニオン     |
          v (ok)                                           |
   upsert note_comments (service_role, admin.ts)           |
          |                                                |
          v                                                v
   結果を返却 ────────────────────────────────────> 3状態描画(COMMENT-06)
                                          error / 0件 / キャッシュ無
```

### Recommended Project Structure
```
src/
├── lib/
│   ├── comments.ts              # parseNoteId / parseComment / parseReplies / fetch&retry / getNoteComments(キャッシュ統合)
│   └── __tests__/
│       ├── comments.test.ts     # 純関数の単体テスト（notes.test.ts 踏襲）
│       └── fixtures/
│           ├── comment_reader.json   # spike raw からコピー
│           └── comment_replies.json
├── app/
│   └── (main)/
│       └── notes/
│           └── page.tsx         # 公開 RSC ページ・3状態・JST・force 再取得
supabase/
└── schema.sql                   # note_comments テーブル追記
```

> **公開ルートは追加作業不要:** middleware の matcher は `/admin/:path*` と `/my` のみ。`/notes` は素通り＝ログイン不要。[VERIFIED: codebase `src/middleware.ts`]

### Pattern 1: parseNoteId（寛容パース・純関数）
**What:** 入力文字列から数値 note id（文字列）を抽出。失敗時は `null`。throw しない。
**When:** COMMENT-01 のフォーム入力検証。
**仕様（実装は正規表現1本でよい）:**
- 前後空白 trim。
- `https://substack.com/@uojun/note/c-276780760` → `276780760`（`c-` prefix 除去）
- `c-276780760` → `276780760`
- 裸の `276780760` → `276780760`
- 末尾クエリ/フラグメント（`?utm=...`, `#...`）は除去可能なら許容。
- 数字以外しか残らない/抽出不能 → `null`
```typescript
// 推奨: URL中の c-<digits> または 末尾 <digits> を拾う
export function parseNoteId(input: string): string | null {
  const s = (input ?? '').trim()
  // c-<digits> を最優先（URL/裸プレフィックス両対応）
  const m = s.match(/c-(\d+)/)
  if (m) return m[1]
  // 裸の数字のみ（前後空白除去済み）
  if (/^\d+$/.test(s)) return s
  return null
}
```
> 注意: フィクスチャの `entity_key` は `c-276780760`、`tracking_parameters.item_primary_entity_key` も `c-276780760`。`c-` は note(primary comment) の prefix。[VERIFIED: codebase fixtures]

### Pattern 2: 判別ユニオン返却（notes.ts 踏襲）
**What:** `getNoteComments` は throw せず status で返す。0件と error を厳密に区別（COMMENT-06）。
```typescript
export type CommentItem = {
  id: number
  body: string
  name: string
  photoUrl: string | null   // 取得不可は null（fallback トリガ）
  date: string              // ISO UTC（表示時に JST 整形）
}
export type CommentsResult =
  | { status: 'ok'; count: number; comments: CommentItem[]; fetchedAt: string; fromCache: boolean }
  | { status: 'invalid_input' }   // parseNoteId が null（COMMENT-01）
  | { status: 'error' }           // fetch 2回失敗 / API 異常（COMMENT-06 a）
// count===0 && comments=[] が「0件」状態（COMMENT-06 b）
```
> `count` は **reader の `comment.children_count`** を正とする（実測: reader=4, replies.commentBranches=4 で一致）。replies がページングで全件取れなくても件数表示は正確になる。[VERIFIED: codebase fixtures]

### Pattern 3: fetch + retry（notes.ts と 1:1）
- `cache: 'no-store'`、`signal: AbortSignal.timeout(5000)`。
- `res.ok` 不成立 → `throw new Error('HTTP ' + status)`。
- 1回目 catch → `await sleep(1000)` → 1回リトライ → なお失敗で `{status:'error'}`。
- reader と replies の **2エンドポイント**を呼ぶ。どちらか失敗で全体 error 扱い（PoC は単純化優先）。

### Pattern 4: 型ガード（parseReplies）
```typescript
function isReplyComment(c: unknown): c is { id: number; body: string; name: string; photo_url: unknown; date: string } {
  return !!c && typeof c === 'object'
    && typeof (c as any).id === 'number'
    && typeof (c as any).body === 'string'
    && typeof (c as any).name === 'string'
    && typeof (c as any).date === 'string'
}
// parseReplies(json): commentBranches[].comment を filter(isReplyComment).map(...)
// photo_url は string でなければ null に正規化（COMMENT-04 fallback）
// 不正/空/キー欠落 → [] を返す（throw しない）
```
> `handle` は undefined のことあり（critical_inputs 記載）→ 使わない。`name` は実測で常時存在だが型ガードで守る。`moreBranches:0`/`nextCursor:null` のフィクスチャ実測 → PoC はページング非対応で全件 1 リクエストとして扱ってよい（`commentBranches` のみ map）。[VERIFIED: codebase fixtures]

### Anti-Patterns to Avoid
- **ブラウザから直接 Substack API を叩く:** CORS・IP評価分散の悪化。必ずサーバ側 fetch。
- **`next/image` のために remotePatterns を追加:** PoC で最適化不要。設定負債回避のため plain `<img>`。
- **コメントを行展開で保存:** PoC のフラット表示には JSONB 1行で十分。upsert がアトミックで単純。
- **0件と error を同じ文言にする:** COMMENT-06 違反。notes.ts/page.tsx 同様 status で厳密分岐。
- **`<img onError>` で fallback:** SSR と相性悪い。取得段で `photoUrl` を null 正規化し、描画側は値で分岐。

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| upsert（同 note_id 再取得時の更新） | SELECT→分岐→INSERT/UPDATE | Supabase `.upsert(..., { onConflict: 'note_id' })` | レース・冗長コード回避。`note_id` UNIQUE 前提 |
| fetch タイムアウト | 手動 setTimeout + abort 配線 | `AbortSignal.timeout(5000)`（notes.ts 既存） | 標準 API。既存パターン踏襲 |
| 鮮度判定の日時演算 | 独自ライブラリ | `Date.now() - new Date(fetched_at).getTime() < TTL_MS` | 単純比較で足りる |

**Key insight:** notes.ts に完成形がある。comments.ts はその「2エンドポイント版 + キャッシュ前段」であり、新規発明は parseNoteId とテーブル設計のみ。

## note_comments テーブル設計（COMMENT-05）

**推奨スキーマ（schema.sql 追記文）:**
```sql
-- ============================================================
-- Phase 42: Note コメントキャッシュ
-- ============================================================
CREATE TABLE IF NOT EXISTS note_comments (
  note_id        TEXT        PRIMARY KEY,   -- 数値 id を文字列で（parseNoteId 出力）
  comment_count  INT         NOT NULL,      -- reader.comment.children_count（COMMENT-02 の正）
  comments       JSONB       NOT NULL,      -- CommentItem[] をそのまま（フラット・PoC）
  fetched_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE note_comments ENABLE ROW LEVEL SECURITY;

-- 公開 SELECT（/notes は公開ルート）
CREATE POLICY "public select note_comments"
  ON note_comments FOR SELECT USING (true);
-- 書き込みは service_role（BYPASSRLS）のみ。INSERT/UPDATE ポリシーは作らない（既存 articles 規約踏襲）
```
- **保存形式:** JSONB 1行（`comments` に `CommentItem[]`）。行展開は不採用（Alternatives 参照）。
- **TTL（鮮度）:** PoC・低頻度前提で **長め推奨。15〜60 分が妥当**（非公式 API のレート/IP評価リスク回避が目的のため、短くしすぎない）。`[ASSUMED]` — 具体値は operator 確認推奨。
- **force 再取得:** `getNoteComments(id, { force?: boolean })` の引数で制御。UI からは「再取得」ボタン（querystring `?force=1` 等）→ RSC 側で受けて `force:true`。
- **書き込み経路:** `createSupabaseAdminClient()`（service_role）で `upsert(onConflict: 'note_id')`。読みは `createSupabaseServerClient()`（anon SELECT）。
- **`fetched_at`:** upsert 時に `now()`（DB default）またはアプリ側で明示。鮮度判定は読み出した `fetched_at` を JS で比較。

**本番 SQL Editor 申し送り（schema.sql は正規ソース・本番は手動）:**
```
-- 本番 Supabase（prod=xolhjcngrwwwqtklmoyk）の SQL Editor に
-- 上記 CREATE TABLE note_comments ～ CREATE POLICY を貼り付けて Run。
-- 冪等（IF NOT EXISTS）。既存テーブルがあればスキップされる。
-- dev=otydhiumsdsyxepnjqjp にも同様に適用。
```

## キャッシュ読み書きフロー（サーバ専用・COMMENT-05）

```typescript
// 擬似コード（comments.ts）
export async function getNoteComments(rawInput: string, opts?: { force?: boolean }): Promise<CommentsResult> {
  const id = parseNoteId(rawInput)
  if (!id) return { status: 'invalid_input' }

  // 1. キャッシュ参照（anon SELECT）
  const cached = await selectNoteComments(id)  // server.ts
  if (cached && !opts?.force && isFresh(cached.fetched_at)) {
    return { status: 'ok', count: cached.comment_count, comments: cached.comments,
             fetchedAt: cached.fetched_at, fromCache: true }
  }

  // 2. miss / stale / force → 2エンドポイント fetch + retry
  try {
    const count = await fetchCommentCount(id)        // reader.comment.children_count
    const comments = await fetchCommentList(id)      // replies.commentBranches[].comment
    // 3. upsert（service_role）
    await upsertNoteComments(id, count, comments)    // admin.ts, onConflict:'note_id'
    return { status: 'ok', count, comments, fetchedAt: new Date().toISOString(), fromCache: false }
  } catch {
    // fetch 失敗時、stale キャッシュがあれば返す選択も可（PoC は error 明示でも可）
    return { status: 'error' }
  }
}
```
> 設計判断ポイント（planner/operator 向け）: fetch 失敗時に **stale キャッシュをフォールバック返却するか** は要決定。`[ASSUMED]` PoC は「error 明示」が COMMENT-06 に素直。stale フォールバックは UX 良いが「再取得失敗」表示と両立させる必要あり。

## アイコン fallback（COMMENT-04）

- `photo_url` が文字列でない/空 → `photoUrl: null` に正規化（parseReplies 段）。
- 描画: `photoUrl` があれば plain `<img src={photoUrl} alt="" className="w-8 h-8 rounded-full" loading="lazy" />`、無ければ `name` の先頭1文字を丸背景に描く**イニシャル**、または無地プレースホルダ。
- **外部ドメイン許可は不要**（plain `<img>` 採用のため）。`next/image` を使う場合のみ `next.config` の `images.remotePatterns` に `substack-post-media.s3.amazonaws.com`（および将来の他ホスト）追加が必要 — PoC では非推奨。
- セキュリティ: `name`/`body` はテキストノード描画（JSX `{}`）で XSS 安全。notes/page.tsx 同様。`<img src>` は URL を属性に入れるだけ（HTML 注入なし）。

## 状態表示（COMMENT-06・notes/page.tsx 踏襲）

3状態（+ 入力前）を文言で区別:
| status | 画面文言（例） |
|--------|----------------|
| `invalid_input` | 「Note の URL または ID の形式が正しくありません。」 |
| `error` | 「コメントの取得に失敗しました。時間をおいて再取得してください。」（再取得ボタン併設） |
| `ok` && count===0 | 「このノートにはまだコメントがありません。」 |
| キャッシュ無（未入力/初回） | 「Note の URL または ID を入力してください。」 |
| `ok` && count>0 | 件数バッジ + コメント一覧 + 「最終取得: {fetched_at JST}」+ 再取得ボタン |

- 本文: `whitespace-pre-wrap break-words`（notes/page.tsx 踏襲・改行保持・XSS 安全）。
- 日時: `new Date(date).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })`（JST 規約）。
- `export const dynamic = 'force-dynamic'`（fetch no-store と二重で永続キャッシュ回避）。

## Common Pitfalls

### Pitfall 1: 0件と error の混同
**What goes wrong:** 取得失敗とコメント0件を同じ表示にしてしまう。
**Why:** 判別ユニオンを使わず空配列だけで判断すると区別できない。
**How to avoid:** `status` を `ok`/`error`/`invalid_input` で厳密に。`ok` 内で `count===0` を別文言に。
**Warning signs:** parse 関数が失敗時に空配列を返し、上位がそれを「0件」と表示している。

### Pitfall 2: 件数を replies の配列長から数える
**What goes wrong:** ページングで `commentBranches` が全件でない場合、件数が過少表示。
**Why:** replies はページング対象（`moreBranches`/`nextCursor`）。
**How to avoid:** 件数は **reader の `comment.children_count`** を正とする。実測一致を確認済み。
**Warning signs:** 大量コメントの note で件数 < 実数。

### Pitfall 3: photo_url を無検証で `<img src>` に入れて壊れる
**What goes wrong:** `photo_url` が null/undefined のとき空 src で壊れた画像。
**Why:** API は null を返しうる。
**How to avoid:** parse 段で `photoUrl: string | null` に正規化し、描画側で値分岐（onError ではなく値で）。

### Pitfall 4: force 再取得がキャッシュを無視できていない
**What goes wrong:** force ボタンを押しても古いキャッシュが返る。
**Why:** 鮮度判定の前に force 分岐を入れ忘れる。
**How to avoid:** `!opts?.force && isFresh(...)` の順で評価。force=true なら必ず fetch へ。

### Pitfall 5: クライアントから service_role キーが漏れる
**What goes wrong:** upsert をクライアントコンポーネントで実行 → `SUPABASE_SERVICE_ROLE_KEY` がバンドルに混入。
**Why:** comments.ts をうっかり client import。
**How to avoid:** `getNoteComments`/upsert は RSC・server action 専用。`'use client'` から import しない。`admin.ts` は server 専用。

### Pitfall 6: 非公式 API の頻度過多
**What goes wrong:** 再取得を多用してレート制限/IP評価ブロック。
**Why:** キャッシュ TTL が短すぎる/force 連打。
**How to avoid:** TTL を長め（15〜60分目安）に。force はユーザー明示操作のみ。これが本フェーズの存在意義。

## Runtime State Inventory

新規テーブル追加であり、既存の rename/migration ではない。新規 PoC 機能のため runtime state の改名対象なし。

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — `note_comments` は新規テーブル（既存データなし） | DB マイグレーション（CREATE TABLE）のみ |
| Live service config | None — verified（middleware matcher 変更不要、`/notes` は素通り） | なし |
| OS-registered state | None | なし |
| Secrets/env vars | 既存 `SUPABASE_SERVICE_ROLE_KEY` / `NEXT_PUBLIC_SUPABASE_*` を再利用。新規 env なし | なし |
| Build artifacts | None | なし |

> 本番反映: dev/prod 双方の Supabase SQL Editor で `note_comments` を手動 CREATE（schema.sql が正規ソース）。

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.x [VERIFIED: codebase] |
| Config file | 既存（`notes.test.ts` が稼働中） |
| Quick run command | `npx vitest run src/lib/__tests__/comments.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMMENT-01 | parseNoteId が URL/c-prefix/裸ID/空白を寛容に解釈、不正は null | unit | `npx vitest run src/lib/__tests__/comments.test.ts -t parseNoteId` | ❌ Wave 0 |
| COMMENT-02 | parseComment が children_count を件数として返す | unit | 同上 `-t parseComment` | ❌ Wave 0 |
| COMMENT-03 | parseReplies が commentBranches から本文配列を返す/空・不正で[] | unit | 同上 `-t parseReplies` | ❌ Wave 0 |
| COMMENT-04 | parseReplies が photo_url 欠落時 photoUrl=null へ正規化 | unit | 同上 | ❌ Wave 0 |
| COMMENT-05 | isFresh 鮮度判定（TTL 境界）/ force 分岐 | unit | 同上 `-t isFresh` | ❌ Wave 0 |
| COMMENT-05 | getNoteComments のキャッシュ hit/miss/force（fetch+Supabase mock） | unit | 同上 `-t getNoteComments` | ❌ Wave 0 |
| COMMENT-06 | 判別ユニオン: error/0件/invalid_input が区別される | unit | 同上 | ❌ Wave 0 |
| COMMENT-02..06 | 公開 `/notes` ページの3状態描画 | manual-only | 開発サーバで目視（RSC・UI） | manual |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/__tests__/comments.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** 全 vitest green + `/notes` 手動 UAT（フィクスチャ id=276780760）

### Wave 0 Gaps
- [ ] `src/lib/__tests__/comments.test.ts` — COMMENT-01..06 純関数カバー（notes.test.ts 構造踏襲）
- [ ] `src/lib/__tests__/fixtures/comment_reader.json` — spike raw からコピー
- [ ] `src/lib/__tests__/fixtures/comment_replies.json` — spike raw からコピー
- [ ] Supabase クライアントは getNoteComments テストで mock（実 DB 不要）

> getNoteComments のキャッシュテストは Supabase クライアントと global fetch を vi.mock/vi.spyOn で差し替え、hit/miss/stale/force の4経路を検証。notes.test.ts の `vi.useFakeTimers()` + `vi.runAllTimersAsync()` パターンをリトライ検証に流用。

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | `parseNoteId` がホワイトリスト（`\d+`）で id を抽出。任意文字列を URL/SQL に渡さない |
| V6 Cryptography | no | 暗号処理なし |
| V2/V3/V4 認証/セッション/アクセス制御 | no | `/notes` は公開ルート（認証なし）。書き込みは service_role サーバ専用 |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| service_role キー漏洩 | Information Disclosure | upsert を RSC/server 専用に隔離。client から import しない（Pitfall 5） |
| XSS（コメント本文/名前） | Tampering | JSX テキストノード描画（`{value}`）。`dangerouslySetInnerHTML` 不使用 |
| SQLi（note_id） | Tampering | parseNoteId で `\d+` のみ許可 + Supabase クエリビルダ（パラメタ化） |
| SSRF（任意 URL fetch） | — | fetch URL は `substack.com/api/...` 固定テンプレート。id は数値のみ補間。ユーザー入力 URL を直接 fetch しない |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | キャッシュ TTL は 15〜60分が妥当 | note_comments テーブル設計 | 短すぎ→API 過多/ブロック、長すぎ→鮮度低下。operator 確認推奨 |
| A2 | fetch 失敗時は stale フォールバックせず error 明示が COMMENT-06 に素直 | キャッシュ読み書きフロー | UX とのトレードオフ。要設計決定 |
| A3 | コメントは JSONB 1行保存・フラット（行展開しない） | note_comments テーブル設計 | 将来クエリ要件が出たら行展開へ。PoC では低リスク |
| A4 | PoC はページング非対応（commentBranches のみ・moreBranches 無視） | Pattern 4 | コメント多数 note で本文一覧が部分表示。件数は children_count で正確 |

## Open Questions

1. **TTL の具体値**
   - 何が分かっている: 低頻度 PoC、非公式 API のブロックリスク回避が目的。
   - 不明: 具体的な分数。
   - 推奨: 30分をデフォルトにし定数化（`COMMENTS_TTL_MS`）。operator が後で調整可能に。

2. **fetch 失敗時の stale フォールバック有無**
   - 推奨: PoC は error 明示（A2）。将来 UX 改善で stale 返却を検討。

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase (dev/prod) | キャッシュ永続化 | ✓ | 既存運用 | — |
| Substack 非公式 API | コメント取得 | ✓（spike 実測 200 / Vercel iad1 OK） | 非公式 | キャッシュ stale 返却（要決定 A2） |
| vitest | 単体テスト | ✓ | 4.x | — |

**Missing dependencies with no fallback:** なし。
**Missing dependencies with fallback:** 非公式 API は予告なく変更/ブロックされうる → Supabase キャッシュが緩衝材。

## Sources

### Primary (HIGH confidence)
- codebase `src/lib/notes.ts` / `src/lib/__tests__/notes.test.ts` — fetch&retry / 判別ユニオン / 型ガード / vitest パターン
- codebase `src/app/(main)/admin/notes/page.tsx` — RSC 3状態 / JST / force-dynamic / pre-wrap
- codebase `supabase/schema.sql` — CREATE TABLE IF NOT EXISTS / RLS / public select / service_role 規約
- codebase `src/lib/supabase/{server,admin}.ts` — anon / service_role クライアント
- codebase `src/middleware.ts` — matcher が `/admin`・`/my` のみ（`/notes` 公開を確認）
- codebase `next.config.*` — images.remotePatterns 未設定（plain `<img>` 推奨根拠）
- spike fixtures `.planning/spikes/002-substack-note-comments/raw/*.json` — reader.children_count=4 == replies.commentBranches.length=4、moreBranches=0/nextCursor=null 実測

### Secondary (MEDIUM confidence)
- critical_inputs_already_resolved（Phase 40 GO 判定）— エンドポイント仕様・到達性

### Tertiary (LOW confidence)
- なし

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 新規依存なし、全て既存検証済み
- Architecture: HIGH — notes.ts/page.tsx を 1:1 踏襲、spike 実測でデータ構造確定
- Pitfalls: HIGH — 既存 Phase 41 pitfalls + spike 知見ベース
- TTL/フォールバック方針: MEDIUM（ASSUMED・operator 確認推奨）

**Research date:** 2026-06-18
**Valid until:** 非公式 API 仕様変更まで（コードパターンは安定／API は予告なく変更されうる）
