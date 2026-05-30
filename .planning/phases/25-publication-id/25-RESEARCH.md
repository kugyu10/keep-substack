# Phase 25: 複数publication_idスキーマ拡張 - Research

**Researched:** 2026-05-30
**Domain:** PostgreSQL schema migration — additive table + data backfill + PL/pgSQL sync triggers (Supabase, Postgres 17.6)
**Confidence:** HIGH

## Summary

This phase is a pure DB-schema change. It adds a `member_publications` table, backfills it from existing `members` rows, and installs PL/pgSQL triggers on `members` that keep `member_publications` in sync — all without touching application code. The "no app code change" constraint (Success Criteria #3) is **verifiably satisfiable**: `member_publications` appears nowhere in `src/` `[VERIFIED: grep -rn member_publications src/ → no matches]`, and all `members` writes in `src/lib/members.ts` go through the `members` table directly, so an `AFTER` trigger on `members` catches every write path with no code change.

The technically interesting parts are all in the trigger design and migration ordering. There is **no infinite-loop risk** — the trigger fires on `members` and writes only to `member_publications`, a different table, so it never re-triggers itself `[VERIFIED: PostgreSQL trigger semantics — triggers only re-fire on writes to the table they are attached to]`. The `UPDATE` sync path is even simpler than CONTEXT implies: `updateMember()` in the current codebase **never updates `publication_id`** (its signature is `Partial<Omit<Member, 'publicationId'>>`), so the `publication_id`-changed branch of the UPDATE trigger is defensive-only for this phase — but it should still be implemented correctly for future-proofing per D-08.

The DELETE trigger is confirmed **redundant**: `member_id UUID REFERENCES members(id) ON DELETE CASCADE` (D-04/D-06) auto-deletes child rows when a member is deleted. No DELETE trigger is needed `[VERIFIED: PostgreSQL ON DELETE CASCADE semantics + member_teams precedent in schema.sql L26-30]`.

**Primary recommendation:** One new migration file `supabase/migrations/20260530_add_member_publications.sql` wrapped in `BEGIN/COMMIT`, ordered as **(1) CREATE TABLE → (2) partial unique index + RLS → (3) backfill INSERT from members → (4) CREATE trigger function + trigger**. Append the same definitions to `supabase/schema.sql`. Apply via Supabase **SQL Editor** (the project's established convention for all 3 prior migrations), not `supabase db push`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| New `member_publications` table | Database / Storage | — | Pure schema, no app surface this phase |
| Backfill of existing data | Database / Storage | — | One-shot INSERT … SELECT inside migration |
| Write-sync (members → member_publications) | Database / Storage | — | DB trigger; intentionally NOT in app tier (D-08) so app code is untouched |
| Single-primary enforcement | Database / Storage | — | Partial unique index (D-05) — DB-level invariant, not app validation |
| Reads of publication_id | API / Backend (unchanged) | — | `src/lib/*` keep reading `members.publication_id`; out of scope this phase |

**Why DB tier owns sync (not app tier):** D-08 explicitly chooses triggers over code so `src/lib/members.ts` stays byte-for-byte unchanged, satisfying Success Criteria #3. Putting sync logic in `addMember`/`updateMember` would violate the phase boundary.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Keep `members.publication_id` as the active source of truth. `member_publications` is an additive "parallel" table for now.
- **D-02:** Do NOT re-point `articles.publication_id` FK (stays `REFERENCES members(publication_id)`).
- **D-03:** Long-term goal = one member can hold multiple publication_ids; this phase is only the schema+migration first step.
- **D-04:** Columns: `member_id UUID REFERENCES members(id) ON DELETE CASCADE`, `publication_id TEXT UNIQUE NOT NULL`, `is_primary BOOLEAN NOT NULL DEFAULT false`. PK may be composite or surrogate (planner's discretion) but **global `publication_id` UNIQUE is mandatory**.
- **D-05:** Enforce single primary per member via **partial unique index**: `CREATE UNIQUE INDEX ... ON member_publications(member_id) WHERE is_primary`.
- **D-06:** `member_id` FK uses `ON DELETE CASCADE` (same as `member_teams`).
- **D-07:** Migration INSERTs each existing `members` row with `is_primary = true`.
- **D-08:** DB trigger on `members` syncs INSERT/UPDATE/DELETE into `member_publications`. INSERT → create row `is_primary=true`; UPDATE → if `publication_id` changed, follow-update the primary row; DELETE → relies on FK CASCADE (verify redundancy).
- **D-09:** Migration = initial backfill INSERT + sync trigger creation; ongoing consistency delegated to the trigger.

### Claude's Discretion

- **Migration layout:** Follow Phase 22 pattern. New file in `supabase/migrations/` named `YYYYMMDD_add_member_publications.sql`, plus append equivalent definitions to `supabase/schema.sql`.
- **RLS:** Add `ENABLE ROW LEVEL SECURITY` + `public select` policy consistent with other tables.
- **Trigger function concrete implementation** (PL/pgSQL style, UPDATE follow condition) is planner/researcher discretion.

### Deferred Ideas (OUT OF SCOPE)

- Switching data-fetch logic to read from `member_publications` — future phase.
- Re-pointing `articles` FK to `member_publications` — future phase.
- Multi-publication display/edit UI — future phase (REQUIREMENTS §DEFERRED).
- Final removal of `members.publication_id` column — future phase.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCHEMA-01 | Add `member_publications` table so one member can hold multiple publication_ids | Table DDL in "Code Examples §1"; columns/constraints per D-04/D-05 verified against PG 17 |
| SCHEMA-02 | Provide migration script/DDL to move existing `members.publication_id` into `member_publications` (UI stays single) | Backfill `INSERT … SELECT` in "Code Examples §2"; ordering rules in "Common Pitfalls §1" |

## Project Constraints (from CLAUDE.md)

No `CLAUDE.md` found in the working directory `[VERIFIED: cat ./CLAUDE.md → empty]`. No project-skills directory found `[VERIFIED: ls .claude/skills / .agents/skills → absent]`. Constraints therefore derive entirely from CONTEXT.md decisions and established repo conventions (schema.sql header, RLS-on-all-tables, dual-management migration pattern).

## Standard Stack

This phase introduces **no new packages**. It uses only the existing Supabase Postgres database.

### Core
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| PostgreSQL (Supabase) | 17.6.1 | Target DB engine | `[VERIFIED: supabase/.temp/postgres-version → 17.6.1.121]` — supports all modern partial-index / `IS DISTINCT FROM` / PL/pgSQL syntax |
| PL/pgSQL | (bundled) | Trigger function language | Default Postgres procedural language; standard for row-sync triggers |
| Supabase CLI | 2.75.0 (installed) | Migration tooling (optional) | `[VERIFIED: supabase --version → 2.75.0]`; project linked (`.temp/project-ref`) but repo convention is SQL Editor |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| AFTER trigger sync (D-08) | App-code dual-write in `members.ts` | Violates Success Criteria #3 (changes app code) — rejected by D-08 |
| Partial unique index (D-05) | CHECK constraint / app validation | A CHECK cannot enforce "at most one true per member" across rows; partial unique index is the canonical Postgres idiom — `[CITED: postgresql.org/docs/17/indexes-partial.html]` |
| Surrogate PK `id UUID` | Composite PK `(member_id, publication_id)` | Either is acceptable per D-04. Surrogate `id` matches `members`/`teams`/`articles` style (all use `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`); composite saves a column. **Recommend surrogate `id`** for consistency with existing tables. |

**Installation:** None — no package changes.

## Package Legitimacy Audit

Not applicable — this phase installs **no external packages**. It is a SQL-only schema migration.

## Architecture Patterns

### System Architecture Diagram

```
                       App code (UNCHANGED this phase)
                       src/lib/members.ts
                         addMember()  ─┐
                         updateMember()─┼── writes ──►  members  table
                         deleteMember()─┘                  │
                         getMembers()  ── reads ──────────►│ (still reads members.publication_id)
                                                            │
                                          ┌─────────────────┴──────────────────┐
                                          │  AFTER INSERT/UPDATE/DELETE trigger │
                                          │  sync_member_publications()         │  ← NEW
                                          └─────────────────┬──────────────────┘
                                                            │ writes (DB-internal only)
                                                            ▼
                                                  member_publications  ◄── NEW table
                                                   (backfilled once at migration time)
                                                            ▲
                                          ON DELETE CASCADE │ (member delete → auto-purge)
                                          via member_id FK ─┘

   articles.publication_id ── FK ──► members(publication_id)   (UNCHANGED — D-02)
```

Data never flows from `member_publications` back to the app this phase — it is a write-only sink fed by triggers. The app continues reading `members.publication_id`.

### Component Responsibilities

| File | Change | Responsibility |
|------|--------|----------------|
| `supabase/migrations/20260530_add_member_publications.sql` | NEW | Table DDL + partial index + RLS + backfill INSERT + trigger fn + trigger, in `BEGIN/COMMIT` |
| `supabase/schema.sql` | APPEND | Mirror table/index/RLS/trigger definitions (idempotent form) for fresh-setup docs |
| `src/lib/members.ts` | NONE | Verified: triggers catch all its write paths |
| `src/lib/articles.ts` | NONE | FK preserved (D-02) |

### Pattern 1: AFTER row-level trigger writing to a different table
**What:** A `FOR EACH ROW` trigger fired `AFTER INSERT OR UPDATE` on `members`, whose function inserts/updates `member_publications`.
**When to use:** When you must keep a derived/parallel table in sync transparently to the application.
**Why AFTER (not BEFORE):** On INSERT the parent `members` row must already exist (and have committed its NEW values) before we write a child row referencing it. `AFTER` guarantees the row is fully formed. The FK on `member_id` is satisfied because the parent insert is visible within the same transaction.

### Pattern 2: Idempotent UPDATE follow-sync with `IS DISTINCT FROM`
**What:** Only act when `publication_id` actually changed: `IF NEW.publication_id IS DISTINCT FROM OLD.publication_id THEN ...`.
**Why `IS DISTINCT FROM` not `<>`:** `<>` returns NULL (falsy) if either side is NULL, silently skipping legitimate NULL→value or value→NULL transitions. `IS DISTINCT FROM` is NULL-safe and the correct idiom `[CITED: postgresql.org/docs/17/functions-comparison.html]`. (Note: `members.publication_id` is `NOT NULL`, so NULLs cannot actually occur — but the NULL-safe form is still the correct default.)

### Anti-Patterns to Avoid
- **DELETE trigger on members:** Redundant given `ON DELETE CASCADE`. Adding one risks double-handling and confusion. Verified redundant — do NOT add it (D-08 explicitly says verify redundancy → it IS redundant).
- **BEFORE trigger for the INSERT sync:** Tempting but wrong-ish here; the child INSERT into `member_publications` should happen AFTER the parent row is established. Use AFTER.
- **Re-running backfill without a guard:** A second run of the raw `INSERT … SELECT` would hit the `publication_id` UNIQUE constraint and abort. Make the backfill idempotent (see Pitfall 1).
- **No transaction wrapper:** Partial application (table created, backfill failed) leaves an inconsistent DB. Wrap in `BEGIN/COMMIT` like `20260516_rename...sql`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| "At most one primary per member" | App-side check / multi-row CHECK | Partial unique index (D-05) | DB-enforced, race-free, single statement |
| Cascade delete of child rows | DELETE trigger | `ON DELETE CASCADE` FK | Built-in, atomic, already the `member_teams` precedent |
| NULL-safe change detection | `OLD.x <> NEW.x` with manual NULL handling | `IS DISTINCT FROM` | One operator, correct for all NULL cases |
| Idempotent backfill | `SELECT … NOT EXISTS` loops in app | `INSERT … SELECT … ON CONFLICT DO NOTHING` | Single statement, re-runnable |

**Key insight:** Every invariant in this phase has a first-class Postgres construct. Writing procedural app/SQL logic for any of them is strictly worse.

## Runtime State Inventory

This is a schema-extension phase (adds a table + triggers) with a data backfill — the runtime-state audit applies because we are introducing DB-resident logic and migrating data.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `members` table rows in the linked Supabase project (`project-ref xolhjcngrwwwqtklmoyk`). Each row's `publication_id` must be backfilled into `member_publications` with `is_primary=true`. | Data migration: `INSERT … SELECT` (D-07) |
| Live service config | None. No external service (n8n, cron config, Datadog, etc.) stores `member_publications` by name. The only consumer is the Supabase Postgres DB itself. | None — verified no `member_publications` reference anywhere in `src/` `[VERIFIED: grep -rn]` |
| OS-registered state | None. No OS-level task/process references this table. | None |
| Secrets/env vars | None. No new secret or env var introduced; existing `SUPABASE_*` keys used by `createSupabaseAdminClient()` are unchanged. | None |
| Build artifacts | None. No generated types in repo reference `member_publications` (no `supabase gen types` output committed; types are hand-written in `src/lib/types.ts`). | None — adding the table does not regenerate or break any build artifact |

**Canonical question — after every repo file is updated, what runtime systems still hold old state?** Only the live Supabase database, and that is exactly what the backfill INSERT + triggers address. After the migration runs in the SQL Editor, the DB is consistent and self-maintaining via triggers.

## Common Pitfalls

### Pitfall 1: Migration statement ordering — backfill must run BEFORE trigger creation, or you double-insert
**What goes wrong:** If the trigger is created before the backfill INSERT, the backfill itself does not fire the trigger (the trigger is on `members`, not `member_publications`, and the backfill writes to `member_publications` directly) — so this specific ordering is actually safe. The real ordering hazard is the reverse intuition. The mandatory order is: **CREATE TABLE → index/RLS → backfill INSERT → CREATE trigger**. The backfill writes to `member_publications` directly and never trips the trigger.
**Why it happens:** Confusion about which table the trigger watches. The trigger watches `members`; the backfill writes `member_publications`; they do not interact.
**How to avoid:** Order as above and wrap in one transaction. The backfill is a direct write to `member_publications`, independent of the trigger.
**Warning signs:** Duplicate-key errors on `publication_id` UNIQUE during migration would indicate the backfill ran twice (re-run without `ON CONFLICT`).

### Pitfall 2: Re-running the migration (not idempotent) aborts on UNIQUE violation
**What goes wrong:** Running the SQL Editor script a second time re-executes the backfill, hitting `publication_id UNIQUE`.
**Why it happens:** Plain `INSERT … SELECT` is not idempotent.
**How to avoid:** Use `INSERT … SELECT … ON CONFLICT (publication_id) DO NOTHING`, `CREATE TABLE IF NOT EXISTS`, `CREATE UNIQUE INDEX IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, and `DROP TRIGGER IF EXISTS … ; CREATE TRIGGER …`. This matches schema.sql's stated idempotency goal (header L3: "冪等性: 既にテーブルが存在する場合は IF NOT EXISTS でスキップ"). Note RLS `CREATE POLICY` is NOT idempotent — guard with `DROP POLICY IF EXISTS` first (Postgres has no `CREATE POLICY IF NOT EXISTS`).
**Warning signs:** "duplicate key value violates unique constraint" or "policy already exists" on second run.

### Pitfall 3: RLS blocks the public SELECT or the trigger's internal write
**What goes wrong:** Enabling RLS without policies makes the table invisible to `anon`/`authenticated` reads; forgetting the pattern breaks consistency with other tables.
**Why it happens:** Postgres denies all access once RLS is enabled unless a policy permits it.
**How to avoid:** Add `ALTER TABLE member_publications ENABLE ROW LEVEL SECURITY;` + `CREATE POLICY "public select member_publications" ON member_publications FOR SELECT USING (true);` exactly like the other four tables (schema.sql L48-64). The sync trigger runs under the `members`-writing role (`service_role` via `createSupabaseAdminClient()`), which **bypasses RLS** (schema.sql L66-68 notes service_role has BYPASSRLS) — so triggered writes are unaffected by the new policy `[VERIFIED: schema.sql L66-68 + Supabase service_role BYPASSRLS]`.

### Pitfall 4: Assuming the UPDATE trigger's publication_id branch fires this phase
**What goes wrong:** Over-testing or over-designing the UPDATE→publication_id-changed path expecting it to run in normal app use.
**Why it happens:** D-08 lists UPDATE sync, but `updateMember()` signature is `Partial<Omit<Member, 'publicationId'>>` `[VERIFIED: src/lib/members.ts L78-81]` — the app literally cannot change `publication_id`. The branch is future-proofing only.
**How to avoid:** Implement the branch correctly (per D-08) but document it as defensive; do not block the phase on app-driven publication_id-change testing. Verify it with a direct SQL `UPDATE members SET publication_id=...` in validation.

### Pitfall 5: `supabase db push` prompts in non-interactive shells
**What goes wrong:** If a planner tries to automate `supabase db push`, it may hang/exit on a confirmation prompt in non-TTY contexts `[CITED: github.com/supabase/cli issues #2238, discussion #26366]`.
**Why it happens:** Known CLI behavior; `db push` does not reliably default to "yes" non-interactively.
**How to avoid:** **Follow repo convention** — apply via Supabase SQL Editor (all 3 prior migrations and schema.sql say "run in SQL Editor"). This sidesteps the issue entirely. Do not introduce `db push` in this phase.

## Code Examples

### §1: Table + partial unique index + RLS (recommended surrogate-PK form)
```sql
-- Source: D-04/D-05/D-06 + postgresql.org/docs/17/indexes-partial.html + schema.sql conventions
CREATE TABLE IF NOT EXISTS member_publications (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id      UUID    NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  publication_id TEXT    UNIQUE NOT NULL,
  is_primary     BOOLEAN NOT NULL DEFAULT false
);

-- D-05: at most one primary per member (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS uq_member_publications_one_primary
  ON member_publications (member_id)
  WHERE is_primary;

-- RLS consistent with other tables (schema.sql L48-64)
ALTER TABLE member_publications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public select member_publications" ON member_publications;
CREATE POLICY "public select member_publications"
  ON member_publications FOR SELECT USING (true);
```

### §2: Idempotent backfill (D-07)
```sql
-- Source: D-07 + PG ON CONFLICT semantics
INSERT INTO member_publications (member_id, publication_id, is_primary)
SELECT id, publication_id, true
FROM members
ON CONFLICT (publication_id) DO NOTHING;
```

### §3: Sync trigger function + trigger (D-08)
```sql
-- Source: D-08 + postgresql.org/docs/17/plpgsql-trigger.html
--          + functions-comparison.html (IS DISTINCT FROM)
CREATE OR REPLACE FUNCTION sync_member_publications()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO member_publications (member_id, publication_id, is_primary)
    VALUES (NEW.id, NEW.publication_id, true)
    ON CONFLICT (publication_id) DO NOTHING;
    RETURN NEW;

  ELSIF (TG_OP = 'UPDATE') THEN
    IF NEW.publication_id IS DISTINCT FROM OLD.publication_id THEN
      -- follow-update the member's primary row
      UPDATE member_publications
        SET publication_id = NEW.publication_id
        WHERE member_id = NEW.id AND is_primary;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL; -- DELETE handled by ON DELETE CASCADE; never reached if trigger is INSERT/UPDATE only
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_member_publications ON members;
CREATE TRIGGER trg_sync_member_publications
  AFTER INSERT OR UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION sync_member_publications();
```
**Note:** Trigger is `AFTER INSERT OR UPDATE` only — DELETE is intentionally excluded (CASCADE handles it). No infinite loop: trigger fires on `members`, writes to `member_publications` only `[VERIFIED: PG trigger re-entry only on the attached table]`.

### §4: Edge cases (verified)
- **`members.publication_id` NULL/empty:** Cannot be NULL — column is `NOT NULL UNIQUE` (schema.sql L12). Empty string `''` would be a valid distinct value and would backfill/sync fine (it is a non-NULL TEXT). No special handling needed.
- **publication_id collision against global UNIQUE during sync:** The INSERT branch uses `ON CONFLICT (publication_id) DO NOTHING`, so a collision is silently absorbed rather than aborting the member insert. Given `members.publication_id` is itself UNIQUE, a collision in `member_publications` from an INSERT can only happen if a row with that publication_id was created out-of-band — `DO NOTHING` is the safe choice. (If you instead want the member insert to fail loudly on collision, omit `ON CONFLICT`; recommend keeping `DO NOTHING` for the no-app-change resilience goal.)
- **Ordering of migration INSERT before trigger creation:** Backfill writes to `member_publications` directly and does not invoke the trigger (trigger is on `members`). Order is therefore not a correctness hazard between the two, but keep CREATE TABLE → backfill → trigger for readability and to guarantee the table exists.

### §5: schema.sql append (fresh-setup mirror)
Append the §1 + §3 blocks to `supabase/schema.sql` (after the existing RLS block, ~L64). Backfill (§2) is migration-only and should NOT be in schema.sql (a fresh DB has no members to backfill, and the trigger will populate `member_publications` as members are added). This mirrors how `20260517` added the column to both files but only the migration carried the one-shot `UPDATE`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `<>` / `!=` for change detection in triggers | `IS DISTINCT FROM` (NULL-safe) | Long-standing PG idiom | Avoids silent skip on NULL transitions |
| Enforce "one primary" via app logic / CHECK | Partial unique index `WHERE is_primary` | PG partial indexes (mature) | DB-level, race-free single-primary guarantee |

**Deprecated/outdated:** Nothing relevant. PG 17.6 supports all constructs used; no deprecated syntax involved.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Migrations are applied via Supabase **SQL Editor** (not `db push`) and should remain so | Pitfall 5 / Summary | LOW — all 3 prior migrations + schema.sql headers say "SQL Editor"; if the user actually uses `db push`, the migration SQL is identical and still works, only the apply mechanism differs |
| A2 | Surrogate `id UUID` PK is preferred over composite PK | Standard Stack / §1 | LOW — D-04 grants planner discretion; either works. Recommendation is style-consistency only |
| A3 | `ON CONFLICT (publication_id) DO NOTHING` is the desired collision behavior (silent) over loud failure | §4 edge cases | MEDIUM — if the user wants member inserts to fail on a publication_id already present in member_publications, omit ON CONFLICT in the trigger INSERT. Worth a one-line confirmation in planning. |
| A4 | The DELETE trigger is truly redundant (CASCADE suffices) | Summary / Anti-Patterns | LOW — verified via FK semantics + member_teams precedent; D-08 asked planner to confirm → confirmed redundant |

## Open Questions

1. **Collision behavior on trigger INSERT (silent vs loud).**
   - What we know: `ON CONFLICT DO NOTHING` keeps member inserts resilient; omitting it makes them fail on collision.
   - What's unclear: which the user prefers (A3).
   - Recommendation: default to `DO NOTHING` (matches "don't change app behavior" spirit); flag in plan for a quick confirm.

2. **Should schema.sql include the backfill?**
   - What we know: backfill is meaningless on a fresh DB (no members yet); the trigger populates going forward.
   - Recommendation: backfill in migration only; table+index+RLS+trigger in both files. Documented in §5.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL (Supabase) | The entire phase | ✓ (linked project) | 17.6.1 | — |
| Supabase SQL Editor | Applying the migration | ✓ (web console, project xolhjcngrwwwqtklmoyk) | — | `supabase db push` (avoid — Pitfall 5) |
| Supabase CLI | Optional migration apply | ✓ | 2.75.0 | SQL Editor (preferred) |
| Node/vitest | Validation tests (if added) | ✓ | vitest (`npm test` → `vitest run`) | manual SQL verification queries |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None blocking.

## Validation Architecture

`nyquist_validation` is enabled (`config.json workflow.nyquist_validation: true`). However, the existing vitest suite mocks Supabase (`fetchFeed.test.ts`, `updateMyProfileAction.test.ts`) and there is **no DB-integration test harness** in the repo — tests do not hit a live Postgres. The trigger/migration behavior is therefore best validated by **SQL verification queries run in the SQL Editor after applying the migration**, plus a build/lint gate to prove app code is unchanged.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (`npm test` → `vitest run`) `[VERIFIED: package.json L10]` |
| Config file | none dedicated — vitest defaults; tests in `src/**/__tests__` |
| Quick run command | `npm test` |
| Full suite command | `npm test` |
| DB integration harness | **none** — existing tests mock Supabase (Wave 0 gap if DB-level assertions wanted) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command / Verification | File Exists? |
|--------|----------|-----------|----------------------------------|-------------|
| SCHEMA-01 | `member_publications` table + columns + partial unique index + RLS exist | manual SQL (post-migrate) | `\d member_publications` / `SELECT * FROM pg_indexes WHERE tablename='member_publications';` in SQL Editor | ❌ manual |
| SCHEMA-01 | At most one `is_primary=true` per member enforced | manual SQL | Insert 2nd primary for same member → expect unique-violation error | ❌ manual |
| SCHEMA-02 | Every existing `members` row has a matching `is_primary` row | manual SQL | `SELECT count(*) FROM members m LEFT JOIN member_publications mp ON mp.member_id=m.id AND mp.is_primary WHERE mp.id IS NULL;` → expect `0` | ❌ manual |
| SC#3 | App builds & runs unchanged | automated | `npm run build && npm test && npm run lint` (all green, no src diff) | ✅ existing |
| D-08 INSERT sync | New member → primary row auto-created | manual SQL | `INSERT INTO members(...); SELECT * FROM member_publications WHERE ...;` | ❌ manual |
| D-08 UPDATE sync | `UPDATE members SET publication_id` → primary row follows | manual SQL | direct SQL update + select | ❌ manual |
| D-08 DELETE/CASCADE | Deleting member purges its publication rows | manual SQL | `DELETE FROM members WHERE id=...; SELECT count(*) ...;` → `0` | ❌ manual |

### Sampling Rate
- **Per task commit:** `npm run build` (proves app compiles unchanged) + `npm test`.
- **Per wave merge:** full `npm test` + `npm run lint`.
- **Phase gate:** Migration applied in SQL Editor + the SCHEMA-01/02/D-08 manual SQL verification queries above all pass; full vitest suite green; `git diff src/` shows zero changes to app code.

### Wave 0 Gaps
- [ ] Decide whether to add a DB-integration test (would require a real/test Postgres + un-mocked Supabase). **Recommendation: not worth it for this additive phase** — the manual SQL verification queries cover the invariants, and Success Criteria #3 is best proven by `git diff src/` + build. If desired later, a `member_publications.sql.test` against a local `supabase start` instance is the path.
- [ ] If automated assertion of the migration is wanted, add a script that runs the verification SELECTs and exits non-zero on mismatch (psql/`supabase db ...`).

*If no DB harness is added: "None — manual SQL verification + build/lint/test gate covers all phase requirements."*

## Security Domain

`security_enforcement` not present in config (treated as enabled). This phase's security surface is narrow (schema only, no auth/network change).

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth change |
| V3 Session Management | no | No session change |
| V4 Access Control | yes | RLS `ENABLE ROW LEVEL SECURITY` + `public select` policy on `member_publications`, matching the other tables; writes only via `service_role` (BYPASSRLS) |
| V5 Input Validation | no | No app input path added; DB constraints (UNIQUE, NOT NULL, FK) enforce integrity |
| V6 Cryptography | no | None |

### Known Threat Patterns for Supabase Postgres + RLS
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| RLS-disabled table leaks/allows writes to `anon` | Information Disclosure / Tampering | Enable RLS + scoped `public select`-only policy (no anon write policy) — Pitfall 3 |
| Trigger writes blocked by RLS | Denial of Service | service_role BYPASSRLS confirmed (schema.sql L66-68) — triggered writes unaffected |
| SQL injection | Tampering | N/A — no dynamic SQL; trigger uses static statements, no string concatenation |

## Sources

### Primary (HIGH confidence)
- Codebase: `supabase/schema.sql`, `supabase/migrations/20260516_*.sql`, `20260517_add_team_status.sql`, `src/lib/members.ts`, `src/lib/articles.ts`, `package.json`, `supabase/.temp/postgres-version` (17.6.1) — all `[VERIFIED]` via Read/Bash this session.
- `grep -rn member_publications src/` → no matches `[VERIFIED]` (confirms no app code reads the new table → SC#3 achievable).
- postgresql.org/docs/17 — partial indexes (`indexes-partial`), PL/pgSQL triggers (`plpgsql-trigger`), comparison functions / `IS DISTINCT FROM` (`functions-comparison`), `ON DELETE CASCADE`. `[CITED]`

### Secondary (MEDIUM confidence)
- Supabase docs: `supabase db push` non-interactive behavior + CI env vars — `[CITED: supabase.com/docs/guides/deployment/database-migrations]`

### Tertiary (LOW confidence)
- github.com/supabase/cli issues #2238, discussions #26366 — `db push` prompt-in-non-TTY bug. `[CITED]` (informs the recommendation to keep using SQL Editor)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no packages; Postgres 17.6 verified; all constructs are stable core SQL/PL/pgSQL.
- Architecture: HIGH — trigger pattern, CASCADE redundancy, and no-loop guarantee verified from semantics + codebase precedent (`member_teams`).
- Pitfalls: HIGH — ordering/idempotency/RLS verified against repo conventions; one MEDIUM open question (collision behavior, A3) flagged for confirmation.

**Research date:** 2026-05-30
**Valid until:** 2026-06-29 (stable — schema/SQL constructs do not churn; only Supabase CLI apply mechanics could shift)
