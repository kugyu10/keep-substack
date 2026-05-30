# Phase 25: 複数publication_idスキーマ拡張 - Pattern Map

**Mapped:** 2026-05-30
**Files analyzed:** 2 (1 NEW migration, 1 APPEND to schema.sql)
**Analogs found:** 2 / 2 (both exact / role-match within the same repo)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/20260530_add_member_publications.sql` (NEW) | migration | batch / transform (DDL + one-shot backfill + trigger install) | `supabase/migrations/20260517_add_team_status.sql` (structure) + `supabase/migrations/20260516_rename_substack_id_to_publication_id.sql` (BEGIN/COMMIT + FK form) | role-match |
| `supabase/schema.sql` (APPEND) | config / schema-doc | CRUD (declarative table + index + RLS + trigger) | `member_teams` table block (L26-30) + RLS block (L48-68) within the same file | exact (self-analog) |

**Notes:**
- This is a DB-schema-only phase. No `src/` files are created or modified. `src/lib/members.ts`, `src/lib/articles.ts`, `src/lib/fetchFeed.ts` are read-only references for verification, not change targets (CONTEXT D-08, RESEARCH §Component Responsibilities).
- The migration carries the one-shot backfill INSERT (§2); `schema.sql` does NOT (fresh DB has no members — RESEARCH §5). Both carry table + index + RLS + trigger.

## Pattern Assignments

### `supabase/migrations/20260530_add_member_publications.sql` (migration, batch/transform)

**Analogs:** `supabase/migrations/20260517_add_team_status.sql` (file header + `BEGIN/COMMIT` wrapper + dual-management convention), `supabase/migrations/20260516_rename_substack_id_to_publication_id.sql` (multi-step transaction body + FK syntax).

**Header + transaction-wrapper pattern** — copy from `20260517_add_team_status.sql` lines 1-9:
```sql
-- <one-line description of what this migration does>
-- Run this in Supabase SQL Editor BEFORE deploying the code changes

BEGIN;

-- ... statements ...

COMMIT;
```
Every prior migration uses this exact header comment ("Run this in Supabase SQL Editor ...") and a single `BEGIN; ... COMMIT;` wrapper. Keep both. Do NOT use `supabase db push` (RESEARCH Pitfall 5).

**FK + ON DELETE CASCADE syntax** — copy the column/FK form from `schema.sql` `member_teams` (L26-30) and `articles` (L34):
```sql
member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE
```
`member_teams` (L27) establishes the `REFERENCES members(id) ON DELETE CASCADE` precedent that D-06 mandates reusing.

**Surrogate PK form** — copy from `members`/`teams`/`articles` (schema.sql L10, L21, L33):
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```
All existing tables use this surrogate-key idiom (RESEARCH A2 recommends it over composite PK for consistency).

**Statement ordering inside the transaction** (RESEARCH Summary + Pitfall 1):
1. `CREATE TABLE IF NOT EXISTS member_publications` (RESEARCH §1)
2. `CREATE UNIQUE INDEX IF NOT EXISTS ... WHERE is_primary` — partial unique index (RESEARCH §1, D-05)
3. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + `DROP POLICY IF EXISTS` + `CREATE POLICY ... FOR SELECT USING (true)` (RESEARCH §1)
4. Backfill `INSERT ... SELECT ... ON CONFLICT (publication_id) DO NOTHING` (RESEARCH §2, D-07) — **migration only**
5. `CREATE OR REPLACE FUNCTION sync_member_publications()` + `DROP TRIGGER IF EXISTS ...; CREATE TRIGGER ... AFTER INSERT OR UPDATE ON members` (RESEARCH §3, D-08)

**Idempotency guards** — required by schema.sql header L3 ("冪等性: 既にテーブルが存在する場合は IF NOT EXISTS でスキップ") and RESEARCH Pitfall 2:
- `CREATE TABLE IF NOT EXISTS`, `CREATE UNIQUE INDEX IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS ...; CREATE TRIGGER ...`
- Backfill: `ON CONFLICT (publication_id) DO NOTHING`
- RLS policy: `DROP POLICY IF EXISTS "..." ON ...;` before `CREATE POLICY` (Postgres has NO `CREATE POLICY IF NOT EXISTS`).

**Trigger function** — exact pattern in RESEARCH §3 (use it verbatim, adjusting only naming). Key load-bearing details:
- `AFTER INSERT OR UPDATE` only — NO DELETE branch (CASCADE handles delete; RESEARCH Anti-Patterns + D-08 verified-redundant).
- UPDATE branch guarded by `IF NEW.publication_id IS DISTINCT FROM OLD.publication_id` (NULL-safe; RESEARCH Pattern 2). This branch is defensive-only — `updateMember()` cannot change `publication_id` (RESEARCH Pitfall 4, src/lib/members.ts L78-81), but implement it correctly per D-08.
- INSERT branch uses `ON CONFLICT (publication_id) DO NOTHING` (RESEARCH §4 / A3 — flag for one-line confirm: silent vs loud collision).

---

### `supabase/schema.sql` (config / schema-doc, CRUD)

**Analog:** the same file's own `member_teams` table block and RLS block (self-analog — append in the established house style).

**Table-definition placement & style** — mirror the `CREATE TABLE IF NOT EXISTS` blocks in section "1. テーブル定義" (L9-39). Append the `member_publications` `CREATE TABLE` + partial unique index after the `articles` block (~L42), before the RLS section.

**RLS block pattern** — extend the existing block (L44-68). Add to the `ENABLE ROW LEVEL SECURITY` group (L48-51):
```sql
ALTER TABLE member_publications ENABLE ROW LEVEL SECURITY;
```
And add a public-select policy mirroring L54-64 exactly:
```sql
CREATE POLICY "public select member_publications"
  ON member_publications FOR SELECT USING (true);
```
(In schema.sql the policies have no `DROP POLICY IF EXISTS` guard because it documents a fresh setup; in the migration file, guard with `DROP POLICY IF EXISTS` for re-runnability.)

**Trigger in schema.sql** — append the §3 `CREATE OR REPLACE FUNCTION` + trigger after the RLS block (RESEARCH §5). Do NOT include the backfill INSERT (§2) here — a fresh DB has no members; the trigger populates going forward.

**Service-role note** — the existing comment (L66-68) already documents that `service_role` bypasses RLS. The sync trigger runs under that role, so triggered writes are unaffected by the new policy (RESEARCH Pitfall 3). No new comment needed beyond consistency.

---

## Shared Patterns

### Dual-management migration convention
**Source:** Established Phase 22 (CONTEXT D-09 / `20260517_add_team_status.sql`) — "new file in `supabase/migrations/`" + "append equivalent definitions to `supabase/schema.sql`".
**Apply to:** Both files in this phase. Migration carries the one-shot backfill; schema.sql carries only the durable declarative definitions (table/index/RLS/trigger).

### RLS-on-every-table + public-select policy
**Source:** `supabase/schema.sql` L48-68.
```sql
ALTER TABLE <t> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public select <t>" ON <t> FOR SELECT USING (true);
```
**Apply to:** `member_publications` in both files (CONTEXT Claude's Discretion; RESEARCH Pitfall 3). Mandatory — RLS-without-policy hides the table from anon/authenticated reads.

### ON DELETE CASCADE child-FK
**Source:** `supabase/schema.sql` L27 (`member_teams.member_id`).
```sql
member_id UUID ... REFERENCES members(id) ON DELETE CASCADE
```
**Apply to:** `member_publications.member_id` (D-06). This also makes a DELETE trigger redundant (RESEARCH Anti-Patterns, A4 verified).

### SQL Editor apply convention (not `db push`)
**Source:** Header comment in all 3 prior migrations + `schema.sql` L2 ("SQL Editor に全文貼り付けて Run").
**Apply to:** The new migration's header comment and any plan run-instructions. RESEARCH Pitfall 5: `supabase db push` prompts in non-TTY shells — do not introduce it.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | — | — | All in-scope files have a strong in-repo analog. The one novel construct — a PL/pgSQL `AFTER` sync trigger — has no codebase precedent (no triggers exist yet), but RESEARCH §3 provides verbatim drop-in SQL, so the planner should copy that block rather than a codebase analog. |

**Trigger note:** No existing trigger/function exists in the repo to copy. Use RESEARCH §3 (`sync_member_publications()`) directly — it is verified against PG 17.6 semantics. This is the only part of the phase sourced from RESEARCH rather than a codebase file.

## Metadata

**Analog search scope:** `supabase/migrations/`, `supabase/schema.sql`. (`src/` confirmed read-only / out of change scope by CONTEXT + RESEARCH.)
**Files scanned:** 3 (`20260517_add_team_status.sql`, `20260516_rename_substack_id_to_publication_id.sql`, `schema.sql`).
**Pattern extraction date:** 2026-05-30
