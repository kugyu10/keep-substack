BEGIN;

-- Phase 31: add UNIQUE constraint to members.substack_handle
ALTER TABLE members ADD CONSTRAINT IF NOT EXISTS members_substack_handle_key UNIQUE (substack_handle);

COMMIT;
