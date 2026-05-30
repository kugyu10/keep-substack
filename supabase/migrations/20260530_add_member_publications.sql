-- Add member_publications table (parallel/additive) + backfill from members + sync trigger
-- Run this in Supabase SQL Editor BEFORE deploying the code changes

BEGIN;

-- Statement 1: member_publications table (surrogate PK for consistency with members/teams/articles)
CREATE TABLE IF NOT EXISTS member_publications (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id      UUID    NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  publication_id TEXT    UNIQUE NOT NULL,
  is_primary     BOOLEAN NOT NULL DEFAULT false
);

-- Statement 2: at most one primary per member (partial unique index, D-05)
CREATE UNIQUE INDEX IF NOT EXISTS uq_member_publications_one_primary
  ON member_publications (member_id)
  WHERE is_primary;

-- Statement 3: RLS consistent with other tables (schema.sql L48-64)
-- DROP POLICY guard required — Postgres has no CREATE POLICY IF NOT EXISTS
ALTER TABLE member_publications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public select member_publications" ON member_publications;
CREATE POLICY "public select member_publications"
  ON member_publications FOR SELECT USING (true);

-- Statement 4: one-shot backfill (migration-only, D-07) — idempotent via ON CONFLICT
INSERT INTO member_publications (member_id, publication_id, is_primary)
SELECT id, publication_id, true
FROM members
ON CONFLICT (publication_id) DO NOTHING;

-- Statement 5: sync trigger function + trigger (D-08)
-- INSERT → create primary row; UPDATE → follow-update primary row if publication_id changed.
-- No DELETE branch — handled by ON DELETE CASCADE; trigger event is AFTER INSERT OR UPDATE only.
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

  RETURN NULL; -- DELETE handled by ON DELETE CASCADE; never reached (trigger is INSERT/UPDATE only)
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_member_publications ON members;
CREATE TRIGGER trg_sync_member_publications
  AFTER INSERT OR UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION sync_member_publications();

COMMIT;
