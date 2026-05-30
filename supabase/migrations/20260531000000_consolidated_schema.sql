-- Consolidated schema migration (single source of truth for `supabase/migrations/`).
--
-- WHY: the previous migrations/ files were incremental patches that assumed the
-- base schema (from schema.sql) already existed, so Supabase branching/Preview —
-- which replays migrations against an EMPTY database — failed on the first
-- `ALTER TABLE articles ...` (relation does not exist). This migration defines
-- the FINAL schema state directly, so a fresh DB is fully built by this one file.
--
-- IDEMPOTENT: every statement is guarded (IF NOT EXISTS / ADD COLUMN IF NOT
-- EXISTS / DROP ... IF EXISTS / CREATE OR REPLACE), so it is safe to run against
-- a brand-new Preview DB and to re-apply against the existing production DB.
-- Mirrors supabase/schema.sql — keep the two in sync.

BEGIN;

-- ============================================================
-- 1. Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS members (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT        NOT NULL,
  publication_id TEXT        UNIQUE NOT NULL,
  image_url      TEXT,
  added_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id        UUID        REFERENCES auth.users(id) UNIQUE
);
-- Reconcile older databases that predate these columns.
ALTER TABLE members ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) UNIQUE;

CREATE TABLE IF NOT EXISTS teams (
  id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name   TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'public' CHECK (status IN ('public', 'private', 'hidden'))
);
-- Reconcile older databases: add status column + value constraint if missing.
ALTER TABLE teams ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'public';
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_status_check;
ALTER TABLE teams ADD CONSTRAINT teams_status_check
  CHECK (status IN ('public', 'private', 'hidden'));

CREATE TABLE IF NOT EXISTS member_teams (
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  team_id   UUID REFERENCES teams(id)   ON DELETE CASCADE,
  PRIMARY KEY (member_id, team_id)
);

CREATE TABLE IF NOT EXISTS articles (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id TEXT        NOT NULL REFERENCES members(publication_id) ON DELETE CASCADE,
  title          TEXT,
  link           TEXT        UNIQUE NOT NULL,
  pub_date       TIMESTAMPTZ,
  image_url      TEXT
);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE TABLE IF NOT EXISTS member_publications (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id      UUID    NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  publication_id TEXT    UNIQUE NOT NULL,
  is_primary     BOOLEAN NOT NULL DEFAULT false
);

-- At most one primary publication per member.
CREATE UNIQUE INDEX IF NOT EXISTS uq_member_publications_one_primary
  ON member_publications (member_id)
  WHERE is_primary;

-- ============================================================
-- 2. Row Level Security
-- ============================================================

ALTER TABLE members             ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams               ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_teams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_publications ENABLE ROW LEVEL SECURITY;

-- anon / authenticated: SELECT 全件許可（公開データ）。
-- DROP POLICY guard required — Postgres has no CREATE POLICY IF NOT EXISTS.
DROP POLICY IF EXISTS "public select members" ON members;
CREATE POLICY "public select members"
  ON members FOR SELECT USING (true);

DROP POLICY IF EXISTS "public select teams" ON teams;
CREATE POLICY "public select teams"
  ON teams FOR SELECT USING (true);

DROP POLICY IF EXISTS "public select member_teams" ON member_teams;
CREATE POLICY "public select member_teams"
  ON member_teams FOR SELECT USING (true);

DROP POLICY IF EXISTS "public select articles" ON articles;
CREATE POLICY "public select articles"
  ON articles FOR SELECT USING (true);

DROP POLICY IF EXISTS "public select member_publications" ON member_publications;
CREATE POLICY "public select member_publications"
  ON member_publications FOR SELECT USING (true);

-- service_role bypasses RLS (BYPASSRLS) — no extra policy needed for Cron/admin.

-- ============================================================
-- 3. Backfill member_publications from members (idempotent)
-- ============================================================

INSERT INTO member_publications (member_id, publication_id, is_primary)
SELECT id, publication_id, true
FROM members
ON CONFLICT (publication_id) DO NOTHING;

-- ============================================================
-- 4. Triggers — members → member_publications sync
-- ============================================================

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
      UPDATE member_publications
        SET publication_id = NEW.publication_id
        WHERE member_id = NEW.id AND is_primary;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_member_publications ON members;
CREATE TRIGGER trg_sync_member_publications
  AFTER INSERT OR UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION sync_member_publications();

COMMIT;
