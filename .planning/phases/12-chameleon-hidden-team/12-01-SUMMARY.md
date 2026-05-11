---
phase: 12-chameleon-hidden-team
plan: 01
subsystem: ui
tags: [next.js, typescript, team-filter, hidden-team]

# Dependency graph
requires:
  - phase: 11-multi-team-membership
    provides: teamNames string[] 型定義（多対多チーム所属）
provides:
  - HIDDEN_TEAM 定数（src/lib/types.ts）
  - chameleon タブをチーム一覧から除外するフィルタリング（page.tsx）
  - All ビューから chameleon メンバーを除外するフィルタリング（page.tsx）
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - HIDDEN_TEAM 定数による予約チーム名管理（KISS/YAGNI）
    - teams フィルタ + filteredMembers フィルタの2点変更パターン

key-files:
  created: []
  modified:
    - src/lib/types.ts
    - src/app/page.tsx

key-decisions:
  - "D-01: chameleon は All ビューのみから除外。/?team=teamA では teamA 所属なら表示される"
  - "D-02: /?team=chameleon 直打ちは許可（ブロック・リダイレクトなし）"
  - "D-03: 管理画面 AdminMemberList は変更なし — 全表示を維持"
  - "HIDDEN_TEAM 定数を src/lib/types.ts に export（inline 定義より再利用性あり）"

patterns-established:
  - "HIDDEN_TEAM 定数: 予約チーム名を定数化して page.tsx で import して使用"
  - "teams フィルタ: .filter(t => t !== HIDDEN_TEAM) を Set 展開後に追加"
  - "filteredMembers: All ビュー時のみ !m.teamNames.includes(HIDDEN_TEAM) で除外"

requirements-completed: []

# Metrics
duration: 10min
completed: 2026-05-12
---

# Phase 12 Plan 01: chameleon-hidden-team Summary

**HIDDEN_TEAM 定数 + 2点のフィルタで chameleon チームを All ビュー・タブから非表示化（URL直打ち・管理画面は通常表示を維持）**

## Performance

- **Duration:** 約 10 min
- **Started:** 2026-05-12T00:00:00Z
- **Completed:** 2026-05-12
- **Tasks:** 2（+ checkpoint）
- **Files modified:** 2

## Accomplishments

- `src/lib/types.ts` に `export const HIDDEN_TEAM = 'chameleon'` を追加
- `src/app/page.tsx` の teams 生成時に HIDDEN_TEAM タブを除外
- `src/app/page.tsx` の All ビュー filteredMembers から chameleon メンバーを除外
- /?team=chameleon 直打ち・/?team=teamA・管理画面は従来通り（D-01~D-03 遵守）

## Task Commits

Each task was committed atomically:

1. **Task 1: HIDDEN_TEAM 定数を types.ts に追加** - `e5c11ca` (feat)
2. **Task 2: page.tsx に chameleon フィルタリングを適用** - `f330770` (feat)

## Files Created/Modified

- `src/lib/types.ts` - `export const HIDDEN_TEAM = 'chameleon'` を末尾に追記
- `src/app/page.tsx` - HIDDEN_TEAM import 追加 + teams フィルタ + filteredMembers フィルタ変更（3箇所）

## Decisions Made

- D-01: chameleon は All ビューのみ除外。他チームタブ（/?team=teamA）では teamA 所属なら表示される
- D-02: /?team=chameleon 直打ちは表示を許可（タブには出ない）。ブロック・リダイレクトなし
- D-03: 管理画面 AdminMemberList は変更なし（全表示を維持）
- HIDDEN_TEAM 定数を types.ts に export 定数として定義（KISS/YAGNI — 設定化は不要）

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 12 Plan 01 完了。v1.3 マイルストーンの chameleon-hidden-team フェーズが完成。
- ブラウザ確認（D-01, D-02, D-03）済み — human approved。

## Self-Check: PASSED

- src/lib/types.ts: FOUND
- src/app/page.tsx: FOUND
- 12-01-SUMMARY.md: FOUND
- Commit e5c11ca: FOUND
- Commit f330770: FOUND

---
*Phase: 12-chameleon-hidden-team*
*Completed: 2026-05-12*
