BEGIN;

-- Phase 27: add substack_handle for Substack profile link
ALTER TABLE members ADD COLUMN IF NOT EXISTS substack_handle TEXT;

COMMIT;
