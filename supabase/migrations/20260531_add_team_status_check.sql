-- Constrain teams.status to the three valid values (public/private/hidden).
-- Backs the app-level allowlist in updateTeamStatusAction so an out-of-band
-- write can never leave a team in a half-hidden state (not a tab, yet visible
-- in the All view). Run this in Supabase SQL Editor.
-- Idempotent: drop-then-add so re-runs are safe.

BEGIN;

ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_status_check;
ALTER TABLE teams ADD CONSTRAINT teams_status_check
  CHECK (status IN ('public', 'private', 'hidden'));

COMMIT;
