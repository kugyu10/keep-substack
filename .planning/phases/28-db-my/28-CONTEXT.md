# Phase 28: コミットスケジュール — DB + /my ページ - Context

**Gathered:** 2026-06-02
**Status:** Ready for planning

<domain>
## Phase Boundary

`member_commit_slots` テーブルを新設し、/my ページでコミット頻度（週1〜4回）・曜日・時刻をユーザーが自己設定できるようにする。設定UIはモーダルで提供し、「宣言する」ボタンでDBに保存する。

**Requirements:** SCHED-01, SCHED-02, SCHED-03

</domain>

<decisions>
## Implementation Decisions

### 保存アクション設計
- **D-01:** コミットスロットの保存は `updateCommitSlotsAction`（`src/app/my/actions.ts` に追加）として独立させる。既存の `updateMyProfileAction` には統合しない
- **D-02:** プロフィール保存（name/handle/teams）とスケジュール宣言は独立したボタンと Server Action で処理する

### コミットスケジュールUI — モーダル
- **D-03:** コミットスケジュール設定は `/my` ページにモーダルUIとして実装する。新規コンポーネント `src/app/my/CommitScheduleModal.tsx`（Client Component）として作成
- **D-04:** スケジュール未設定時: `「コミットスケジュールを宣言する」` ボタンを表示 → クリックでモーダルを開く
- **D-05:** スケジュール設定済み時: 「週N回 — 月曜 8:00、水曜 20:00…」のサマリーテキストをクリックして編集モーダルを開く
- **D-06:** モーダルの開閉状態 (`isOpen`) は `CommitScheduleModal` 自身の `useState` で管理する。`/my/page.tsx` は開閉を管理しない
- **D-07:** `/my/page.tsx` はサーバーサイドで `member_commit_slots` を SELECT し、スロット配列 + メンバー ID を props として `CommitScheduleModal` に渡す

### スロット入力UI
- **D-08:** 頻度選択: `<select>` プルダウン（1/2/3/4）。変更時に曜日+時刻ペアが動的に増減する（`useState` で頻度を管理）
- **D-09:** 各スロットの曜日: `<select>`（月/火/水/木/金/土/日 = 0〜6）
- **D-10:** 各スロットの時刻: `<select>`（00〜23の整数値、分は:00固定）
- **D-11:** UIバリデーション: 同一曜日を2つ以上のスロットで選択することを禁止する（クライアントサイドで警告）
- **D-12:** モーダル内の送信ボタンは「宣言する」。押すと DB 保存 + モーダルを閉じる

### DB設計
- **D-13:** テーブル名: `member_commit_slots`
- **D-14:** カラム: `id` (BIGINT GENERATED ALWAYS AS IDENTITY PK), `member_id` (BIGINT, FK → members.id), `day_of_week` (INT), `hour` (INT)
- **D-15:** `day_of_week` マッピング: 0=月, 1=火, 2=水, 3=木, 4=金, 5=土, 6=日（月スタート・日終わり）
- **D-16:** DB UNIQUE 制約なし（UIバリデーションのみで重複を防ぐ）
- **D-17:** 保存戦略: `updateCommitSlotsAction` でそのメンバーの全スロットを `DELETE` してから `INSERT`（`member_teams` と同じパターン）
- **D-18:** RLS: 本人のみ書き込み可（`member_id` = 認証済みメンバーの `id`）

### Claude's Discretion
- モーダルの実装方法（Tailwind fixed + overlay で実装。`dialog` タグまたは div+role="dialog" はどちらでも可）
- `updateCommitSlotsAction` のエラーハンドリング: 既存の `string | null` 返り値パターンを踏襲
- migration ファイル名: `supabase/migrations/20260602000001_add_member_commit_slots.sql`（または適切な timestamp）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/ROADMAP.md` §Phase 28 — Goals, plans, success criteria
- `.planning/REQUIREMENTS.md` §SCHED-01, SCHED-02, SCHED-03 — 詳細要件と受け入れ条件

### Database
- `supabase/schema.sql` — 全テーブル定義（`CREATE TABLE member_commit_slots` の追加先）
- `supabase/migrations/20260602000000_add_substack_handle.sql` — 直近 migration の形式参照

### /my ページ実装
- `src/app/my/page.tsx` — Server Component（`member_commit_slots` SELECT + CommitScheduleModal への props 渡しの追加先）
- `src/app/my/MyProfileForm.tsx` — Client Component（コミットスケジュールとは独立した既存プロフィールフォーム）
- `src/app/my/actions.ts` — `updateCommitSlotsAction` の追加先（`updateMyProfileAction` の実装パターンを参照）

### 参照パターン（Phase 27 CONTEXT.md より）
- Phase 27 CONTEXT.md の D-03: `updateMyProfileAction` の一括保存パターン → Phase 28 では独立アクションにするが実装パターンは同様
- `src/app/my/__tests__/updateMyProfileAction.test.ts` — テスト実装パターン参照

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/my/actions.ts:updateMyProfileAction` — Server Action の実装パターン（admin client, user_id で本人特定, `revalidatePath('/my')`, `string | null` 返り値）
- `src/app/my/MyProfileForm.tsx` — `useActionState` + Server Action フォームのパターン。`CommitScheduleModal` の `useActionState` 実装の参照になる
- `supabase/migrations/20260531000000_consolidated_schema.sql` — migration の形式参照（BEGIN/COMMIT ラップ）

### Established Patterns
- DB 保存パターン: `admin.from('member_teams').delete().eq('member_id', id).in('team_id', ...)` → delete+insert 全置換（Phase 28 の delete+insert も同様）
- Migration パターン: `schema.sql` に `CREATE TABLE` を追加 + `migrations/` に増分ファイルを追加（Phase 26 で確立）
- Client Component での動的フォーム: `MyProfileForm.tsx` が `useActionState` で state を管理する既存パターン

### Integration Points
- `/my/page.tsx` (Server Component): `member_commit_slots` の SELECT を追加し、`CommitScheduleModal` を import して配置
- `src/app/my/actions.ts`: `updateCommitSlotsAction` を追加
- `supabase/schema.sql`: `CREATE TABLE member_commit_slots` を追加
- `supabase/migrations/`: 新規 migration ファイルを追加

</code_context>

<specifics>
## Specific Ideas

- ボタンの言葉は「保存する」ではなく「**宣言する**」— コミュニティ的な宣言の重みを持たせる意図
- モーダルで設定・宣言するUIは、/my ページにインラインで長いフォームを追加するより体験がよい
- スケジュール設定済みユーザーのサマリー表示例: `「週2回 — 月曜 8:00、水曜 20:00」`（クリックで編集モーダル）

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 28-db-my*
*Context gathered: 2026-06-02*
