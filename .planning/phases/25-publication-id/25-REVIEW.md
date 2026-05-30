---
phase: 25-publication-id
reviewed: 2026-05-30T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - supabase/migrations/20260530_add_member_publications.sql
  - supabase/schema.sql
findings:
  critical: 1
  warning: 4
  info: 2
  total: 7
status: issues_found
---

# Phase 25: Code Review Report

**Reviewed:** 2026-05-30T00:00:00Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Reviewed the two DB-schema artifacts for Phase 25: the new idempotent migration
(`20260530_add_member_publications.sql`) and the mirrored durable definitions
appended to `supabase/schema.sql`. Both files are well-structured, transaction-
wrapped, and follow the established house conventions (IF NOT EXISTS guards,
DROP POLICY/DROP TRIGGER re-runnability, surrogate PK, ON DELETE CASCADE child FK).
The partial unique index, RLS posture, and "no DELETE branch" reasoning are sound.

However, the `ON CONFLICT (publication_id) DO NOTHING` resilience pattern — used in
both the backfill and the trigger INSERT branch — silently breaks the system's
stated row-count-parity invariant ("every member has exactly one primary
publication row") whenever a `publication_id` value collides. Combined with the
trigger's UPDATE branch, which updates zero rows when a member has no primary row,
this produces silent, hard-to-detect data divergence between `members` and
`member_publications`. That is the core concern below. There is also a real
data-loss scenario when the trigger UPDATE branch fails to follow a
`publication_id` change because the prior INSERT silently dropped the primary row.

## Critical Issues

### CR-01: Trigger INSERT `ON CONFLICT DO NOTHING` silently violates the one-primary-per-member invariant (data divergence)

**File:** `supabase/migrations/20260530_add_member_publications.sql:38-42`
**File:** `supabase/schema.sql:96-100`
**Issue:**
The INSERT branch swallows conflicts on `publication_id`:

```sql
INSERT INTO member_publications (member_id, publication_id, is_primary)
VALUES (NEW.id, NEW.publication_id, true)
ON CONFLICT (publication_id) DO NOTHING;
```

`publication_id` is `UNIQUE` in `member_publications`. If a row with the same
`publication_id` already exists (for example, left over from a deleted-then-
re-created member, a manual fix-up, or a previous backfill row whose `member_id`
no longer matches), the INSERT does nothing — and the newly-inserted `members`
row gets **no** primary `member_publications` row. The system's documented
invariant (VALIDATION query D: "every member has a primary publication row";
`is_primary` exactly-one) is silently violated, and no error is raised to the
caller. `members.publication_id` is itself `UNIQUE`, so in the normal path a
collision should not happen — but the trigger is the durable guarantor of the
invariant and must not silently no-op on the one event (INSERT of a brand-new
member) where it is the sole writer of the child row. This is the worst case
because the orphaned/missing row is invisible until someone runs the parity query.

A `DO NOTHING` on the *member_id*-conflict would be defensible (re-fire safety);
a `DO NOTHING` on a *publication_id* collision belonging to a different member is
silent data loss of the invariant.

**Fix:** Make the conflict target the natural idempotency key (the member's
primary row), and let a genuine cross-member `publication_id` collision surface
as an error rather than be swallowed. Because `publication_id` is globally unique
in this table, the only safe silent-ignore is when the *same* member already owns
the row:

```sql
INSERT INTO member_publications (member_id, publication_id, is_primary)
VALUES (NEW.id, NEW.publication_id, true)
ON CONFLICT (publication_id) DO UPDATE
  SET member_id = EXCLUDED.member_id
  WHERE member_publications.member_id = EXCLUDED.member_id;
```

or, if a colliding `publication_id` should be treated as a hard error (preferred
for an invariant guarantor), drop the `ON CONFLICT` entirely so the UNIQUE
violation aborts the offending `members` INSERT. Decide explicitly (this was
flagged "Claude's Discretion / flag for one-line confirm" in PATTERNS — the
silent choice has not been validated against the invariant).

## Warnings

### WR-01: Trigger UPDATE branch updates zero rows when the member has no primary row (silent drift / lost follow-update)

**File:** `supabase/migrations/20260530_add_member_publications.sql:44-50`
**File:** `supabase/schema.sql:102-107`
**Issue:**
The UPDATE branch only touches an existing primary row:

```sql
UPDATE member_publications
  SET publication_id = NEW.publication_id
  WHERE member_id = NEW.id AND is_primary;
```

If that member has no `is_primary` row (which is exactly the state CR-01 can
leave behind, or any state where the backfill skipped the member via
`ON CONFLICT DO NOTHING`), this UPDATE affects 0 rows and returns silently. The
`members.publication_id` change is then NOT reflected in `member_publications`,
and the two tables diverge with no error. The branches are also asymmetric:
INSERT creates a row, UPDATE assumes one exists. A robust sync would upsert.

**Fix:** Make the UPDATE self-heal by inserting the primary row when absent:

```sql
ELSIF (TG_OP = 'UPDATE') THEN
  IF NEW.publication_id IS DISTINCT FROM OLD.publication_id THEN
    UPDATE member_publications
      SET publication_id = NEW.publication_id
      WHERE member_id = NEW.id AND is_primary;
    IF NOT FOUND THEN
      INSERT INTO member_publications (member_id, publication_id, is_primary)
      VALUES (NEW.id, NEW.publication_id, true);
    END IF;
  END IF;
  RETURN NEW;
```

### WR-02: Backfill `ON CONFLICT (publication_id) DO NOTHING` can leave existing members without a primary row

**File:** `supabase/migrations/20260530_add_member_publications.sql:27-30`
**Issue:**
```sql
INSERT INTO member_publications (member_id, publication_id, is_primary)
SELECT id, publication_id, true
FROM members
ON CONFLICT (publication_id) DO NOTHING;
```

On a clean first run this is correct (member.publication_id is unique, table is
empty). But the migration is explicitly designed to be re-run, and the trigger
fires *during* the same transaction is not the issue — rather, on any re-run
where a `member_publications` row already exists with that `publication_id` but a
**different** `member_id` (e.g., a member was deleted and re-created with a reused
publication_id, or a prior manual edit), the backfill silently skips that member,
who then has no primary row. VALIDATION query D would catch it, but the migration
itself reports success. Same root cause as CR-01.

**Fix:** Either target the member identity in the conflict clause, or after the
backfill add an assertion that fails loudly if parity is broken:

```sql
-- after the backfill INSERT, inside the same transaction:
DO $$
DECLARE missing int;
BEGIN
  SELECT count(*) INTO missing
  FROM members m
  LEFT JOIN member_publications mp
    ON mp.member_id = m.id AND mp.is_primary
  WHERE mp.id IS NULL;
  IF missing > 0 THEN
    RAISE EXCEPTION 'backfill incomplete: % members lack a primary publication row', missing;
  END IF;
END $$;
```

### WR-03: `members.publication_id` UPDATE propagates to `member_publications` but breaks `articles` FK (no ON UPDATE CASCADE)

**File:** `supabase/schema.sql:34` (pre-existing FK) interacting with `supabase/schema.sql:102-107` (new trigger)
**Issue:**
`articles.publication_id` is `NOT NULL REFERENCES members(publication_id) ON DELETE CASCADE` — there is **no** `ON UPDATE CASCADE`. The new trigger explicitly supports changing `members.publication_id` (UPDATE branch follows the change into `member_publications`). But if `members.publication_id` is ever updated, the referencing `articles` rows will block the UPDATE with a foreign-key violation (`update or delete on table "members" violates foreign key constraint` on articles) — unless `articles` is empty for that member. The trigger's UPDATE branch is therefore dead code in any DB that has articles, and the phase introduces a sync path that the existing FK forbids. PATTERNS notes `updateMember()` cannot currently change `publication_id`, so this is latent, but the trigger advertises a capability the schema cannot honor.

**Fix:** Document the constraint explicitly, or if `publication_id` updates are intended to be supported end-to-end, add `ON UPDATE CASCADE` to the `articles` FK (a separate, deliberate decision). At minimum add a comment on the UPDATE branch noting it is unreachable while the `articles` FK lacks `ON UPDATE CASCADE`, to prevent a future caller from assuming the path works.

### WR-04: schema.sql and migration are not byte-identical for the durable definitions, risking drift

**File:** `supabase/schema.sql:44-49` vs `supabase/migrations/20260530_add_member_publications.sql:7-12`
**Issue:**
The dual-management convention relies on the migration and schema.sql carrying
identical durable definitions (everything except the backfill). They currently
match in behavior, but schema.sql's `member_publications` RLS policy has **no**
`DROP POLICY IF EXISTS` guard (schema.sql:79-80), while the migration does
(migration:22). This is intentional per PATTERNS (schema.sql documents fresh
setup), but it means re-running schema.sql against an existing DB errors on
`CREATE POLICY` ("policy already exists") — contradicting the file's own header
claim of idempotency (schema.sql:3, "冪等性: ... IF NOT EXISTS でスキップ").
The header promises idempotency the policy statements do not deliver.

**Fix:** Either add `DROP POLICY IF EXISTS` guards to schema.sql's CREATE POLICY
statements (making the whole file truly re-runnable, consistent with its header),
or amend the header comment to clarify that schema.sql is fresh-setup-only and the
migration files are the re-runnable artifacts. Recommend the former for
consistency with the stated idempotency contract.

## Info

### IN-01: `RETURN NULL` in an AFTER trigger is misleading (return value ignored)

**File:** `supabase/migrations/20260530_add_member_publications.sql:54`
**File:** `supabase/schema.sql:111`
**Issue:**
The function ends with `RETURN NULL`. For an `AFTER ... FOR EACH ROW` trigger the
return value is ignored entirely (only BEFORE triggers and INSTEAD OF triggers act
on it). The inline comment correctly says it is "never reached," but `RETURN NULL`
in an AFTER trigger can mislead a reader into thinking it suppresses the row (which
is only true for BEFORE triggers). Harmless, but worth a clarifying note.

**Fix:** Keep `RETURN NULL` (it is a conventional fall-through) but consider a
comment: `-- AFTER trigger: return value is ignored by Postgres`.

### IN-02: Migration lacks a `search_path` pin on the trigger function (defense-in-depth)

**File:** `supabase/migrations/20260530_add_member_publications.sql:35-56`
**File:** `supabase/schema.sql:93-113`
**Issue:**
`sync_member_publications()` is `SECURITY INVOKER` (the safe default — confirmed in
VALIDATION T-25-04), so privilege escalation is not a concern here. As a
hardening nicety, trigger/functions are commonly pinned with
`SET search_path = public` to make object resolution deterministic regardless of
the caller's `search_path`. Not required given SECURITY INVOKER + static SQL, but
standard hardening for functions that write to tables.

**Fix (optional):**
```sql
CREATE OR REPLACE FUNCTION sync_member_publications()
RETURNS TRIGGER
SET search_path = public
AS $$ ... $$ LANGUAGE plpgsql;
```

---

_Reviewed: 2026-05-30T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
