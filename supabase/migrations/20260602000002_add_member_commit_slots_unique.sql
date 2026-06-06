BEGIN;

-- Phase 28 fix: add unique constraint to prevent duplicate day_of_week per member
ALTER TABLE member_commit_slots
  ADD CONSTRAINT uq_member_commit_slots_day
  UNIQUE (member_id, day_of_week);

COMMIT;
