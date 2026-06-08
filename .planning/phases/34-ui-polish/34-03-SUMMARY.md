---
phase: 34-ui-polish
plan: "03"
subsystem: commitUtils
tags: [sort, commit-view, group-ordering, tdd]
dependency_graph:
  requires: [34-01]
  provides: [achievementRate-export, group-sort]
  affects: [src/lib/commitUtils.ts, src/lib/__tests__/commitUtils.test.ts]
tech_stack:
  added: []
  patterns: [pre-compute-meta-map, group-sort, 3-group-classification]
key_files:
  created: []
  modified:
    - src/lib/commitUtils.ts
    - src/lib/__tests__/commitUtils.test.ts
decisions:
  - "achievementRate exported (was private) to enable direct test import and future consumer use"
  - "getGroup() helper encapsulates 3-group logic: 0=hasUser+slots, 1=hasUser+no-slots, 2=!hasUser"
  - "meta Map pre-computes group/rate0/rate1/rate2/streak per member to avoid per-comparator recomputation (anti-pattern)"
  - "6-step sort chain: group → rate0 → streak → rate1 → rate2 → addedAt"
metrics:
  duration: "2m 9s"
  completed_date: "2026-06-08"
  tasks: 2
  files_modified: 2
---

# Phase 34 Plan 03: Export achievementRate and 3-group sort Summary

**One-liner:** Exported achievementRate and implemented 3-group member classification (hasUser+slots / hasUser+no-slots / !hasUser) with 5-key sort (thisWeekRate, streak, lastWeekRate, twoWeeksAgoRate, addedAt) within each group.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Export achievementRate and add getGroup helper with extended sort logic | 8836dd8 | src/lib/commitUtils.ts |
| 2 | Add tests for group ordering and multi-key sort | 639d842 | src/lib/__tests__/commitUtils.test.ts |

## What Was Built

### Task 1: commitUtils.ts
- Added `export` keyword to `achievementRate` function (was private, now importable)
- Added `Member` to the type import line
- Added `getGroup(member, memberSlots)` helper function that returns `0 | 1 | 2`
- Updated `sortMembersForCommitView` to precompute `lastWeekDates` and `twoWeeksAgoDates`
- Extended meta Map to include `group`, `rate0`, `rate1`, `rate2` alongside existing `streak`
- Replaced 3-step comparator with 6-step chain: group → rate0 → streak → rate1 → rate2 → addedAt

### Task 2: commitUtils.test.ts
- Added `achievementRate` to imports
- Added describe block "group ordering (hasUser grouping D-14)" with 3 test cases:
  - Group A before Group C
  - Group B before Group C
  - Group A before Group B
- Added describe block "achievementRate export" with 1 test case

## Verification

```
grep -c "export function achievementRate" src/lib/commitUtils.ts  → 1 ✓
grep -c "getGroup" src/lib/commitUtils.ts                         → 2 ✓
grep -c "rate0" src/lib/commitUtils.ts                            → 2 ✓
grep -c "rate1" src/lib/commitUtils.ts                            → 2 ✓
grep -c "rate2" src/lib/commitUtils.ts                            → 2 ✓
grep -c "member.hasUser" src/lib/commitUtils.ts                   → 1 ✓
npm test exits 0 (150 tests, 22 files)                            ✓
```

Tests: 146 baseline → 150 final (+4 new tests)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. The sort function processes trusted in-memory data; no new network endpoints, auth paths, or DB schema changes were introduced.

## Self-Check: PASSED

- `src/lib/commitUtils.ts` exists with `export function achievementRate` and `getGroup`
- `src/lib/__tests__/commitUtils.test.ts` exists with `Group A` and `achievementRate` import
- Commits 8836dd8 and 639d842 verified in git log
- npm test exits 0
