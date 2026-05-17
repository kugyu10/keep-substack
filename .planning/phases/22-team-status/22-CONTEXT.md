# Phase 22: チームステータス管理 - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

teamsテーブルに status（public/private/hidden）カラムを追加し、HIDDEN_TEAM定数を廃止する。管理画面に `/admin/teams` 別ページを新設してチームのstatusを設定できるようにする。トップページのチームタブは status=public のみ表示し、Allビューの表示ルールを status ベースに移行する。

**このフェーズで変更するもの:**
- `supabase/migrations/` — statusカラム追加DDL + chameleon→hidden変換UPDATEを含む新ファイル
- `supabase/schema.sql` — statusカラムを含む形に更新
- `src/lib/types.ts` — HIDDEN_TEAM定数削除、Member型の `teamNames: string[]` を `teams: {name: string, status: string}[]` に変更
- `src/lib/members.ts` — getMembers() のJOINクエリを teams(name, status) に拡張、戻り値を新Member型に対応
- `src/app/page.tsx` — HIDDEN_TEAM定数削除、status ベースのフィルタリングに変更
- `src/app/admin/teams/page.tsx` — 新規作成（チームstatus管理テーブルUI）
- `src/app/admin/teams/actions.ts` — 新規作成（チームstatus更新Server Action）
- `src/app/admin/page.tsx` — /admin/teams へのリンク追加
- `src/app/admin/AdminAddForm.tsx` / `AdminMemberList.tsx` — teams prop の型変更対応（.map(t => t.name) に調整）

**このフェーズで作らないもの:**
- /admin/teams/{teamName} の週次ヒートマップビュー（Phase 24）
- /myページのpublicチーム参加・退出UI（Phase 23）

</domain>

<decisions>
## Implementation Decisions

### 管理画面のUI配置

- **D-01:** チームstatus編集UIは `/admin/teams` として**別ページを新設する**（/admin内にセクション追加ではなく）
- **D-02:** `/admin/teams` のレイアウトはテーブル形式。チーム名 | statusドロップダウン（public/private/hidden） | Saveボタン の行ごとリスト
- **D-03:** `/admin` メインページに「チーム設定」リンクを追加して `/admin/teams` へ誘導する

### privateチームのAll表示ルール

- **D-04:** status別の表示ルールは以下の通り:
  - `public`: チームタブあり + Allビューあり
  - `private`: チームタブなし + Allビューあり（タブに出ないだけ、メンバーはAll表示）
  - `hidden`: チームタブなし + Allビューなし（完全非表示）

### データ取得の変更範囲

- **D-05:** `getMembers()` の SELECT クエリを `teams(name, status)` にJOIN拡張する
- **D-06:** `Member` 型の `teamNames: string[]` を `teams: {name: string, status: string}[]` に変更する
- **D-07:** 呼び出し元で team名のみ必要な箇所（チェックボックスUI等）は `.map(t => t.name)` で対応する
- **D-08:** `page.tsx` のフィルタリングロジック:
  - タブ一覧: `member.teams.filter(t => t.status === 'public').map(t => t.name)` で重複排除
  - Allビュー: `member.teams.every(t => t.status !== 'hidden')` で除外判定

### マイグレーション方法

- **D-09:** `supabase/migrations/20260517_add_team_status.sql` を新規作成する
- **D-10:** マイグレーションファイルに以下を含める:
  ```sql
  ALTER TABLE teams ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'public';
  UPDATE teams SET status = 'hidden' WHERE name = 'chameleon';
  ```
- **D-11:** `supabase/schema.sql` の teams テーブル定義にも status カラムを追加して、初期セットアップ用ドキュメントを最新化する

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 要件定義
- `.planning/REQUIREMENTS.md` §TEAM — TEAM-01〜TEAM-04（Phase 22対象要件）
- `.planning/ROADMAP.md` §Phase 22 — Goal・Success Criteria・Requirements

### 現行スキーマ・コード
- `supabase/schema.sql` — 現行テーブル定義（teamsにstatusなし）
- `src/lib/types.ts` — Member型・HIDDEN_TEAM定数（廃止対象）
- `src/lib/members.ts` — getMembers()・addMember()・updateMember()（型変更の影響を受ける）
- `src/app/page.tsx` — HIDDEN_TEAMによるフィルタリング（status置き換え対象）
- `src/app/admin/page.tsx` — 既存管理画面（リンク追加対象）
- `src/app/admin/AdminAddForm.tsx` — teams prop型変更の影響あり
- `src/app/admin/AdminMemberList.tsx` — teams prop型変更の影響あり
- `src/app/admin/actions.ts` — Server Actions（参考）

### 既存マイグレーション
- `supabase/migrations/20260516_rename_substack_id_to_publication_id.sql` — マイグレーションファイルの書き方参考

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `createSupabaseAdminClient()` (`src/lib/supabase/admin.ts`) — チームstatus更新Server Actionで使用
- `AdminMemberList.tsx` のServer Action呼び出しパターン — `/admin/teams` のSave処理の参考
- 既存のテーブルUIスタイル（`/admin` の `AdminMemberList`）— `/admin/teams` のテーブルデザインに踏襲

### Established Patterns
- Server Actions (`actions.ts`) パターン — チームstatus更新も同じパターンで実装
- `createSupabaseAdminClient()` で service_role 経由の書き込み — RLS制約なし
- Next.js App Router のページ分割（`page.tsx` + `actions.ts`）

### Integration Points
- `getMembers()` の戻り値型変更 → `page.tsx`・`admin/page.tsx`・`AdminAddForm`・`AdminMemberList` すべてが影響を受ける
- `/admin/teams` は `/admin` と同じ Supabase auth adminロール保護下に置く（middleware/proxy.ts の matcher 確認が必要）

</code_context>

<specifics>
## Specific Ideas

- `/admin/teams` ページのテーブルは既存管理画面のライトテーマUIに合わせる
- テーブル行: チーム名（固定） | `<select>` ドロップダウン（public/private/hidden） | `[Save]` ボタン

</specifics>

<deferred>
## Deferred Ideas

None — 議論はフェーズスコープ内に収まった

</deferred>

---

*Phase: 22-チームステータス管理*
*Context gathered: 2026-05-17*
