---
phase: 30-achievement
plan: "02"
subsystem: components/CommitGoalRow + components/CommitGoalView
tags: [tdd, achievement, streak, ui, icons]
dependency_graph:
  requires:
    - 30-01 (consecutiveWeekStreak from commitUtils.ts)
  provides:
    - CommitGoalRow streak prop + Column 3 conditional icon display
    - CommitGoalView streak calculation wiring
    - CommitGoalRow.test.tsx (3-state element-tree tests)
  affects:
    - src/components/CommitGoalRow.tsx
    - src/components/CommitGoalView.tsx
    - src/components/__tests__/CommitGoalRow.test.tsx
tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN cycle (element-tree pattern, no jsdom)
    - Server Component — no 'use client' added
    - Streak calculation in parent (CommitGoalView), result passed as prop to child (CommitGoalRow)
key_files:
  created:
    - src/components/__tests__/CommitGoalRow.test.tsx
  modified:
    - src/components/CommitGoalRow.tsx
    - src/components/CommitGoalView.tsx
decisions:
  - "streak calculation happens in CommitGoalView (Pitfall 5 — CommitGoalRow receives computed number only)"
  - "Header spacer updated to w-10 atomically with streak>=2 column width (Pitfall 3)"
  - "👑🔥 rendered as single span text node with aria-label='連続達成' (matches UI-SPEC gap-1 pattern)"
  - "streak=0 retains aria-hidden placeholder div (unchanged visual, correct semantics)"
metrics:
  duration: "~4 minutes"
  completed: "2026-06-05"
  tasks_completed: 3
  files_modified: 2
  files_created: 1
---

# Phase 30 Plan 02: Achievement Icon UI Wiring Summary

## One-liner

`CommitGoalRow` streak prop + Column 3 conditional 👑/👑🔥/empty display wired via `consecutiveWeekStreak` in `CommitGoalView`, with TDD element-tree tests for all 3 states.

## What Was Built

### Task 1 (RED): CommitGoalRow.test.tsx — 3-state element-tree tests

New test file `src/components/__tests__/CommitGoalRow.test.tsx` created using the element-tree pattern (no jsdom, pure React element inspection):

- **streak=0**: `collectText` output contains neither '👑' nor '🔥'
- **streak=1**: `collectText` output contains '👑' (ACHIEV-01)
- **streak=2**: `collectText` output contains both '👑' and '🔥' (ACHIEV-02)

File includes full element-tree helper set (`isElement`, `flattenChildren`, `findByType`, `findAllByTag`, `collectText`, `findAllByClassName`) copied from `CommitGrid.test.tsx`. `makeMember()` fixture uses a valid UUID (`00000000-0000-0000-0000-000000000001`), `name: 'Test User'`, `publicationId: 'test-pub'`, `teams: []`, `addedAt: '2026-01-01T00:00:00.000Z'`.

RED phase confirmed: 2/4 tests failed before implementation (streak=1 and streak=2 icon tests).

### Task 2 (GREEN): CommitGoalRow.tsx — streak prop + Column 3 conditional display

Changes to `src/components/CommitGoalRow.tsx`:
- Added `streak: number` to `CommitGoalRowProps` (after `imageUrl?: string`)
- Added `streak` to function destructuring
- Replaced Column 3 placeholder with 3-branch conditional:
  - `streak === 0`: `<div className="w-8 shrink-0" aria-hidden="true" />` (unchanged)
  - `streak === 1`: `<div className="w-8 shrink-0 flex items-center justify-center"><span role="img" aria-label="今週達成" className="text-sm leading-none">👑</span></div>`
  - `streak >= 2`: `<div className="w-10 shrink-0 flex items-center justify-center gap-1"><span role="img" aria-label="連続達成" className="text-sm leading-none">👑🔥</span></div>`
- Server Component constraint maintained (no `'use client'` added)

GREEN phase: 4/4 CommitGoalRow tests passing.

### Task 3: CommitGoalView.tsx — streak calculation + header spacer sync

Changes to `src/components/CommitGoalView.tsx`:
- Updated import: added `consecutiveWeekStreak` alongside `sortMembersForCommitView`
- Header spacer (line 35): `w-8` → `w-10` (Pitfall 3 atomic sync — matches streak>=2 column width)
- In `sorted.map` loop: added `const streak = consecutiveWeekStreak(memberSlots, items)` after `memberSlots` filter
- Added `streak={streak}` to `<CommitGoalRow>` props

Full vitest suite: 100/100 tests passing (was 96 before this plan; +4 new tests).

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED | `ec8505f` | PASS — 2 streak icon tests failed as expected |
| GREEN | `c5886cb` | PASS — all 4 CommitGoalRow tests passing |

## Commits

| Hash | Type | Description |
|------|------|-------------|
| `ec8505f` | test | RED — add failing tests for CommitGoalRow streak 3 states |
| `c5886cb` | feat | GREEN — implement CommitGoalRow streak prop + Column 3 icon display |
| `3af597c` | feat | Wire consecutiveWeekStreak into CommitGoalView + sync header spacer |

## Verification Results

1. `npx vitest run src/components/__tests__/CommitGoalRow.test.tsx` — 4/4 tests PASS (streak=0/1/2 + streak=1 🔥-absent)
2. `npx vitest run` — 100/100 tests PASS
3. `grep -n "streak" src/components/CommitGoalRow.tsx` — 4 hits: props type, destructuring, 2 conditional branches
4. `grep -n "w-10 shrink-0" src/components/CommitGoalView.tsx` — 1 hit (header spacer updated)
5. `grep -n "consecutiveWeekStreak" src/components/CommitGoalView.tsx` — 2 hits (import + call)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — achievement icons are fully wired. `consecutiveWeekStreak` returns live computed values from real `items` data. No placeholder text or hardcoded values.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced. All additions are pure JSX display logic and emoji literals (T-30-03, T-30-04 from threat register: accepted).

## Self-Check: PASSED

- [x] `src/components/__tests__/CommitGoalRow.test.tsx` — FOUND (created)
- [x] `src/components/CommitGoalRow.tsx` — FOUND and modified (streak prop + Column 3)
- [x] `src/components/CommitGoalView.tsx` — FOUND and modified (consecutiveWeekStreak import, streak calc, header spacer)
- [x] Commit `ec8505f` (RED) — FOUND in git log
- [x] Commit `c5886cb` (GREEN) — FOUND in git log
- [x] Commit `3af597c` (Task 3) — FOUND in git log
- [x] Full test suite 100/100 PASS
