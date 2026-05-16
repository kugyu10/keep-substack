-- Rename substack_id to publication_id in members and articles tables
-- Run this in Supabase SQL Editor BEFORE deploying the code changes

BEGIN;

-- 1. Drop dependent constraints/indexes first
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_substack_id_fkey;

-- 2. Rename column in members
ALTER TABLE members RENAME COLUMN substack_id TO publication_id;

-- 3. Rename column in articles
ALTER TABLE articles RENAME COLUMN substack_id TO publication_id;

-- 4. Re-add the foreign key with new column name
ALTER TABLE articles
  ADD CONSTRAINT articles_publication_id_fkey
  FOREIGN KEY (publication_id) REFERENCES members(publication_id) ON DELETE CASCADE;

-- 5. Recreate index if it existed (check your actual index names)
-- CREATE INDEX IF NOT EXISTS idx_articles_publication_id ON articles(publication_id);

COMMIT;
