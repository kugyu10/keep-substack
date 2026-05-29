---
phase: 23-my-team-join
plan: 02
subsystem: web
tags: [rsc, supabase, member_teams, teams, props-contract, next-app-router]

# Dependency graph
requires:
  - phase: 23-my-team-join
    plan: 01
    provides: "name=\"teams\" + getAll('teams') field contract; status='public' as the canonical join-eligibility source"
  - phase: 22-team-status
    provides: "teams.status ('public'|'private'|'hidden') column"
provides:
  - "/my RSC fetches the member's joined teams WITH status and ALL status='public' teams"
  - "currentTeams: { name, status }[] + publicTeams: { name }[] prop contract for MyProfileForm (replaces team_names: string[])"
  - "Per-user scoped member read (.eq('user_id', user.id).maybeSingle()) preserved; unauth -> redirect('/')"
affects: [23-03-MyProfileForm-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Status-aware member JOIN flatten: map mt.teams, filter to objects with a 'name' key (mirrors members.ts getMembers)"
    - "Canonical join-able set query: admin.from('teams').select('id, name').eq('status','public').order('name'), mapped to { name }[]"

key-files:
  created: []
  modified:
    - src/app/my/page.tsx

key-decisions:
  - "currentTeams carries { name, status } so Plan 03 can render private-but-joined teams distinctly (SELF-03, D-02)"
  - "publicTeams query selects only id, name and filters status='public' — private/hidden team names never enter the rendered list (D-01, T-23-06); id is dropped in the prop since the form keys on name (Plan 01 name=\"teams\" value contract)"
  - "MyProfileForm prop-type mismatch (TS2353 on currentTeams) is intentionally left open — the form's prop type is updated in Plan 03 (wave 2); fixing it here would create a file-ownership conflict"

patterns-established:
  - "RSC supplies currentTeams + publicTeams; form keys teams on name (not id)"

requirements-completed: [SELF-01, SELF-03]

# Metrics
duration: ~5min
completed: 2026-05-30
---

# Phase 23 Plan 02: My Team Join — Page Data Summary

**The `/my` RSC now fetches the member's joined teams with status and ALL status='public' teams, passing `currentTeams: { name, status }[]` + `publicTeams: { name }[]` to MyProfileForm (replacing `team_names: string[]`) — establishing the read-side prop contract Plan 03's checkbox UI consumes, with per-user scoping and the unauth redirect intact.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-29T23:48Z
- **Completed:** 2026-05-30
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Added `status` to the member JOIN (`teams (name, status)`), keeping `.eq('user_id', user.id).maybeSingle()` verbatim (T-23-05 authorization boundary).
- Replaced the `teamNames: string[]` flatten with `currentTeams: { name, status }[]`, mapping `mt.teams` and filtering to objects with a string `name` (mirrors `members.ts` getMembers), defaulting to `[]` when `member` is null.
- Added the all-public-teams query: `admin.from('teams').select('id, name').eq('status', 'public').order('name')`, mapped to `publicTeams: { name }[]` (id dropped; default `[]`). Private/hidden teams never enter this list (T-23-06).
- Reshaped the `<MyProfileForm member={...}>` props from `team_names` to `currentTeams` + `publicTeams`, keeping `name` and `publicationId` as-is. No `team_names` / `teamNames` identifier remains.

## Prop Contract (for Plan 03)
- `currentTeams: { name: string; status: string }[]` — the member's joined teams (any status).
- `publicTeams: { name: string }[]` — ALL `status='public'` teams, name-ascending.
- Public-teams query filter: `.eq('status', 'public').order('name')`, selecting only `id, name`.

## Task Commits

1. **Task 1: Add status to the member JOIN and add the all-public-teams query** — `c74db2d` (feat)
2. **Task 2: Typecheck the reshaped RSC** — verification-only; no code change (the reshape was captured in Task 1's commit).

## Files Created/Modified
- `src/app/my/page.tsx` — member JOIN now `teams (name, status)`; `currentTeams` flatten; new `publicTeams` query; props reshaped to `currentTeams` + `publicTeams`. Auth block, `!member` → `<LinkMemberForm />` branch, page chrome, and `LogoutButton` left verbatim.

## Decisions Made
- `currentTeams` carries `{ name, status }` so Plan 03 can distinguish private-but-joined teams (SELF-03, D-02).
- `publicTeams` filters `status='public'` and exposes only `name` — no private/hidden leakage (D-01, T-23-06).
- The MyProfileForm prop-type mismatch is deferred to Plan 03 (see Deviations / Deferred).

## Deviations from Plan

None — plan executed exactly as written.

## Deferred (Expected, per Plan)
- `npx tsc --noEmit` reports exactly ONE error, in `src/app/my/page.tsx(58,13)`:
  `TS2353: Object literal may only specify known properties, and 'currentTeams' does not exist in type 'Member'.`
  This is the cross-file `<MyProfileForm member={...}>` prop-shape mismatch. The form's prop type still uses the old `team_names`-based shape and is updated in **Plan 03 (wave 2)**. page.tsx's own data logic (member flatten, publicTeams map, query chains) is well-typed — this is the only project-wide tsc error, and it is the documented, expected outstanding error this plan does NOT fix (file-ownership boundary).

## Threat Surface
- T-23-05 (IDOR on member read): mitigated — member query stays scoped `.eq('user_id', user.id).maybeSingle()`; no member identifier from request params; unauth → `redirect('/')` before any read.
- T-23-06 (public-teams leakage): mitigated — public-teams query filters `.eq('status', 'public')` and exposes only `id, name`; private/hidden never enter the list.
- No new write surface (plan is read-side only).

## Issues Encountered
None. Task 1 grep verification passed first try; tsc produced only the expected, deferred form-prop error.

## Next Phase Readiness
- The `currentTeams` / `publicTeams` prop contract is locked. Plan 03 can update `MyProfileForm`'s prop type and render the checkbox UI against it, which also closes the deferred TS2353 error.

## Self-Check: PASSED

- FOUND: src/app/my/page.tsx (reshaped)
- FOUND: .planning/phases/23-my-team-join/23-02-SUMMARY.md
- FOUND commit: c74db2d (Task 1)

---
*Phase: 23-my-team-join*
*Completed: 2026-05-30*
