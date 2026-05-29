---
phase: 23-my-team-join
plan: 01
subsystem: api
tags: [server-action, supabase, member_teams, security, vitest, formdata]

# Dependency graph
requires:
  - phase: 22-team-status
    provides: "teams.status ('public'|'private'|'hidden') column as the canonical join-eligibility source"
provides:
  - "updateMyProfileAction reconciles public-team membership only via formData.getAll('teams')"
  - "Field contract for Plan 02 form: checkbox inputs use name=\"teams\", read with getAll"
  - "Scoped member_teams delete (.in('team_id', publicTeamIds)) that preserves private/hidden rows"
  - "Unit test suite proving join/leave/ignore-non-public/scoped-delete/auth/name-required behaviors"
affects: [23-02-page-data, 23-03-MyProfileForm-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Public-team validation: filter submitted names against teams WHERE status='public' (D-08)"
    - "Scoped delete-then-insert reconcile narrowed by .in('team_id', publicTeamIds) (D-09)"
    - "Server-action security: member resolved via auth.getUser() -> members.eq('user_id'), no client member_id"
    - "Server-action unit tests via chainable vi.fn() Supabase admin mock + real FormData"

key-files:
  created:
    - src/app/my/__tests__/updateMyProfileAction.test.ts
  modified:
    - src/app/my/actions.ts

key-decisions:
  - "Non-public submitted names are silently ignored — no free-creation teams upsert (D-08)"
  - "member_teams delete scoped via .in('team_id', publicTeamIds); skipped entirely when no public teams exist to avoid a harmful broad delete (D-09)"
  - "Auth failure returns exact JP copy 'ログインセッションが切れました。再ログインしてください' with zero writes"

patterns-established:
  - "name=\"teams\" + formData.getAll('teams') is the form/action field contract Plan 02 must honor"
  - "Chainable Supabase admin mock pattern for server-action unit tests (per-table from() routing with captured spies)"

requirements-completed: [SELF-02]

# Metrics
duration: ~15min
completed: 2026-05-30
---

# Phase 23 Plan 01: My Team Join Summary

**updateMyProfileAction now self-manages public-team membership only — validating submitted names against status='public' teams and reconciling member_teams with a scoped delete-then-insert that never touches private/hidden rows, proven by a 6-case unit suite.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-30T08:44Z (Task 1 prior session) / 08:46Z (Task 2 this session)
- **Completed:** 2026-05-30T08:47Z
- **Tasks:** 2
- **Files modified:** 2 (1 modified, 1 created)

## Accomplishments
- Rewrote `updateMyProfileAction` to read checked teams via `formData.getAll('teams')` and validate against `status='public'` teams (SELF-02, D-07/D-08).
- Removed free-creation `teams` upsert and the legacy `teamNamesRaw` comma parse — non-public names are now silently ignored.
- Scoped the `member_teams` delete with `.in('team_id', publicTeamIds)` so private/hidden membership survives any save (D-09).
- Added a 6-case unit suite proving join, leave, ignore-non-public, scoped-delete, auth-fail (exact JP string, zero writes), and name-required (exact JP string, zero writes).

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite updateMyProfileAction to reconcile public-team membership only** - `53e9cb4` (feat) — completed in prior session, verified this session
2. **Task 2: Unit tests for updateMyProfileAction reconcile + security** - `bf36ec9` (test)

_Note: Task 1 was a TDD task whose implementation landed in a single feat commit; tests for it are Task 2 (`bf36ec9`)._

## Files Created/Modified
- `src/app/my/actions.ts` - `updateMyProfileAction` rewritten: getAll('teams') contract, public-set validation, scoped delete, allowed-only insert. `linkMemberAction` untouched.
- `src/app/my/__tests__/updateMyProfileAction.test.ts` - 6 unit tests with a chainable Supabase admin mock and real FormData.

## Decisions Made
- Non-public submitted names are filtered out, not created (D-08) — closes the elevation-of-privilege threat T-23-01.
- Delete is scoped with `.in('team_id', publicTeamIds)` and skipped when there are no public teams, never a bare member-only delete (D-09) — closes tampering threat T-23-02.
- Auth and name-required paths return exact JP copy and perform zero writes.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. Task 1 was already committed and verified (`53e9cb4`); the Task 2 tests passed on first run (6/6 green) against the existing implementation, and `tsc --noEmit` is clean for both plan files.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The `name="teams"` + `getAll('teams')` field contract is locked; Plan 02 (page data) and Plan 03 (MyProfileForm checkbox UI) can build the form against it.
- Public-team validation and scoped reconcile are in place; no blockers.

## Self-Check: PASSED

- FOUND: src/app/my/actions.ts
- FOUND: src/app/my/__tests__/updateMyProfileAction.test.ts
- FOUND: .planning/phases/23-my-team-join/23-01-SUMMARY.md
- FOUND commit: 53e9cb4 (Task 1)
- FOUND commit: bf36ec9 (Task 2)

---
*Phase: 23-my-team-join*
*Completed: 2026-05-30*
