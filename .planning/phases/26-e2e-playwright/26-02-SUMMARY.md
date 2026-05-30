---
phase: 26-e2e-playwright
plan: 02
subsystem: testing
tags: [playwright, e2e, supabase, migrations, test-environment]

# Dependency graph
requires:
  - phase: 26-e2e-playwright (Plan 01)
    provides: ".env.test.example template and e2e/global-setup.ts (fail-fast on unset Supabase env vars) to validate the provisioned project against"
provides:
  - "A dedicated, production-isolated cloud TEST Supabase project (cloud only, no local Docker per D-04/D-06)"
  - ".env.test populated with the TEST project's real URL/anon/service_role keys (gitignored, never committed)"
  - "TEST project schema matching the app (teams.status, members.publication_id, member_publications) — applied via supabase/schema.sql"
affects: [26-e2e-playwright Plan 03 specs]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Production isolation: TEST project URL confirmed distinct from production URL before any test writes"
    - "Schema provisioning fallback: when incremental migrations cannot bootstrap a fresh project, apply the durable supabase/schema.sql mirror via the SQL Editor"

key-files:
  created: []
  modified: []

key-decisions:
  - "Applied supabase/schema.sql (the idempotent durable FINAL-schema mirror) via the Supabase SQL Editor instead of `supabase db push`, because the three incremental migrations assume a pre-existing base schema that never existed as a from-scratch migration. Goal (teams.status + members.publication_id + member_publications on TEST) achieved identically."
  - "TEST project (otydhiumsdsyxepnjqjp.supabase.co) is confirmed DIFFERENT from production (xolhjcngrwwwqtklmoyk.supabase.co) — production data fully isolated."

patterns-established:
  - "Pattern: fresh test projects bootstrap from supabase/schema.sql (the durable final-state mirror), not from incremental migrations/ that presuppose a base."

requirements-completed: [E2E-01, E2E-02, E2E-03]

# Metrics
duration: ~5min
completed: 2026-05-30
---

# Phase 26 Plan 02: TEST Supabase Project Provisioning Summary

**Dedicated production-isolated cloud TEST Supabase project provisioned with the full app schema (teams.status, members.publication_id, member_publications) applied via supabase/schema.sql, and `.env.test` populated with its keys (gitignored).**

## Performance

- **Duration:** ~5 min (close-out; human-action/human-verify steps performed out-of-band by the operator)
- **Completed:** 2026-05-30
- **Tasks:** 2 (both human checkpoints, completed by the operator)
- **Files modified:** 0 source files (files_modified: [])

## Accomplishments

- A dedicated cloud TEST Supabase project (`otydhiumsdsyxepnjqjp.supabase.co`) was provisioned, distinct from production (`xolhjcngrwwwqtklmoyk.supabase.co`) — production data is fully isolated from E2E writes/deletes (T-26-03 mitigated).
- `.env.test` populated with the TEST project's real (non-placeholder) `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`; confirmed gitignored and never committed (T-26-02 mitigated).
- The full app schema applied to the TEST project: `teams.status`, `members.publication_id`, `members.user_id`, `member_teams.member_id`, `articles.publication_id`, `member_publications.id`, and `member_publications.is_primary` are all present and queryable.
- Plan 03 specs can now run against a correct, production-isolated schema.

## Task Commits

This plan modified NO source files. Both tasks were human checkpoints (provisioning + schema apply) executed out-of-band by the operator; there are no per-task source commits.

1. **Task 1: Provision TEST Supabase project + populate .env.test (human-action)** — no source commit (`.env.test` is gitignored, never committed)
2. **Task 2: Apply schema to the TEST project (human-verify)** — no source commit (schema applied on the cloud DB, not in-repo)

**Plan metadata:** committed with this SUMMARY + STATE.md + ROADMAP.md (docs commit).

## Files Created/Modified

None in-repo. `.env.test` exists at repo root but is gitignored (intentionally never committed — it holds the TEST project secrets).

## Decisions Made

- **Bootstrap from schema.sql, not migrations:** The three migration files (`20260516_rename_substack_id_to_publication_id.sql`, `20260517_add_team_status.sql`, `20260530_add_member_publications.sql`) are incremental diffs that assume a pre-existing base schema (members/teams/member_teams/articles). That base was only ever captured in `supabase/schema.sql`, never as a from-scratch migration. On a fresh empty TEST project the durable mirror is the correct bootstrap source.
- **TEST ≠ production verified:** TEST URL (`otydhiumsdsyxepnjqjp.supabase.co`) confirmed distinct from production (`xolhjcngrwwwqtklmoyk.supabase.co`) before any test reads/writes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `supabase db push` could not bootstrap a fresh empty TEST project; applied `supabase/schema.sql` via SQL Editor instead**
- **Found during:** Task 2 (Apply migrations to the TEST project)
- **Issue:** The plan's `key_links` specified applying `supabase/migrations/` via `supabase db push --db-url`. Against a fresh empty project this FAILED with `relation "articles" does not exist`. The three migrations are INCREMENTAL diffs that presuppose a base schema (members/teams/member_teams/articles) which exists only in `supabase/schema.sql` — it was never captured as a from-scratch migration. So `db push` had no base to diff against.
- **Fix:** The operator applied `supabase/schema.sql` (the idempotent durable mirror of the FINAL schema — its header instructs pasting into the SQL Editor) via the Supabase SQL Editor. This achieves the plan's actual GOAL identically: `teams.status`, `members.publication_id`, and `member_publications` all now exist on the TEST project.
- **Files modified:** None in-repo (schema applied directly on the cloud TEST DB).
- **Verification:** Post-condition schema-check run against the TEST project printed `SCHEMA_OK` — `teams.status`, `members.publication_id`, and `member_publications.id` are all queryable. `git check-ignore .env.test` exits 0.
- **Committed in:** No source commit (cloud-side change + gitignored .env.test).

---

**Total deviations:** 1 (Rule 3 — blocking; intent preserved)
**Impact on plan:** None on the goal. The schema-provisioning mechanism changed (schema.sql via SQL Editor rather than `db push` of migrations/), but the resulting TEST-project schema is identical to what the plan required. No scope creep. Note for the future: incremental migrations in `supabase/migrations/` cannot bootstrap a fresh database — `supabase/schema.sql` is the canonical from-scratch source.

## Issues Encountered

- Incremental migrations cannot bootstrap an empty project (see Deviation 1). Resolved by applying the durable `supabase/schema.sql` mirror via the SQL Editor.

## User Setup Required

Performed by the operator as part of this plan's two human checkpoints:
- Created a dedicated TEST Supabase cloud project.
- Populated `.env.test` (gitignored) with the TEST project's `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `ADMIN_PASSWORD=test`.
- Applied `supabase/schema.sql` to the TEST project via the SQL Editor.

No further setup required for Plan 03.

## Verified Post-Conditions

- Schema-check on the TEST project: **SCHEMA_OK** (`teams.status`, `members.publication_id`, `member_publications.id` queryable; full check also confirmed `members.user_id`, `member_teams.member_id`, `articles.publication_id`, `member_publications.is_primary`).
- `git check-ignore .env.test` → exits 0 (gitignored).
- `.env.test` holds real (non-placeholder) TEST keys; TEST URL `otydhiumsdsyxepnjqjp.supabase.co` ≠ production `xolhjcngrwwwqtklmoyk.supabase.co`.

## Next Phase Readiness

- Plan 03 (E2E specs) is unblocked — a correct, production-isolated TEST schema is live and `.env.test` is in place.
- No blockers.

---
*Phase: 26-e2e-playwright*
*Completed: 2026-05-30*
