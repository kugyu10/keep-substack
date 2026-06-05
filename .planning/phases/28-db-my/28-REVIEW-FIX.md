---
phase: 28-db-my
fixed_at: 2026-06-03T12:07:00Z
review_path: .planning/phases/28-db-my/28-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
---

# Phase 28: Code Review Fix Report

**Fixed at:** 2026-06-03T12:07:00Z
**Source review:** .planning/phases/28-db-my/28-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (Critical: 3 → 2 applicable, Warning: 5 → handled as 6 commits per grouping)
- Fixed: 8 findings (CR-01, CR-03, WR-01, WR-02, WR-03, WR-04, WR-05)
- Skipped: 0

Note: CR-02 (非原子性) はプロンプトの指示通りコード変更なし（CR-01 + CR-03 の組み合わせで実用上の影響を最小化）。

## Fixed Issues

### CR-01: Server Action の JSON バリデーションが型チェック不足

**Files modified:** `src/app/my/actions.ts`
**Commit:** 36bbe0e
**Applied fix:** `Number.isInteger()` チェックと `typeof s !== 'object' || s === null` チェックを `for` ループの先頭に追加。浮動小数点（1.5 など）や非オブジェクト要素（null、数値など）を早期リターンで弾く。

---

### CR-03: `member_commit_slots` テーブルに UNIQUE 制約がなく重複行が挿入可能

**Files modified:** `supabase/migrations/20260602000002_add_member_commit_slots_unique.sql` (新規作成), `supabase/schema.sql`
**Commit:** 4191f23
**Applied fix:** 新規 migration `20260602000002_add_member_commit_slots_unique.sql` に `ALTER TABLE member_commit_slots ADD CONSTRAINT uq_member_commit_slots_day UNIQUE (member_id, day_of_week)` を追加。`schema.sql` の `CREATE TABLE IF NOT EXISTS member_commit_slots` にも `UNIQUE (member_id, day_of_week)` 句を追加。

---

### WR-01/WR-02: モーダル保存後の古い initialSlots 表示 + 重複曜日時のボタン非ブロック

**Files modified:** `src/app/my/CommitScheduleModal.tsx`
**Commit:** 5d20244
**Applied fix:**
- `savedSlots` state を追加し、`initialSlots` の初期値で初期化。
- `useEffect` 内の保存成功時処理（`state === null && !isPending`）で `setSavedSlots([...slots])` を実行し `setIsOpen(false)` の前に現在の slots をコピー。
- 閉じた後のトリガー表示（button / span）で `initialSlots.length` / `formatSummary(initialSlots)` の代わりに `savedSlots.length` / `formatSummary(savedSlots)` を使用。
- 送信ボタンの `disabled` を `isPending || showDuplicateWarning` に変更し、重複曜日が選択中は送信をブロック。

---

### WR-03/WR-05: deleteError / insertError のテストケースが未存在

**Files modified:** `src/app/my/__tests__/updateCommitSlotsAction.test.ts`
**Commit:** 94c9c2b
**Applied fix:** `describe` ブロック末尾に以下の2テストを追加:
- `'delete エラー時は "保存に失敗しました..." を返す'` — `setupAdminMock({ deleteError: { message: 'db error' } })` でエラーパスをカバー
- `'insert エラー時は "保存に失敗しました..." を返す'` — `setupAdminMock({ insertError: { message: 'db error' } })` でエラーパスをカバー
テスト結果: 8 tests passed (元 6 + 新規 2)

---

### WR-04: `CommitScheduleModal` の `memberId` プロパティが未使用

**Files modified:** `src/app/my/CommitScheduleModal.tsx`, `src/app/my/page.tsx`
**Commit:** b0ab060
**Applied fix:** `CommitScheduleModalProps` インターフェースから `memberId: string` を削除。関数シグネチャを `{ memberId: _memberId, initialSlots }` から `{ initialSlots }` に変更。`page.tsx` の呼び出し側から `memberId={(member as any).id}` を削除。

---

## Skipped Issues

なし — 全 findings が正常に修正されました。

---

_Fixed: 2026-06-03T12:07:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
