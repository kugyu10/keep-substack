---
phase: 25-publication-id
plan: 02
subsystem: database-schema
tags: [supabase, postgres, migration, rls, trigger, live-apply, verification]
requires:
  - "member_publications migration authored in Plan 01 (supabase/migrations/20260530_add_member_publications.sql)"
provides:
  - "member_publications table + partial unique index + RLS public-select policy LIVE in production DB (project xolhjcngrwwwqtklmoyk)"
  - "Backfilled member_publications rows (one is_primary=true per member) verified at row-count parity"
  - "trg_sync_member_publications trigger verified firing on INSERT/UPDATE; ON DELETE CASCADE verified purging child rows"
  - "single-primary invariant verified enforced by uq_member_publications_one_primary against the live DB"
affects: []
tech-stack:
  added: []
  patterns:
    - "manual migration apply via Supabase SQL Editor (repo convention, not `supabase db push` — RESEARCH Pitfall 5)"
    - "live-DB post-migration verification (information_schema / pg_indexes / pg_class / pg_policies queries)"
    - "trigger behavior proven with throwaway test rows + cleanup verification"
key-files:
  created:
    - .planning/phases/25-publication-id/25-02-SUMMARY.md
  modified: []
decisions:
  - "Migration applied via Supabase SQL Editor (project xolhjcngrwwwqtklmoyk), not `supabase db push` (non-TTY prompt bug, RESEARCH Pitfall 5)"
  - "Task 3 lint deviation: `npm run lint` fails only on pre-existing errors in untouched files (.claude tooling .cjs + pre-existing src/ any/<a>/<img>); SC#3 intent (app unchanged + build/test green) satisfied — out-of-scope per scope boundary, same posture as Plan 01"
metrics:
  duration: ~6min
  completed: 2026-05-30
---

# Phase 25 Plan 02: Live Migration Apply + Verification Summary

The [BLOCKING] schema-apply step: the Plan 01 migration was applied by the human to the live Supabase database (project `xolhjcngrwwwqtklmoyk`) via the SQL Editor, then verified end-to-end with queries A–H proving SCHEMA-01 (table/columns/partial-index/RLS), SCHEMA-02 (backfill parity), and the D-08 trigger invariants (INSERT/UPDATE sync, DELETE cascade) plus the D-05 single-primary constraint — all against the real database. App code confirmed unchanged and green (Success Criteria #3).

## What Was Built

- **Task 1 (human-action, [BLOCKING]) — Live migration apply.** The human pasted the entire contents of `supabase/migrations/20260530_add_member_publications.sql` into the Supabase SQL Editor for project `xolhjcngrwwwqtklmoyk` and clicked Run. Result: **"Success. No rows returned"** with no errors. The `member_publications` table, partial unique index, RLS public-select policy, one-shot backfill, and AFTER INSERT OR UPDATE sync trigger are now live in production Postgres.

- **Task 2 (human-verify, [BLOCKING]) — Post-migration SQL verification A–H.** All eight verification queries run in the SQL Editor matched their expected outcomes (see Verification below). This proves the schema and trigger behavior against the live DB, closing the false-positive gap (build/type checks pass without the migration applied, because this app does not generate types from the live DB).

- **Task 3 (auto) — App-unchanged gate (Success Criteria #3).** Confirmed the schema phase touched zero application code and the app remains green.

## Verification

### Task 2 — Live-DB queries A–H (all PASS)

| # | Check | Requirement | Result |
|---|-------|-------------|--------|
| A | Table + columns: `id`/`member_id`/`publication_id`/`is_primary` present, all `NOT NULL` | SCHEMA-01 | PASS |
| B | Partial unique index `uq_member_publications_one_primary` with `WHERE (is_primary)` predicate exists | SCHEMA-01 / D-05 | PASS |
| C | `relrowsecurity=true`; only policy is `public select member_publications` (SELECT); no write policies | SCHEMA-01 / T-25-01 | PASS |
| D | Backfill parity: orphan count = 0; `members` count == `is_primary` count | SCHEMA-02 / D-07 | PASS |
| E | INSERT-sync trigger: throwaway member produced exactly one `is_primary=true` row | D-08 | PASS |
| F | UPDATE-sync trigger: primary row's `publication_id` followed the `members` UPDATE to `zz_phase25_test_pub2` | D-08 | PASS |
| G | DELETE cascade: deleting the member left 0 `member_publications` rows for the test ids; final cleanup check = 0 (no `zz_phase25_*` rows remain) | D-08 | PASS |
| H | Single-primary enforcement: second-primary INSERT rejected with `ERROR: 23505 duplicate key value violates unique constraint "uq_member_publications_one_primary"` (the error IS the success case) | D-05 | PASS |

All test data created in E/F was removed by G — no `zz_phase25_*` rows remain.

### Task 3 — App-unchanged gate (Success Criteria #3)

| Criterion | Result |
|-----------|--------|
| `npm run build` | exit 0 — compiled + TypeScript + 10/10 static pages generated |
| `npm test` | exit 0 — **34/34** vitest passing (7 files) |
| `git diff --name-only -- src/` | **empty** — zero app code changed by this phase |
| `grep -rn member_publications src/` | **no matches** (exit 1) — app does not read the new table this phase; boundary intact |
| `npm run lint` | fails — but ONLY on pre-existing errors in untouched files (see Deviations) |

Success Criteria #3 intent — *app code unchanged and green after the schema phase* — is **satisfied**: build green, tests green, `src/` diff empty, `member_publications` absent from `src/`.

## Deviations from Plan

### Out-of-scope (not fixed) — `npm run lint` pre-existing failures

The plan's Task 3 combined gate includes `npm run lint`, which exits non-zero. **None of the failures are caused by this phase** (`git diff --name-only -- src/` is empty; last `src/` commit is `666cdf5` from Phase 24):

- **`.claude/get-shit-done/**/*.cjs`** — the GSD tooling emits hundreds of `@typescript-eslint/no-require-imports` errors. These are vendored tooling files, never part of the app and never touched by this phase.
- **Pre-existing `src/` errors** (9, identical to those documented in Plan 01's summary): `@typescript-eslint/no-explicit-any` in `src/app/my/page.tsx`, `src/lib/articles.ts`, `src/lib/members.ts`; `@next/next/no-html-link-for-pages` in `src/app/admin/page.tsx`, `src/app/page.tsx`; `@next/next/no-img-element` warnings in `CalendarGrid.tsx`, `HeatmapRow.tsx`, `HeatmapTooltip.tsx`.

Per the scope boundary (only auto-fix issues DIRECTLY caused by the current task; this is a SQL-only phase with zero `src/` changes), these were **not** fixed. The gate's true intent — proving the app builds and tests unchanged — is met by `npm run build` + `npm test` green and an empty `src/` diff. This is the same posture Plan 01 recorded. No files were modified in Task 3 (verification-only gate).

Logged for visibility; not added to `deferred-items.md` because they are already tracked in Plan 01's SUMMARY out-of-scope section.

## Known Stubs

None. This plan applies and verifies a complete schema migration against the live DB; no placeholder values or unwired data sources introduced.

## Threat Flags

None new. Live verification confirmed the threat-register `mitigate` items hold against the real DB:
- **T-25-01** (RLS posture): Query C confirmed `relrowsecurity=true` and that the ONLY policy is `public select member_publications` (SELECT) — no write policy exposed to anon/authenticated.
- **T-25-02** (trigger write under RLS): Query E confirmed triggered writes succeed (service_role BYPASSRLS).
- **T-25-04** (no SECURITY DEFINER escalation): function is SECURITY INVOKER per the applied migration.
- **T-25-AP** (partial-apply atomicity): the BEGIN/COMMIT-wrapped migration ran with "Success. No rows returned" — atomic apply confirmed.

## Self-Check: PASSED

- FOUND: .planning/phases/25-publication-id/25-02-SUMMARY.md
- VERIFIED: supabase/migrations/20260530_add_member_publications.sql exists (applied live by human, Task 1)
- VERIFIED: `git diff --name-only -- src/` empty; `grep -rn member_publications src/` no matches (Task 3)
- VERIFIED: `npm run build` exit 0; `npm test` 34/34 pass
- This plan created no code commits (Tasks 1–2 human-executed against live DB; Task 3 verification-only) — the SUMMARY/STATE/ROADMAP doc commit is the sole artifact.
