# Phase 6: 管理画面 + チームフィルター - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Basic認証（middleware.ts + `ADMIN_PASSWORD` ENV）で保護された `/admin` ページを実装する。
管理画面ではKVのメンバー一覧を表示し、メンバーの追加（name + substackId + teamId）と削除（window.confirm確認付き）ができる。
Server Actions + `revalidatePath('/admin')` でKVを更新後に画面を即時反映する。
トップページ（`/`）にはチームタブUI（All + 各チーム）を追加し、`/?team=teamId` URLパラメータでServer Component側がフィルタリングする。

</domain>

<decisions>
## Implementation Decisions

### Basic認証
- **D-01:** 認証クレデンシャルはパスワードのみ — ENV変数 `ADMIN_PASSWORD` の1変数。ユーザー名は不要（パスワード一致のみチェック）
- **D-02:** `middleware.ts` で実装 — Next.js Edge Middlewareで `/admin` へのリクエストをインターセプト。既存middleware.tsは存在しない（新規作成）
- **D-03:** 認証失敗時は `401 Unauthorized` + `WWW-Authenticate: Basic realm="Admin"` を返す — ブラウザの再入力ダイアログが自動表示される
- **D-04:** `.env.example` に `ADMIN_PASSWORD=` を追記する

### 管理UIの表示と操作
- **D-05:** `/admin` でメンバー一覧を表示する — KVから取得した全メンバーを表形式で表示。表示フィールド: name, substackId, teamId, addedAt
- **D-06:** 削除確認は `window.confirm()` — Client Componentの削除ボタン onClick 内で呼び出す。ブラウザネイティブのダイアログ
- **D-07:** メンバー追加フォーム: name + substackId + teamId の3フィールド（テキスト自由入力）。addedAtは追加時にサーバー側で `new Date().toISOString()` を付与
- **D-08:** teamId 入力はテキスト自由入力 — 既存チーム一覧からのselectなし（YAGNI）
- **D-09:** 編集機能（Update）は実装しない — 削除して再追加で対応（YAGNI）
- **D-10:** 追加後・削除後は `revalidatePath('/admin')` でページ再レンダリング — トーストなど追加UIなし

### チームフィルターのUI
- **D-11:** トップページ（`/`）にタブUIを追加 — 「All」タブ + KVのメンバーから動的生成した各チームタブ
- **D-12:** タブは `<a href>` リンク — `/?team=xxx` または `/?team=` なし（All）へのリンク。Client Component不要
- **D-13:** フィルタリングは Server Component 側（`page.tsx` の `searchParams`）で処理 — `getMembers()` の結果を `teamId` でfilterしてからWeeklyHeatmapGridに渡す
- **D-14:** チーム一覧はKVのメンバーから動的生成 — `[...new Set(members.map(m => m.teamId))]` でユニークなteamIdを抽出

### Server Actionsのエラーハンドリング
- **D-15:** エラー時（例: 重複substackId追加）は `useActionState`（旧`useFormState`）でエラー文字列を返してフォーム下に表示 — トーストライブラリ不要

### Claude's Discretion
- 管理画面のレイアウト（テーブル構造、ボタン配置）はTailwind CSSでシンプルに実装
- Server Actionsのファイル構成（`src/app/admin/actions.ts` など）はClaude判断で決定
- タブUIのスタイリング（アクティブタブの強調）はTailwind CSSでClaude判断

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 要件定義
- `.planning/REQUIREMENTS.md` — ADM-01, ADM-02, ADM-03, HEAT-04の詳細要件
- `.planning/ROADMAP.md` — Phase 6のSuccess Criteria（4項目）

### 既存実装（変更対象・参照元）
- `src/lib/kvMembers.ts` — `getMembers()` 関数（一覧取得）。追加・削除用の関数を同ファイルに追加する
- `src/lib/types.ts` — `Member` 型 `{ name, substackId, teamId, addedAt }`
- `src/lib/redis.ts` — `redis` インスタンス（`Redis.fromEnv()`、D-01の自動シリアライズ使用）
- `src/app/page.tsx` — チームフィルタータブUIを追加する対象。searchParamsを受け取るよう更新

### 参照パターン
- `src/components/WeeklyHeatmapGrid.tsx` — トップページのメインコンポーネント。フィルタリング後のresultsを受け取る
- `src/app/member/[substackId]/page.tsx` — Server Componentパターンの参照（page.tsxでのdata fetch）

### プロジェクト全体
- `.planning/PROJECT.md` — コアバリュー、制約（Next.js App Router + Tailwind CSS、API Routes不使用）
- `.planning/phases/04-kv-data-layer/04-CONTEXT.md` — KV設計の決定事項（D-01〜D-10）。KVキーは `'members'`、自動シリアライズ使用

### 環境変数
- `.env.example` — `ADMIN_PASSWORD` を追記対象

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/kvMembers.ts:getMembers()` — `redis.get<Member[]>('members')` でメンバー配列を取得。追加・削除関数（`addMember`, `deleteMember`）を同ファイルに追加する
- `src/lib/redis.ts` — `redis` インスタンスをexportしている。`kvMembers.ts` から import 済み

### Established Patterns
- **Server Actions** — API Routes不使用（REQUIREMENTS.md Out of Scope）。`'use server'` ディレクティブでServer Actionsとして定義
- **Server Component + Client Component分離** — `page.tsx`（Server）でデータ取得 → Client Componentにprops。`'use client'`が必要なのは削除ボタン（window.confirm）とフォーム（useActionState）
- **revalidatePath** — Phase 4/5でも使用済みのキャッシュ更新パターン
- **Tailwind CSS** — 全コンポーネントのスタイリング

### Integration Points
- `middleware.ts`（新規）: `request.headers.get('authorization')` でBasic認証チェック → 不一致なら `401` レスポンスを返す
- `src/app/admin/` ディレクトリ（新規）: `page.tsx`（Server Component）+ `actions.ts`（Server Actions）+ Client Components
- `src/app/page.tsx`: `searchParams` を受け取り、チームタブUIとフィルタリングを追加
- `src/lib/kvMembers.ts`: `addMember(member)` と `deleteMember(substackId)` を追加

</code_context>

<specifics>
## Specific Ideas

- middleware.tsのBasic認証実装パターン:
  ```ts
  const encoded = Buffer.from(`:${process.env.ADMIN_PASSWORD}`).toString('base64')
  if (request.headers.get('authorization') !== `Basic ${encoded}`) {
    return new NextResponse('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Admin"' } })
  }
  ```
- `deleteMember(substackId)`: getMembers() → filter → redis.set('members', filtered)
- `addMember(member)`: getMembers() → [...members, newMember] → redis.set('members', updated)
- タブUIのURL生成: teamIdが空文字列 `""` のメンバーは「All」扱いか別チームか要注意 → teamIdが `""` の場合はAllに含める
- `searchParams` はNext.js App RouterのServer Componentで `{ searchParams: Promise<{team?: string}> }` として受け取る（Next.js 15以降はPromise型）

</specifics>

<deferred>
## Deferred Ideas

- メンバー編集機能（Update）— 削除して再追加で対応。将来的な要件があれば別フェーズで追加
- チームフィルターのドロップダウンUI — 今回はタブUIで実装。チーム数が多くなった場合の将来対応
- 管理画面でのチーム管理（チームの作成・削除）— 今回はtextフィールド自由入力。将来の要件があれば別フェーズ

</deferred>

---

*Phase: 6-管理画面 + チームフィルター*
*Context gathered: 2026-05-10*
