# Phase 41: 機能2 Note一覧（永続化なし） - Research

**Researched:** 2026-06-18
**Domain:** Next.js 16 App Router (RSC) + Substack 非公式 reader feed API（サーバー側 fetch）
**Confidence:** HIGH（一次ソース `profile_feed.json` の実データで両 Open Question を確定）

## Summary

Phase 41 は admin 本人が投稿した Substack Note を `/admin/notes` に読み取り専用で都度 fetch 表示する最小 PoC。Phase 40 スパイクで採用エンドポイント `GET /api/v1/reader/feed/profile/{user_id}?types=note` が無認証・Vercel 到達可と確定済み。本 research は CONTEXT.md の2つの Open Question を、スパイク取得済みの実レスポンス `001-substack-notes-list/raw/profile_feed.json`（11 items の実データ）に基づいて確定した。

**確定事項（実データ根拠あり）:**
1. **body はプレーンテキスト string で、改行 `\n` を内包している。** HTML タグも URL も含まれない。`body_json`（ProseMirror doc）も併存するが、`body` string は body_json の各 paragraph を `\n` で連結したテキストそのもの。よって **body string をそのまま表示 + CSS `white-space: pre-wrap` で改行保持** が最単純かつ忠実な答え（D-02/D-03 確定）。body_json をレンダリングする必要はない。
2. **`?types=note` を付けても context.type に `note` / `comment_restack` / `post_restack` が混在する。** admin が投稿した Note だけを出すには **クライアント側で `item.context.type === "note"` フィルタが必須**（D-04 確定）。restack は他人の投稿/コメントの再共有なので除外する。

**Primary recommendation:** `src/lib/notes.ts` に `fetchAdminNotes(): Promise<NoteListResult>` を新設。`fetch(url, { cache: 'no-store' })` で都度取得 →`items` を `context.type === "note"` でフィルタ → 最小型に正規化して返す。`fetchFeed.ts` の「1秒1回リトライ→失敗時フォールバック」を踏襲しつつ、NOTE-03 のため「エラー」と「0件」を `{ status: 'ok'|'error', notes: [] }` の判別可能ユニオンで区別する。`/admin/notes/page.tsx` は RSC で `fetchAdminNotes()` を呼び status 分岐表示。

---

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** admin の Substack user_id（`110584954` / @uojun）は **env var** で供給（例 `SUBSTACK_ADMIN_USER_ID`）。DB カラム追加や handle→public_profile 導出はオーバースペック。env 命名・存在チェックは researcher/planner 裁量。
- **D-02:** Note 本文（body）は **全文そのまま表示**（truncate なし、文字数/行数切り詰めなし）。
- **D-03:** body のレンダリング方式は body のデータ形式に依存 → research で確定（本ファイルで確定）。「全文・最単純」を「実物忠実さ」方針より上位に置く。過度なリッチ再現は不要。
- **D-04:** 一覧に出すのは **本文プレビュー + 投稿日時（JST）のみ**。`children_count`（コメント数）/ `reaction_count`（リアクション数）は **表示しない**。
- **D-05:** **最新ページのみ**表示。`nextCursor` ページングは行わない（feed 先頭1レスポンス分）。
- **D-06:** 各 Note から実 Substack Note への **外部リンクは付けない**。表示のみ。
- **D-07:** 「**取得失敗（エラー）**」と「**0件（まだ Note なし）**」を **別文言で明示**（NOTE-03）。具体文言は planner 裁量だが2状態を必ず区別。

### Claude's Discretion
- env var 名・読み取り/未設定時の扱い
- 失敗/0件の具体的文言・UI（カード/リスト等のレイアウト）
- リトライ有無（既存 `fetchFeed.ts` の「1秒後1回リトライ→空フォールバック」踏襲可）
- 投稿日時の JST フォーマット（既存 `calendarUtils.ts` 等の規約に合わせる）

### Deferred Ideas (OUT OF SCOPE)
- コメント数 / リアクション数の表示
- `nextCursor` ページング・無限スクロール
- 実 Substack Note への外部リンク導線
- 複数 admin / DB 永続化（Phase 42 以降）
- body のリッチテキスト完全再現（画像・埋め込み等の忠実表示）

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NOTE-01 | admin が投稿した Note 一覧を取得・表示。毎回サーバー側 fetch・永続化なし | エンドポイント・無認証・到達性は Phase 40 で確定。fetch に `cache: 'no-store'` で永続化なしを保証（後述 Pitfall 4）。判別ロジック確定（Open Q2） |
| NOTE-02 | 本文プレビュー + 投稿日時（JST） | body=plain text string（`comment.body`）、日時=`comment.date`（ISO UTC, Z 付き）→ JST 整形。フィールドパス確定（後述） |
| NOTE-03 | 取得失敗・0件状態の明示 | 判別可能ユニオン `{ status: 'ok' \| 'error' }` で 2 状態を区別（後述 設計） |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Substack feed 取得 | API/Backend（RSC サーバー側 fetch） | — | CORS 回避・cookie 露出回避のためクライアント直叩き禁止（スパイク前提）。RSC のサーバー実行で取得する |
| Note 判別・正規化 | API/Backend（`lib/notes.ts`） | — | レスポンス整形・フィルタはデータ層に閉じる。Phase 42 再利用前提で安定 API 化 |
| admin ガード | Frontend Server（middleware edge） | — | `/admin/:path*` matcher で既にガード済み。page 側で再ガード不要 |
| JST 整形・表示 | Frontend Server（RSC レンダリング） | — | 既存 admin ページ同様 RSC でサーバーレンダリング |

---

## Open Question 1（確定）: body のデータ形式とレンダリング方式

### 実データ検証結果（`profile_feed.json`, context.type==="note" の 8 件）

| 検証項目 | 結果（実データ） |
|----------|------------------|
| `comment.body` の型 | **`string`**（全 note item で `type == "string"`） |
| `comment.body_json` の型 | `object`（ProseMirror `{ type: "doc", attrs, content: [...] }`、全件存在） |
| body に HTML タグ含むか | **含まない**（`grep '<[a-zA-Z/]'` → 0 件） |
| body に URL（http）含むか | **含まない**（`grep 'http'` → 0 件。本サンプル範囲では URL なし） |
| body に改行 `\n` 含むか | **含む**（8 件中 2 件が `\n` を含む。複数段落の Note は `\n` で段落区切り） |
| body_json content[].type の分布 | **全 19 ノードが `paragraph`**（heading/image/list 等なし） |

### 確定: body string をそのまま表示する（body_json は使わない）

実データで `comment.body` は **body_json の各 paragraph を `\n` で連結したプレーンテキスト**であることを確認した（例: id=278196925 は body に `\n` を含み body_json は paragraph 2 個、id=278191771 は body に `\n` 複数 + body_json paragraph 11 個）。

したがって **D-02「全文そのまま表示・最単純」の答えは body string の直接描画**:

- **レンダリング:** `comment.body`（string）をテキストノードとして描画。**HTML として解釈しない**（`dangerouslySetInnerHTML` は使わない＝XSS リスクなし・プレーンテキストなので不要）。
- **改行保持:** CSS `white-space: pre-wrap`（または Tailwind `whitespace-pre-wrap`）を本文要素に適用。`\n` がそのまま改行表示され、長文は折り返す。**これだけで D-02 を忠実に達成できる。**
- **body_json は無視:** ProseMirror パーサーや専用ライブラリは**不要**（Don't Hand-Roll: paragraph しかないので body string で十分）。

### リンク・画像・attachments の扱い（D-06 / deferred と整合）

- **本サンプル範囲では body に URL なし**。よってリンク自動検出は不要（D-06「外部リンク付けない」とも整合 — リンク化しない）。
- **画像・埋め込みは `comment.attachments` に分離されている**（body には入らない）。実データの attachments type 分布: `post`（5件、引用記事）/ `image`（1件）/ `comment`（1件、restack 元）。**D-02 の「リッチ再現は deferred」「最小情報」に従い attachments は描画しない**（取得しても無視）。これで body の純テキストのみが出る。

> 注意（ASSUMED）: 将来 admin が body 中に URL を書いた Note を投稿した場合も、本実装はそれを**ただのテキストとして表示**する（自動リンク化しない）。D-06「リンクなし」と一致するため問題なし。`[ASSUMED]` ですが方針上はむしろ正しい挙動。

---

## Open Question 2（確定）: Note 一覧フィードのレスポンス構造と Note 判別

### レスポンス構造（実データ）

トップレベルキー: `items` / `nextCursor` / `originalCursorTimestamp`

```
{
  "items": [ { item }, ... ],   // 本サンプルは 11 件
  "nextCursor": "eyJ...",        // base64 cursor（D-05 で未使用）
  "originalCursorTimestamp": ...
}
```

各 `item` のキー: `type` / `context` / `comment` / `post` / `publication` / `parentComments` / `entity_key` / `canReply` ほか

### 判別: `item.context.type === "note"` でフィルタ必須

`?types=note` を付けても **context.type は混在**する（実データ 11 件の内訳）:

| context.type | 件数 | item.type | comment 著者 | 意味 | 一覧に出す? |
|--------------|------|-----------|--------------|------|-------------|
| `note` | **8** | comment | **user_id=110584954 / @uojun（admin本人）** | admin が投稿した Note | **出す** |
| `comment_restack` | 2 | comment | 503105733 / @renkadesu, 498690399 / @noteais（他人） | 他人のコメントを再スタック | 除外 |
| `post_restack` | 1 | post（comment=null） | — | 他人の記事を再スタック | 除外 |

**判別ロジック（確定）:**
```
items.filter(item => item.context?.type === "note")
```
これだけで restack（他人由来）を除外でき、残った 8 件は全て comment.user_id=110584954（admin本人）だった。

- **`context.type === "note"` で十分。** 追加で `comment.user_id === ADMIN_USER_ID` を AND する保険は任意（堅牢化したいなら推奨。実データでは note 8 件すべて admin 本人なので必須ではない）。
- **`post_restack` は `comment` が null** なので、フィルタ後は必ず `comment` が存在することが保証される（型安全）。
- **planner への注記:** `?types=note` がサーバー側で restack を除外しないことが実証された。クエリは付けてよい（無害）が、**判別の責任はクライアント側フィルタに置く**こと。

### NOTE-02 必須フィールドの正確なパス（実データ確認済み）

すべて `item.comment.*` 配下（item.type=="note" は item.type=="comment" / context.type=="note"）:

| 用途 | パス | 型 / 例 |
|------|------|---------|
| 一意キー | `item.comment.id` | number（例 `278223920`） |
| 本文（NOTE-02） | `item.comment.body` | string（plain text, `\n` 含む） |
| 投稿日時（NOTE-02） | `item.comment.date` | string ISO UTC, Z 付き（例 `"2026-06-17T23:59:35.748Z"`）→ JST 整形 |
| admin 判別（任意保険） | `item.comment.user_id` | number（`110584954`） |
| （取得するが**非表示** D-04） | `item.comment.children_count` / `item.comment.reaction_count` | number。型に含めてもよいが描画しない |

`children_count`/`reaction_count` は D-04 で**非表示**。型に含めるかは任意だが、含めないほうが「表示しない」意図が明確（推奨: 最小型に入れない）。

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js (App Router) | 16.2.6（package.json 実測） | RSC でサーバー側 fetch + レンダリング | プロジェクト既定。既存 admin ページが全て App Router RSC [VERIFIED: codebase grep] |
| グローバル `fetch` | Node 組込（追加依存なし） | Substack reader feed の JSON 取得 | JSON API なので RSS パーサ不要。`fetchFeed.ts` は RSS 用だが notes は JSON のため `rss-parser` は不要 [VERIFIED: profile_feed.json は JSON] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| 既存 `calendarUtils.ts` の JST 規約 | — | 日付 JST 整形の前例 | 日付のみの整形（`isoToJSTDateKey`）。ただし Note は**時刻も出す**ため下記推奨 |
| `Date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })` | 組込 Intl | 投稿日時（日付+時刻）の JST 整形 | **既存 `AdminMemberList.tsx:132` が同パターンを使用**。一貫性のためこれを踏襲 [VERIFIED: codebase grep] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| body string 直描画 | body_json を ProseMirror レンダラで描画 | 過剰。paragraph しかなく body string が既に `\n` 連結済み → 依存追加の価値なし。D-02「最単純」に反する |
| `rss-parser` 流用 | — | notes feed は JSON。RSS パーサは不適。`fetchFeed.ts` はパターン参考のみで関数は流用しない |
| `toLocaleString` | `calendarUtils.isoToJSTDateKey` | 後者は**日付のみ**（時刻が出ない）。Note は時刻まで出したいので toLocaleString 推奨。日付のみで足りるなら既存流用も可（planner 裁量 D-04 範囲内） |

**Installation:** 追加パッケージなし（Node 組込 fetch + Intl のみ）。

> **Package Legitimacy Audit:** 本フェーズは外部パッケージを新規 install しない（Next.js / Node 組込のみ使用）。よって legitimacy gate は **N/A**。slopcheck 実行不要。

---

## Architecture Patterns

### System Architecture Diagram

```
[ admin がブラウザで /admin/notes へ ]
            │
            ▼
[ middleware (edge) ]  ── isAdmin(user)? ── No ──▶ redirect /  (page 側ガード不要)
            │ Yes
            ▼
[ /admin/notes/page.tsx  (RSC, サーバー実行) ]
            │  await fetchAdminNotes()
            ▼
[ src/lib/notes.ts : fetchAdminNotes() ]
   │  1. env から SUBSTACK_ADMIN_USER_ID 読む（未設定→ status:'error'）
   │  2. fetch(reader feed URL, { cache:'no-store' })   ← 永続化なし
   │     └─ 失敗 → 1秒待ち1回リトライ → なお失敗 → status:'error'
   │  3. res.json() → items を context.type==="note" でフィルタ
   │  4. 最小型 NoteItem[] に正規化（id/body/date のみ）
   ▼
[ NoteListResult: { status:'ok', notes } | { status:'error' } ]
            │
            ▼
[ page.tsx 分岐レンダリング ]
   ├─ status==='error'      → 「取得に失敗しました」文言       (NOTE-03)
   ├─ status==='ok' & 0件   → 「まだ Note がありません」文言    (NOTE-03)
   └─ status==='ok' & >0件  → Note カード/リスト（body pre-wrap + JST 日時）  (NOTE-01/02)
```

### Recommended Project Structure
```
src/
├── lib/
│   └── notes.ts                       # 新規: 取得層（Phase 42 でも再利用 → 安定 API）
└── app/(main)/admin/
    └── notes/
        └── page.tsx                   # 新規: RSC。fetchAdminNotes() 呼び status 分岐
        # (任意) NoteList.tsx を切り出してもよいが PoC は page 内で十分
```

### Pattern 1: 判別可能ユニオンで「エラー」と「0件」を型レベルで分離（NOTE-03 / D-07）

**What:** 取得結果を `{ status: 'ok', notes } | { status: 'error' }` で返す。0件は `status:'ok'` かつ `notes.length===0` で表現。
**When to use:** NOTE-03 の「取得失敗」と「0件」を別文言で確実に区別するため。空配列フォールバックだけだと両者が区別不能になる（`fetchWithRetry` が空配列を返すパターンの弱点）。

```typescript
// Source: 本 research（fetchFeed.ts のリトライ思想を NOTE-03 向けに拡張）
// src/lib/notes.ts

export type NoteItem = {
  id: number
  body: string        // plain text, \n 含む（pre-wrap で描画）
  date: string        // ISO UTC（描画側で JST 整形）
}

export type NoteListResult =
  | { status: 'ok'; notes: NoteItem[] }   // notes.length===0 が「0件」
  | { status: 'error' }                   // 取得失敗 / env 未設定

const RETRY_DELAY_MS = 1000

function feedUrl(userId: string): string {
  return `https://substack.com/api/v1/reader/feed/profile/${userId}?types=note`
}

async function fetchOnce(userId: string): Promise<NoteItem[]> {
  const res = await fetch(feedUrl(userId), {
    cache: 'no-store',                 // 永続化/キャッシュなし（NOTE-01）
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(5000), // fetchFeed.ts と同じ 5s タイムアウト規約
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json() as { items?: unknown[] }
  const items = Array.isArray(data.items) ? data.items : []
  return items
    .filter((it): it is { context: { type: string }; comment: { id: number; body: string; date: string } } => {
      const i = it as { context?: { type?: string }; comment?: { id?: unknown; body?: unknown; date?: unknown } }
      return i?.context?.type === 'note'
        && typeof i.comment?.id === 'number'
        && typeof i.comment?.body === 'string'
        && typeof i.comment?.date === 'string'
    })
    .map((it) => ({ id: it.comment.id, body: it.comment.body, date: it.comment.date }))
}

export async function fetchAdminNotes(): Promise<NoteListResult> {
  const userId = process.env.SUBSTACK_ADMIN_USER_ID
  if (!userId) {
    console.error('[fetchAdminNotes] SUBSTACK_ADMIN_USER_ID is not set')
    return { status: 'error' }            // env 未設定は「取得失敗」として扱う（後述）
  }
  try {
    return { status: 'ok', notes: await fetchOnce(userId) }
  } catch (err) {
    console.warn('[fetchAdminNotes] 1st attempt failed:', err)
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
    try {
      return { status: 'ok', notes: await fetchOnce(userId) }
    } catch (err2) {
      console.warn('[fetchAdminNotes] 2nd attempt failed:', err2)
      return { status: 'error' }          // 空配列フォールバックではなく error（0件と区別）
    }
  }
}
```

### Pattern 2: RSC ページの status 分岐（D-07）

```typescript
// Source: 本 research（admin/page.tsx の RSC 構成を踏襲）
// src/app/(main)/admin/notes/page.tsx

import { fetchAdminNotes } from '@/lib/notes'

// 永続化なしを保証（route 全体を都度実行に固定。fetch の no-store と二重で安全）
export const dynamic = 'force-dynamic'

export default async function AdminNotesPage() {
  const result = await fetchAdminNotes()

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Note 一覧</h1>

      {result.status === 'error' ? (
        <p className="text-red-600">Note の取得に失敗しました。時間をおいて再読み込みしてください。</p>
      ) : result.notes.length === 0 ? (
        <p className="text-gray-600">まだ Note がありません。</p>
      ) : (
        <ul className="space-y-4">
          {result.notes.map((n) => (
            <li key={n.id} className="border rounded p-4">
              <p className="whitespace-pre-wrap break-words">{n.body}</p>
              <time className="block mt-2 text-xs text-gray-500">
                {new Date(n.date).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
              </time>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
```

> 文言・レイアウトは D-07 / Claude's Discretion により planner 自由。上記は2状態区別の最小例。

### Anti-Patterns to Avoid
- **空配列フォールバックで「失敗」を握り潰す:** `fetchWithRetry` 流に失敗時 `[]` を返すと「0件」と区別不能 → NOTE-03 違反。必ず `status:'error'` を返す。
- **body を `dangerouslySetInnerHTML` で描画:** body は HTML ではなくプレーンテキスト。HTML 描画は無意味かつ将来の XSS リスク。テキストノード + `whitespace-pre-wrap` を使う。
- **クライアントコンポーネントから直接 Substack を fetch:** CORS / cookie 露出。必ず RSC（サーバー側）で取得。
- **`?types=note` だけを信じて context.type フィルタを省く:** restack が混入する（実証済み）。

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 改行保持の整形 | `body.split('\n').map(...<br>)` の手組み | CSS `whitespace-pre-wrap` | body に既に `\n` がある。CSS 一発で十分・XSS 安全 |
| body_json の描画 | ProseMirror レンダラ自作/依存追加 | body string をそのまま描画 | paragraph しかなく body が `\n` 連結済み |
| JST 整形 | UTC+9 手計算 | `toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})`（既存 AdminMemberList 規約） | DST なし・既存前例あり・サマータイム等の罠回避 |
| admin ガード | page 内で再ガード | middleware（既に `/admin/:path*`） | 二重実装不要 |

**Key insight:** body が「`\n` 入りプレーンテキスト string」という実データ事実により、本フェーズはレンダリング系の依存をゼロにできる。最も単純な実装が最も忠実でもある（D-02 と完全一致）。

---

## Common Pitfalls

### Pitfall 1: 「取得失敗」と「0件」の取り違え（NOTE-03 違反）
**What goes wrong:** 失敗時に空配列を返すと、ユーザーには「Note がない」と誤表示される。
**Why it happens:** `fetchFeed.ts` の `fetchWithRetry` が失敗時 `{ items: [] }` を返す設計のため、それをそのまま流用すると区別が消える。
**How to avoid:** 判別可能ユニオン `{ status:'ok'|'error' }` を返す（Pattern 1）。`fetchFeedOrThrow` 系の「失敗は throw」思想を採り、page 側で error/0件を分岐。
**Warning signs:** `notes.length===0` だけで文言を決めている。

### Pitfall 2: restack の混入（他人のコンテンツが admin の一覧に出る）
**What goes wrong:** `?types=note` を信頼すると renkadesu/noteais 等、他人由来の restack が一覧に出る。
**Why it happens:** サーバーが restack を除外しない（実証済み）。
**How to avoid:** `item.context.type === "note"` フィルタ（任意で `comment.user_id===ADMIN_USER_ID` も AND）。
**Warning signs:** 一覧に admin 以外の handle/名前が出る。

### Pitfall 3: env 未設定時の挙動
**What goes wrong:** `SUBSTACK_ADMIN_USER_ID` 未設定で URL が `.../profile/undefined?types=note` になり 4xx → 不親切なエラー。
**Why it happens:** env 存在チェック漏れ。
**How to avoid（推奨）:** `fetchAdminNotes` 冒頭で未設定なら `status:'error'` を返し、page で「取得に失敗」表示（Pattern 1）。ビルド時 throw（build を落とす）は PoC では過剰 — ランタイム error 表示で十分（D-01 の「未設定時の扱いは researcher 裁量」に基づく推奨）。
**Warning signs:** 本番で env 設定漏れ時に画面が 500 で落ちる。

### Pitfall 4: Next.js のキャッシュで「永続化なし」が破れる（NOTE-01 違反）
**What goes wrong:** RSC fetch がキャッシュされ、admin が新 Note を投稿しても古い一覧が出る。
**Why it happens:** Next.js のデータキャッシュ/フルルートキャッシュ。
**How to avoid:** 二重で固定する — (a) `fetch(url, { cache: 'no-store' })`、(b) page で `export const dynamic = 'force-dynamic'`。Next.js 16.2.6 では fetch デフォルトが uncached 寄りだが、**明示指定で意図を固定**（バージョン挙動差に左右されない）。
**Warning signs:** ビルド時に `/admin/notes` が Static（○）と表示される → Dynamic（ƒ）であるべき。

### Pitfall 5: 非公式 API の仕様変更・レート制限（スパイク申し送り）
**What goes wrong:** 予告なきレスポンス形変更・IP 評価でのブロック（429/403）。
**Why it happens:** 非公式エンドポイント。
**How to avoid:** (a) 最小型抽出 + 厳格な型ガードで未知フィールド増減に耐える、(b) 失敗は `status:'error'` で安全表示、(c) 低頻度維持（本フェーズは admin 単発閲覧なので低リスク）。
**Warning signs:** 200 だが items 構造が変わる / 403・429。

### Pitfall 6: date の TZ 取り違え
**What goes wrong:** `comment.date` は UTC（Z 付き）。生表示すると 9 時間ずれる。
**How to avoid:** 必ず `timeZone:'Asia/Tokyo'`（または +9h）で整形。`new Date(isoZ)` は正しく UTC パースするので toLocaleString に渡せば OK。

---

## Runtime State Inventory

> 本フェーズは新規追加（greenfield: 新ルート + 新取得層）でリネーム/マイグレーションではない。ただし env var を導入するため、設定面のみ記録する。

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — 永続化なし・DB 不使用（NOTE-01）。検証: notes.ts は fetch のみで Supabase 未使用 | なし |
| Live service config | None — 外部サービス設定変更なし（読み取り専用 fetch） | なし |
| OS-registered state | None | なし |
| Secrets/env vars | **新規 env `SUBSTACK_ADMIN_USER_ID`（値=`110584954`）。** cookie 不要（スパイク確認済み）= secret ではない公開値だが env で管理 | ローカル `.env.local` と Vercel 環境変数に追加（dev/prod 両方）。値は public user_id なので機微度は低い |
| Build artifacts | None — 新規ファイルのみ、ビルド成果物の旧名残存なし | なし |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Next.js `fetch` がデフォルトでキャッシュ（force-cache） | Next.js 15+ は fetch デフォルト uncached 寄り | Next.js 15 | それでも `cache:'no-store'` を明示推奨（意図固定・将来差吸収）[CITED: Next.js caching docs] |

**Deprecated/outdated:** 特になし（本フェーズは組込機能のみ）。

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | body 中に URL が現れた場合もテキスト表示（自動リンク化しない）でよい | Open Q1 リンク扱い | 低。D-06「リンクなし」と整合するためむしろ正しい |
| A2 | env 未設定は build throw ではなくランタイム `status:'error'` 表示が適切 | Pitfall 3 | 低。D-01 で researcher 裁量。PoC として妥当 |
| A3 | 投稿日時は「日付+時刻」まで出す（toLocaleString）。日付のみで足りる可能性 | Standard Stack | 低。NOTE-02 は「投稿日時」=時刻含意。日付のみ希望なら planner が isoToJSTDateKey に変更可 |
| A4 | 本サンプル（11 items, note 8件）が body 形式・判別ロジックを代表する | Open Q1/Q2 全般 | 中。1 スナップショットのみ。型ガード + status:error フォールバックで形変化に耐える設計で緩和済み |

**注:** A1〜A4 は実データに基づく合理的推定。いずれも「型ガード + error フォールバック」設計により外れても安全側に倒れる。

---

## Open Questions

1. **投稿日時の粒度（日付のみ vs 日付+時刻）**
   - What we know: `comment.date` は ms 精度の ISO UTC。NOTE-02 は「投稿日時」。既存 `AdminMemberList` は日時、`calendarUtils` は日付のみ。
   - What's unclear: 一覧で時刻まで要るか。
   - Recommendation: 時刻まで出す（`toLocaleString`）。冗長なら planner が日付のみへ調整可。

2. **複数ページにまたがる新しい Note（D-05 で 1 ページのみ）**
   - What we know: feed 先頭 1 レスポンスは最新 11 items（うち note 8）。投稿頻度が高い日は最新 Note が 2 ページ目に押し出される可能性。
   - What's unclear: admin の投稿頻度で 1 ページに最新 Note が収まるか。
   - Recommendation: D-05 通り 1 ページで進める。実運用で漏れが出たらページング（deferred）を別フェーズで。

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Next.js / Node runtime | RSC・fetch・Intl | ✓ | Next 16.2.6 | — |
| Substack reader feed API | Note 取得 | ✓（スパイク 200 実測, Vercel iad1 含む） | 非公式 | `status:'error'` 表示（NOTE-03） |
| `SUBSTACK_ADMIN_USER_ID` env | user_id 供給（D-01） | ✗（**未設定 — 新規追加要**） | — | 未設定時 `status:'error'`（Pitfall 3） |

**Missing dependencies with no fallback:** なし（env はフェーズ内で追加するタスクとして計画）。
**Missing dependencies with fallback:** env 未設定はランタイムで error 表示にフォールバック。

---

## Validation Architecture

> `.planning/config.json` を未確認だが nyquist_validation が false でなければ本節を含む。既存 `src/lib/__tests__/` に Vitest 系テストが存在（`share.test.ts` 等）。

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest（既存 `src/lib/__tests__/*.test.ts` から推定）[ASSUMED — package.json の test script で要確認] |
| Config file | 要確認（`vitest.config.*` / `vite.config.*`） — Wave 0 で確認 |
| Quick run command | `npx vitest run src/lib/__tests__/notes.test.ts`（新規） |
| Full suite command | `npm test`（package.json の test script に従う） |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NOTE-01/04 | items を context.type==="note" でフィルタし最小型へ正規化 | unit | `npx vitest run src/lib/__tests__/notes.test.ts` | ❌ Wave 0 |
| NOTE-03 | 取得失敗時に `status:'error'`、0件時に `status:'ok',notes:[]` | unit | 同上（fetch を mock し HTTP エラー/空 items を注入） | ❌ Wave 0 |
| NOTE-02 | body の `\n` 保持表示・date の JST 整形 | unit/component | date 整形は純関数化すればテスト容易 | ❌ Wave 0 |

> **テスト容易化の推奨:** `fetchAdminNotes` から「正規化・フィルタ部」を純関数 `parseNoteFeed(json): NoteItem[]` として切り出すと、`profile_feed.json` をフィクスチャに使った unit テストが書きやすい（fetch mock 不要で判別ロジックを検証可能）。スパイクの実 JSON をそのままテストフィクスチャに流用できる。

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/__tests__/notes.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** フルスイート green 後に `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/notes.test.ts` — NOTE-01/02/03 をカバー（`profile_feed.json` をフィクスチャ流用推奨）
- [ ] Vitest config / test script の存在確認（なければ整備）

---

## Security Domain

> 読み取り専用・外部 JSON を表示するフェーズ。該当カテゴリのみ記載。

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no（既存 Supabase auth に依存、本フェーズで変更なし） | — |
| V4 Access Control | yes | `/admin/:path*` middleware admin ガード（既存 `isAdmin`）。page 側再ガード不要 |
| V5 Input Validation | yes | 外部 API レスポンスを**信頼しない**。型ガードで `comment.id/body/date` を検証してから描画（Pattern 1） |
| V6 Cryptography | no | 機微データ・暗号処理なし。user_id は公開値 |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 外部 API 由来の悪性 body（XSS） | Tampering | body をテキストノードで描画（`dangerouslySetInnerHTML` 不使用）。React のデフォルトエスケープで安全 |
| 非公式 API の形変更/汚染データ | Tampering | 厳格な型ガード + `status:'error'` フォールバック |
| 非 admin の `/admin/notes` 閲覧 | Info Disclosure | middleware ガード（既存）。ただし表示内容は公開 Note なので情報露出リスク自体は低 |

---

## Sources

### Primary (HIGH confidence)
- `.planning/spikes/001-substack-notes-list/raw/profile_feed.json` — Note 一覧フィードの実レスポンス（11 items）。body 型 / context.type 分布 / フィールドパス / date 形式を jq で実検証
- `.planning/spikes/001-substack-notes-list/raw/profile.json` — user_id=110584954 / handle=uojun の導出元
- `.planning/spikes/MANIFEST.md` — 採用エンドポイント・無認証・Vercel 到達性の go 判定
- `src/lib/fetchFeed.ts` / `src/middleware.ts` / `src/lib/authz.ts` / `src/app/(main)/admin/page.tsx` / `src/app/(main)/admin/AdminMemberList.tsx`（codebase grep/read）— 既存リトライ/ガード/JST 整形パターン
- `src/lib/calendarUtils.ts` — 既存 JST 整形規約

### Secondary (MEDIUM confidence)
- Next.js 16 のキャッシュ挙動（`cache:'no-store'` / `dynamic='force-dynamic'`）— 一般に確立された規約 [CITED: Next.js caching docs]

### Tertiary (LOW confidence)
- なし

---

## Metadata

**Confidence breakdown:**
- Open Q1（body 形式・レンダリング）: HIGH — 実データ（型・改行・HTMLタグ無）で確定
- Open Q2（レスポンス構造・判別）: HIGH — 11 items の context.type 分布と著者 user_id を実検証
- Standard stack: HIGH — 追加依存なし・既存パターン流用、package.json で version 確認
- 取得層/エラー設計: HIGH — fetchFeed.ts のリトライ思想 + NOTE-03 向け判別ユニオン
- 落とし穴: HIGH — 実データ + スパイク申し送り由来

**Research date:** 2026-06-18
**Valid until:** 非公式 API のため約 7 日（仕様変更リスク）。コード設計部分は約 30 日有効。
