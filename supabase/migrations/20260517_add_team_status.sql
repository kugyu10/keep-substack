-- Add status column to teams table and migrate chameleon team to hidden
-- Run this in Supabase SQL Editor BEFORE deploying the code changes

BEGIN;

ALTER TABLE teams ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'public';
UPDATE teams SET status = 'hidden' WHERE name = 'chameleon';

COMMIT;
