---
phase: 25-publication-id
plan: 01
subsystem: database-schema
tags: [supabase, postgres, migration, rls, trigger, plpgsql]
requires: []
provides:
  - "member_publications table (parallel/additive, D-01)"
  - "partial unique index uq_member_publications_one_primary (single-primary invariant, D-05)"
  - "RLS public-select policy on member_publications"
  - "sync_member_publications() AFTER INSERT OR UPDATE trigger on members (D-08)"
  - "one-shot backfill from members (migration-only, D-07)"
affects:
  - supabase/migrations/20260530_add_member_publications.sql
  - supabase/schema.sql
tech-stack:
  added: []
  patterns:
    - "AFTER row-level trigger writing to a different table (no infinite loop)"
    - "IS DISTINCT FROM for NULL-safe change detection"
    - "partial unique index WHERE is_primary for single-primary enforcement"
    - "idempotent migration: IF NOT EXISTS / DROP POLICY IF EXISTS / CREATE OR REPLACE / ON CONFLICT DO NOTHING"
    - "dual-management convention: migration file + schema.sql mirror (backfill migration-only)"
key-files:
  created:
    - supabase/migrations/20260530_add_member_publications.sql
  modified:
    - supabase/schema.sql
decisions:
  - "Surrogate PK id UUID for member_publications (consistency with members/teams/articles, RESEARCH A2)"
  - "ON CONFLICT (publication_id) DO NOTHING in trigger INSERT — silent/resilient collision behavior (D-08, RESEARCH A3)"
  - "No DELETE trigger branch — ON DELETE CASCADE handles member deletes (D-08 verified-redundant, RESEARCH A4)"
  - "Backfill excluded from schema.sql — migration-only; trigger populates going forward (RESEARCH §5)"
metrics:
  duration: ~12min
  completed: 2026-05-30
---

# Phase 25 Plan 01: member_publications Schema + Migration Summary

DB-schema foundation for multi-publication members: a new idempotent `member_publications` table (parallel/additive per D-01) with a partial-unique single-primary index, RLS public-select, a one-shot backfill from existing `members`, and an `AFTER INSERT OR UPDATE` sync trigger — all SQL-only, zero app code touched.

## What Was Built

- **Migration `supabase/migrations/20260530_add_member_publications.sql`** (Task 1) — single `BEGIN; ... COMMIT;` transaction in mandated order: (1) `CREATE TABLE IF NOT EXISTS member_publications` with surrogate PK, `member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE`, `publication_id TEXT UNIQUE NOT NULL`, `is_primary BOOLEAN NOT NULL DEFAULT false`; (2) `CREATE UNIQUE INDEX IF NOT EXISTS uq_member_publications_one_primary ON (member_id) WHERE is_primary`; (3) RLS enable + `DROP POLICY IF EXISTS` guard + `public select` policy; (4) idempotent backfill `INSERT ... SELECT id, publication_id, true FROM members ON CONFLICT (publication_id) DO NOTHING`; (5) `sync_member_publications()` PL/pgSQL function (INSERT branch creates primary row, UPDATE branch follow-updates via `IS DISTINCT FROM`, no DELETE branch) + `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER ... AFTER INSERT OR UPDATE ON members`.

- **`supabase/schema.sql` mirror** (Task 2) — durable definitions appended in house style: table + index after the `articles` block, `ALTER TABLE member_publications ENABLE ROW LEVEL SECURITY` in the ENABLE group, `public select` policy in the policy group (no DROP POLICY guard — fresh-setup docs), and the trigger function + trigger in a new "3. Triggers" section. Backfill `INSERT ... SELECT FROM members` intentionally excluded.

## Verification

- Task 1 grep gate: prints `OK` (all required identifiers present); `BEGIN;`/`COMMIT;` each appear exactly once; FK form, backfill SELECT, no `OR DELETE` event — all confirmed.
- Task 2 identifiers present; no backfill `SELECT ... FROM members` in schema.sql; pre-existing table/policy blocks byte-for-byte unchanged (`git diff supabase/schema.sql` shows additions only, zero deletions).
- `npm run build` green; `npm test` 34/34 passing; `git diff --stat src/` empty (Success Criteria #3 — no app code touched).
- Live-DB verification (table/index/RLS/trigger actually exist and fire) is deferred to Plan 02 ([BLOCKING] manual SQL-Editor apply), per the plan.

## Deviations from Plan

### Auto-fixed / Refinements

**1. [Rule 3 - Verify-command refinement] Task 2 `! grep -q "INSERT INTO member_publications"` clause**
- **Found during:** Task 2 verification.
- **Issue:** The plan's verify command asserts schema.sql contains no `INSERT INTO member_publications` to prove the backfill is migration-only. However the durable trigger function body (which MUST be mirrored) legitimately contains `INSERT INTO member_publications (...) VALUES (NEW.id, ...)`. The coarse grep cannot distinguish the trigger's structural INSERT from a one-shot backfill INSERT, so it false-positives.
- **Resolution:** Verified the true intent precisely — `grep "FROM members"` returns NONE (no backfill `INSERT ... SELECT ... FROM members` exists in schema.sql), and the only `INSERT INTO member_publications` is inside the trigger function. The acceptance intent ("backfill must be migration-only") is fully satisfied.
- **Files modified:** None beyond the planned schema.sql edit.
- **Commit:** 560e80b

**2. [Rule 3 - Byte-for-byte preservation] ALTER TABLE alignment**
- **Found during:** Task 2.
- **Issue:** Initial edit re-padded the four pre-existing `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` lines to align the new `member_publications` line, which registered as 4 deletions in the diff — violating the "pre-existing lines byte-for-byte unchanged" acceptance criterion.
- **Resolution:** Reverted the padding on the four existing lines; the new `member_publications` ENABLE line was appended without realigning the others. `git diff supabase/schema.sql` now shows additions only.
- **Files modified:** supabase/schema.sql
- **Commit:** 560e80b

### Out-of-scope (not fixed)

- `npm run lint` reports pre-existing `@typescript-eslint/no-explicit-any` errors and `@next/next/no-img-element` warnings in `src/lib/articles.ts`, `src/lib/members.ts`, `src/components/HeatmapTooltip.tsx`. These files were not touched by this SQL-only phase (`git diff --stat src/` empty) — out of scope per the scope boundary. The plan's gate intent (prove app code compiles/tests unchanged) is met by `npm run build` + `npm test` green.

## Known Stubs

None. This is a complete schema migration; no placeholder values or unwired data sources.

## Threat Flags

None. The new table introduces RLS-governed read surface only (matching the other four tables); no new network endpoint, auth path, or dynamic-SQL injection surface. All threat-register `mitigate` items (T-25-01 RLS enable + public-select-only policy; T-25-04 no SECURITY DEFINER) are implemented as specified.

## Self-Check: PASSED

- FOUND: supabase/migrations/20260530_add_member_publications.sql
- FOUND: supabase/schema.sql (modified)
- FOUND commit: eb27f17 (Task 1)
- FOUND commit: 560e80b (Task 2)
