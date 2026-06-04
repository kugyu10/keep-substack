---
phase: 30-achievement
plan: "01"
subsystem: lib/commitUtils
tags: [tdd, pure-functions, achievement, streak]
dependency_graph:
  requires: []
  provides:
    - isCurrentWeekComplete (commitUtils.ts)
    - consecutiveWeekStreak (commitUtils.ts)
    - sortMembersForCommitView D-10 full version (commitUtils.ts)
  affects:
    - src/components/CommitGoalView.tsx (will call consecutiveWeekStreak in Plan 02)
    - src/components/CommitGoalRow.tsx (will receive streak prop in Plan 02)
tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN/REFACTOR cycle
    - Pure functions with internal helper (buildArticleDateMap)
    - JST date key mapping via isoToJSTDateKey
key_files:
  created: []
  modified:
    - src/lib/commitUtils.ts
    - src/lib/__tests__/commitUtils.test.ts
decisions:
  - "buildArticleDateMap is internal (non-exported) helper — CommitGrid keeps its own inline Map build (change minimization)"
  - "consecutiveWeekStreak builds articleDateMap once outside loop (Pitfall 1 prevention)"
  - "isCurrentWeekComplete returns false for empty slots (vacuous truth prevention per Pitfall 2)"
  - "countArticlesInDateSet removed as dead code after D-10 sortMembersForCommitView replaced simplified impl"
metrics:
  duration: "~3 minutes"
  completed: "2026-06-05"
  tasks_completed: 3
  files_modified: 2
---

# Phase 30 Plan 01: Achievement Calculation Logic Summary

## One-liner

`isCurrentWeekComplete` / `consecutiveWeekStreak` / `sortMembersForCommitView D-10` pure functions implemented in `commitUtils.ts` via TDD RED→GREEN→REFACTOR.

## What Was Built

Three new capabilities added to `src/lib/commitUtils.ts`:

1. **`isCurrentWeekComplete(slots, weekDates, articleDateMap): boolean`** — Returns `true` when every commit slot in the given week has at least one article. Returns `false` for empty slots (vacuous truth prevention).

2. **`consecutiveWeekStreak(slots, items): number`** — Counts consecutive weeks (starting from current week) where all slots were fulfilled. Builds `articleDateMap` once outside the loop. Returns 0 if slots empty or current week incomplete; 1 for current week only; 2 for current + last week; max 3.

3. **`sortMembersForCommitView` (D-10 full version)** — Updated from simplified this-week count to full 3-tier sort: ①achievement rate (achieved slots / total slots) descending → ②streak weeks descending → ③addedAt ascending. Filters slots per-member to avoid cross-member contamination (Pitfall 4).

Internal helper added: **`buildArticleDateMap(items)`** — builds `Map<dateKey, FeedItem[]>` from `FeedItem[]` using `isoToJSTDateKey`. Used by `consecutiveWeekStreak` and `achievementRate`. Not exported.

Dead code removed: **`countArticlesInDateSet`** — no longer needed after D-10 replaced the simplified implementation.

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED | `5ccdcf7` | PASS — 7 tests failed as expected before implementation |
| GREEN | `df2ee36` | PASS — all 20 commitUtils tests passing |
| REFACTOR | `8b50036` | PASS — dead code removed, 96 tests still green |

## Commits

| Hash | Type | Description |
|------|------|-------------|
| `5ccdcf7` | test | RED phase — add failing tests for isCurrentWeekComplete and consecutiveWeekStreak |
| `df2ee36` | feat | GREEN phase — implement all 3 functions + D-10 sort |
| `8b50036` | refactor | Remove unused countArticlesInDateSet (dead code after D-10) |

## Verification Results

1. `npx vitest run src/lib/__tests__/commitUtils.test.ts` — 20/20 tests PASS
2. `npx vitest run` — 96 tests PASS (up from 88 before this plan; +8 new tests)
3. `isCurrentWeekComplete` and `consecutiveWeekStreak` both exported from `commitUtils.ts`
4. No `_slots` or `eslint-disable-next-line` remaining in `commitUtils.ts`

## Deviations from Plan

None — plan executed exactly as written with one minor addition:

**Refactor bonus: Removed dead code `countArticlesInDateSet`** — The old simplified `sortMembersForCommitView` used `countArticlesInDateSet` internally. The D-10 full version no longer needs it. Removing dead code is standard refactoring; no behavior change.

## Known Stubs

None — all functions are fully implemented and tested. Plan 02 will wire `consecutiveWeekStreak` into `CommitGoalView` and `CommitGoalRow` for display.

## Threat Flags

None — this plan adds pure computation functions with no network endpoints, auth paths, file access, or schema changes.

## Self-Check: PASSED

- [x] `src/lib/commitUtils.ts` — FOUND and modified (isCurrentWeekComplete, consecutiveWeekStreak exported)
- [x] `src/lib/__tests__/commitUtils.test.ts` — FOUND and modified (20 tests)
- [x] Commit `5ccdcf7` (RED) — FOUND in git log
- [x] Commit `df2ee36` (GREEN) — FOUND in git log
- [x] Commit `8b50036` (REFACTOR) — FOUND in git log
- [x] Full test suite 96 tests PASS
