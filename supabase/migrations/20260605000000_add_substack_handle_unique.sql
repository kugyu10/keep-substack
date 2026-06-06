-- Phase 31: add UNIQUE constraint to members.substack_handle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'members_substack_handle_key'
      AND conrelid = 'members'::regclass
  ) THEN
    ALTER TABLE members ADD CONSTRAINT members_substack_handle_key UNIQUE (substack_handle);
  END IF;
END $$;
