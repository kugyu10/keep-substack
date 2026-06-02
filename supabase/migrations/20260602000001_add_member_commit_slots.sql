BEGIN;

-- Phase 28: add member_commit_slots for commit schedule
CREATE TABLE IF NOT EXISTS member_commit_slots (
  id           BIGINT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  member_id    UUID    NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  day_of_week  INT     NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  hour         INT     NOT NULL CHECK (hour BETWEEN 0 AND 23)
);

ALTER TABLE member_commit_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public select member_commit_slots" ON member_commit_slots;
CREATE POLICY "public select member_commit_slots"
  ON member_commit_slots FOR SELECT USING (true);

DROP POLICY IF EXISTS "member write own commit slots" ON member_commit_slots;
CREATE POLICY "member write own commit slots"
  ON member_commit_slots
  FOR ALL
  USING (
    member_id = (SELECT id FROM members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    member_id = (SELECT id FROM members WHERE user_id = auth.uid())
  );

COMMIT;
