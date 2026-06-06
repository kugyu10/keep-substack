# Phase 27: Substack Handle — DB + プロフィールリンク - Context

**Gathered:** 2026-06-02
**Status:** Ready for planning

<domain>
## Phase Boundary

`members` テーブルに `substack_handle` カラムを追加し、/my ページから @handle を登録・更新できるようにする。個人マンスリービュー（`/member/[publicationId]`）の名前/アイコンを Substack プロフィールへのリンクに変更する。Magic Link ログイン URL に `?handle=hoge` を付与することで、ログイン後の /my ページに @handle を自動 pre-fill できるようにする。

**Requirements:** PROF-01, PROF-02, PROF-03

</domain>

<decisions>
## Implementation Decisions

### @handle 入力 UI（PROF-01）
- **D-01:** `MyProfileForm.tsx` 内の `name` フィールドの下に @handle 入力欄を追加する（専用セクションや別フォームは不要）
- **D-02:** `substack_handle` は DB に `@` 込みで保存する（例: `@hoge`）。保存前に `trim()` + 先頭 `@` が付いていなければ自動付与する。空文字列は `null` として保存（handle 未設定 = リンクなし）
- **D-03:** name + teams + handle を既存の `updateMyProfileAction` で一括保存する。専用アクションは不要

### ?handle= pre-fill（PROF-03）
- **D-04:** `auth/callback/route.ts` が `?handle=hoge` クエリパラムを受け取り、redirect 先を `/my?handle=hoge` にする（既存の `?pid=` パターンと同様に実装）
- **D-05:** `/my/page.tsx` が `searchParams` から `handle` を読み取り、`MyProfileForm` に初期値として渡す
- **D-06:** DB に `substack_handle` が存在する場合は DB 値を優先して表示する。DB が空（null）の場合のみ `searchParams` の `handle` 値を `defaultValue` として使う

### handle バリデーション
- **D-07:** Server Action（`updateMyProfileAction`）内でのみバリデーションを行う。クライアントサイドバリデーションは追加しない
- **D-08:** バリデーションルール: `trim()` → 空文字なら `null` 保存 → 非空なら先頭 `@` を付与して保存。文字種の正規表現制約は設けない（最低限のみ）
- **D-09:** `substack_handle` カラムは `TEXT NULL` — 未設定メンバーのリンクは表示しない（CalendarGrid がフォールバックを処理）

### Claude's Discretion（コードベース分析から）
- **PROF-02 の CalendarGrid 実装:** `CalendarGrid.tsx` の avatar+name ヘッダー（行 44-57）を、`substack_handle` が存在する場合は `<a href="https://substack.com/{handle}" target="_blank" rel="noopener noreferrer">` で囲む。`substackHandle?: string` を新しい prop として追加。`null` または未定義の場合は現状の静的表示を維持
- **URL 生成:** DB に `@hoge` で保存されているため URL は `https://substack.com/${handle}` で正しく `https://substack.com/@hoge` になる（`@` 重複なし）
- **`getMembers()` の拡張:** `src/lib/members.ts` の SELECT に `substack_handle` を追加し、`Member` 型にも追加する。`member/[publicationId]/page.tsx` がこの値を取得して `CalendarGrid` に渡す

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/ROADMAP.md` §Phase 27 — Goals, plans, success criteria
- `.planning/REQUIREMENTS.md` §PROF-01, PROF-02, PROF-03 — 詳細要件と受け入れ条件

### Database
- `supabase/schema.sql` — members テーブル定義（`ALTER TABLE members ADD COLUMN IF NOT EXISTS substack_handle TEXT` の追加先）
- `supabase/migrations/20260531000000_consolidated_schema.sql` — 直近 migration の参照（形式統一のため）

### /my ページ実装
- `src/app/my/page.tsx` — サーバーコンポーネント（searchParams 読み取り + MyProfileForm へのデータ渡しの追加先）
- `src/app/my/MyProfileForm.tsx` — Client Component フォーム（@handle 入力欄の追加先）
- `src/app/my/actions.ts` — `updateMyProfileAction`（substack_handle フィールドの追加先）

### auth callback
- `src/app/auth/callback/route.ts` — `?pid=` パターンを参照して `?handle=` の redirect 実装先

### 個人マンスリービュー（PROF-02）
- `src/app/member/[publicationId]/page.tsx` — CalendarGrid へのデータパス（substack_handle を渡す追加先）
- `src/components/CalendarGrid.tsx` — avatar+name ヘッダー行 44-57 がリンク化の対象
- `src/lib/members.ts` — `getMembers()` に substack_handle を追加する必要あり

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/my/MyProfileForm.tsx`: `useActionState` + Server Action パターンが確立済み。`name` フィールドと同じ構造で @handle 入力欄を追加するだけ
- `src/app/auth/callback/route.ts`: `?pid=` クエリパラムの処理パターン（行 8-34）が `?handle=` 実装の直接参照になる

### Established Patterns
- DB 保存: `updateMyProfileAction` で `admin.from('members').update({...}).eq('user_id', user.id)` パターン確立済み
- Migration: `supabase/schema.sql` に `ALTER TABLE … ADD COLUMN IF NOT EXISTS` で追加し、`supabase/migrations/` に増分 migration ファイルも追加する（Phase 26 で確立）
- Server Action のエラーハンドリング: `string | null` 返り値 + `role="alert"` の `<p>` 表示パターン

### Integration Points
- `src/lib/members.ts:getMembers()` — SELECT クエリに `substack_handle` を追加する必要がある。`Member` 型（`src/lib/types.ts` または inline）への追加も必要
- `CalendarGrid` の Props 型: `substackHandle?: string` を追加する必要がある

</code_context>

<specifics>
## Specific Ideas

- @handle を DB に `@` 込みで保存する設計（例: `@hoge`）は、URL 生成時に `https://substack.com/${handle}` とするだけで正しい URL になる利点がある
- `?handle=` クエリパラムを auth callback で受け取って `/my?handle=hoge` にリダイレクトするアプローチは、cookie 不要でシンプル

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 27-substack-handle-db*
*Context gathered: 2026-06-02*
