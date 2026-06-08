---
phase: 34-ui-polish
plan: "01"
subsystem: types/data-layer
tags: [member-type, hasUser, getMembers, typescript]
dependency_graph:
  requires: []
  provides: [Member.hasUser boolean field, getMembers() populates hasUser]
  affects: [src/lib/types.ts, src/lib/members.ts, all Member fixtures in tests]
tech_stack:
  added: []
  patterns: [hasUser derived from user_id IS NOT NULL]
key_files:
  created: []
  modified:
    - src/lib/types.ts
    - src/lib/members.ts
    - src/lib/__tests__/members.test.ts
    - src/lib/__tests__/commitUtils.test.ts
    - src/lib/__tests__/fetchFeed.test.ts
    - src/components/__tests__/CommitGoalRow.test.tsx
    - src/app/__tests__/page.test.tsx
    - src/app/admin/teams/__tests__/teamPage.test.tsx
    - src/app/daily/__tests__/page.test.tsx
decisions:
  - hasUser is required (not optional) to force TypeScript to catch all construction sites
  - addMember() Omit extended to exclude hasUser since it is DB-computed, not user-supplied
metrics:
  duration: ~6 minutes
  completed: 2026-06-08
  tasks_completed: 2
  files_modified: 9
---

# Phase 34 Plan 01: Add hasUser to Member Type Summary

Member.hasUser boolean field added to types.ts and populated from members.user_id in getMembers(); all test fixtures updated; npm test 128/128 pass.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add hasUser to Member type and update getMembers() | 842c9f4 | src/lib/types.ts, src/lib/members.ts |
| 2 | Fix all Member fixture TypeScript errors from hasUser cascade | 064203e | 7 test files + members.ts |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| hasUser: boolean (required, not optional) | TypeScript must catch every Member construction site — optional would allow silent omissions in sort logic |
| addMember() Omit extended to exclude hasUser | hasUser is a DB-computed field derived from user_id; callers should not supply it |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed addMember() Omit type in members.ts**
- **Found during:** Task 2 (tsc --noEmit revealed src/app/admin/actions.ts error)
- **Issue:** addMember() parameter type was `Omit<Member, 'addedAt' | 'id'>` which now requires hasUser — but hasUser is a DB-computed field, not user input
- **Fix:** Extended Omit to `Omit<Member, 'addedAt' | 'id' | 'hasUser'>`
- **Files modified:** src/lib/members.ts
- **Commit:** 064203e

**2. [Rule 2 - Missing coverage] Additional test fixtures not listed in plan**
- **Found during:** Task 2 (tsc --noEmit revealed more files than plan listed)
- **Issue:** Plan listed 4 test files; tsc found 3 additional: src/app/admin/teams/__tests__/teamPage.test.tsx, src/app/daily/__tests__/page.test.tsx, src/lib/__tests__/fetchFeed.test.ts
- **Fix:** Added hasUser: true to member() fixtures in all 3 additional files
- **Files modified:** teamPage.test.tsx, daily/page.test.tsx, fetchFeed.test.ts
- **Commit:** 064203e

### Pre-existing TypeScript Errors (Out of Scope)

Two pre-existing TS errors remain unrelated to this plan (not caused by hasUser):
- `src/app/__tests__/page.test.tsx(113)` — SupabaseClient mock cast issue (predates this plan)
- `src/lib/__tests__/saveArticles.test.ts` — Tuple type issues (predates this plan)

These are logged to deferred-items and not fixed here per scope boundary rules.

## Verification Results

- npm test: 128/128 passed (zero regressions)
- `grep -c "hasUser: boolean" src/lib/types.ts` → 1
- `grep -c "user_id" src/lib/members.ts` → 2 (SELECT + mapper)
- `grep -c "hasUser:" src/lib/__tests__/commitUtils.test.ts` → 1
- tsc --noEmit: 0 hasUser-related errors (remaining errors are pre-existing)

## Known Stubs

None — hasUser is fully wired from DB to Member type.

## Threat Flags

None — hasUser is a boolean flag with no PII; T-34-01-01 (accept) disposition confirmed.

## Self-Check: PASSED

- src/lib/types.ts exists with hasUser: boolean field
- src/lib/members.ts contains user_id in SELECT and hasUser: !!m.user_id in mapper
- Commits 842c9f4 and 064203e exist in git log
- 128 tests pass
