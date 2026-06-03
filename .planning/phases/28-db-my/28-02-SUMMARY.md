---
plan: 28-02
phase: 28-db-my
status: complete
completed_at: "2026-06-03"
tasks_completed: 4
commits:
  - "feat(28-02): updateCommitSlotsAction を actions.ts に追加"
  - "feat(28-02): CommitScheduleModal を新規作成"
  - "feat(28-02): page.tsx に member.id + commitSlots + CommitScheduleModal を統合"
key_files:
  created:
    - src/app/my/CommitScheduleModal.tsx
  modified:
    - src/app/my/actions.ts
    - src/app/my/page.tsx
    - src/app/my/__tests__/page.test.tsx
self_check: PASSED
---

# Plan 28-02 Summary: CommitScheduleModal + Server Action + page.tsx 統合

## What was built

SCHED-01/02/03 をすべて満たすコミットスケジュール設定機能を実装した。

- **updateCommitSlotsAction** (`src/app/my/actions.ts`): DELETE → INSERT 全置換パターン。バリデーション（slots.length > 4 / day_of_week 1〜7 / hour 0〜23）+ auth.getUser() による本人スコープ強制。ユニットテスト 6 件 GREEN。
- **CommitScheduleModal** (`src/app/my/CommitScheduleModal.tsx`): useActionState + 動的スロット増減（1〜4）+ 重複曜日クライアントバリデーション。isFirstRender ref で成功時モーダルクローズ（Pitfall 6 対策）。UI-SPEC 通りの overlay / × / Escape クローズ、role="dialog" + aria-modal。
- **page.tsx 統合** (`src/app/my/page.tsx`): members SELECT に id を追加（Pitfall 2 対策）。member_commit_slots を day_of_week 順で SELECT し props として CommitScheduleModal に渡す。
- **page.test.tsx 更新**: member_commit_slots モックを追加し 8 件全 GREEN を維持。

## Verification

- ユニットテスト 6 件 GREEN（updateCommitSlotsAction）
- npm run build TypeScript エラーなし
- /my ページでモーダル開閉・スロット設定・「宣言する」保存・リロード後サマリー表示を確認
- Supabase dev Dashboard で member_commit_slots にデータが保存されていることを確認

## Deviations

なし — プランの全 must_haves を満たした。
