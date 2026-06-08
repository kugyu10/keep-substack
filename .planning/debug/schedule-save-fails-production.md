---
slug: schedule-save-fails-production
status: root_cause_found
trigger: 本番環境 スケジュール宣言保存に失敗する
created: 2026-06-06
updated: 2026-06-06
---

# Debug: スケジュール宣言保存失敗（本番環境）

## Symptoms

- **Expected:** 曜日・時刻が保存されて /my に反映される
- **Actual:** 「保存に失敗しました」UIエラーが表示される
- **Error messages:** "保存に失敗しました"（updateCommitSlotsAction の汎用エラー文言）
- **Timeline:** 常に発生（スロット数・曜日問わず）
- **Reproduction:** /my でコミットスケジュール保存操作を行う

## Current Focus

```yaml
hypothesis: "本番DBに member_commit_slots テーブルが存在しない"
test: "updateCommitSlotsAction の delete/insert が 42P01 (undefined_table) エラーを返す"
expecting: "マイグレーション適用後に保存が成功する"
next_action: "本番DBに supabase/migrations/20260602000001 と 20260602000002 を適用する"
```

## Evidence

- timestamp: 2026-06-06T10:30:00Z
  type: code_analysis
  finding: >
    PR description に "⚠️ 本番 DB への `supabase db push` が必要です" という警告がある。
    開発環境では適用済みだが本番への適用が未完了の可能性が高い。

- timestamp: 2026-06-06T10:30:01Z
  type: code_analysis
  finding: >
    updateCommitSlotsAction (src/app/my/actions.ts:132) は admin client を使って
    member_commit_slots テーブルに対して delete → insert を実行する。
    エラーパスの分岐: member lookup 失敗 → "保存に失敗しました" (line 170)、
    delete 失敗 → "保存に失敗しました" (line 183)、
    insert 失敗 → "保存に失敗しました" (line 194)。
    常に同じ汎用エラーが出ているため、deleteError または memberError が原因と推定される。

- timestamp: 2026-06-06T10:30:02Z
  type: schema_analysis
  finding: >
    supabase/migrations/20260602000001_add_member_commit_slots.sql — CREATE TABLE member_commit_slots
    supabase/migrations/20260602000002_add_member_commit_slots_unique.sql — UNIQUE 制約追加
    これらは develop ブランチに含まれるが、本番DBへの適用確認がない。
    supabase/schema.sql には member_commit_slots が含まれる（最新スキーマは正しい）。

- timestamp: 2026-06-06T10:30:03Z
  type: elimination
  finding: >
    RLS の問題ではない。actions.ts は createSupabaseAdminClient() (SUPABASE_SERVICE_ROLE_KEY) を使用しており、
    RLS をバイパスする。認証問題でもない（auth.getUser() 失敗は別エラー文言が返る）。
    ローカル/dev で未確認とのことで、未適用マイグレーションが本番のみの問題と一致する。

## Eliminated

- RLS ポリシー違反: admin client が service_role を使用するため除外
- 認証切れ: 別エラー文言 "ログインセッションが切れました" が出るため除外
- バリデーション失敗: 別エラー文言が出るため除外
- コード自体のバグ: ローカルで再現しないためコードは正しい

## Resolution

```yaml
root_cause: "本番DBに member_commit_slots テーブルが存在しない（マイグレーション未適用）"
fix: "本番Supabaseプロジェクトに 20260602000001 と 20260602000002 のマイグレーションを適用する"
verification: "適用後に /my でコミットスケジュール保存が成功し、「保存に失敗しました」が出なくなることを確認"
files_changed: "コード変更なし — DBマイグレーション適用のみ"
```
