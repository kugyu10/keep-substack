---
phase: 20
plan: "20-01"
subsystem: admin
tags: [admin, checkbox, teams, supabase]
dependency_graph:
  requires: [teams-table (Phase 17)]
  provides: [チェックボックスによるチーム選択UI]
  affects: [AdminAddForm, AdminMemberList, AdminPage, actions]
tech_stack:
  added: []
  patterns: [formData.getAll, Server Component props drilling]
key_files:
  created: []
  modified:
    - src/app/admin/actions.ts
    - src/app/admin/page.tsx
    - src/app/admin/AdminAddForm.tsx
    - src/app/admin/AdminMemberList.tsx
decisions:
  - formData.getAll を使い、チェックボックスの複数値をシンプルに取得する
  - AdminMemberList の handleUpdate は手動 FormData 構築のため :checked フィルターが必須
metrics:
  duration_seconds: 77
  completed_date: "2026-05-16"
---

# Phase 20 Plan 01: 管理画面チームチェックボックス Summary

チーム所属入力をカンマ区切りテキストからSupabaseのteamsテーブルを参照したチェックボックスUIに変更し、タイポなしで選択できるようにした。

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | actions.ts teamNames 取得変更 | 7e68e86 | src/app/admin/actions.ts |
| 2 | page.tsx teams フェッチ追加 | b7b9dac | src/app/admin/page.tsx |
| 3 | AdminAddForm チェックボックスUI | 08ef824 | src/app/admin/AdminAddForm.tsx |
| 4 | AdminMemberList チェックボックスUI | 676fc19 | src/app/admin/AdminMemberList.tsx |

## Verification Results

- [x] `src/app/admin/actions.ts` で `formData.getAll('teamNames')` を使っていること
- [x] `src/app/admin/page.tsx` で teams を取得して props で渡していること
- [x] `src/app/admin/AdminAddForm.tsx` にチェックボックスがあること（`type="checkbox" name="teamNames"`）
- [x] `src/app/admin/AdminMemberList.tsx` にチェックボックスがあること（`defaultChecked={m.teamNames.includes(team)}`）
- [x] `AdminMemberList.tsx` の `handleUpdate` が `:checked` のチェックボックスのみ収集すること
- [x] `npm run build` がエラーなく完了すること

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None - 変更は管理画面内の既存ルートのみで、新しいネットワークエンドポイントや認証パスは追加していない。

## Self-Check: PASSED

- src/app/admin/actions.ts: FOUND
- src/app/admin/page.tsx: FOUND
- src/app/admin/AdminAddForm.tsx: FOUND
- src/app/admin/AdminMemberList.tsx: FOUND
- Commits 7e68e86, b7b9dac, 08ef824, 676fc19: FOUND
