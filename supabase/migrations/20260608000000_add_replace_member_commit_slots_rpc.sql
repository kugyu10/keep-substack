BEGIN;

-- Phase 33: add replace_member_commit_slots RPC for atomic commit slot updates
CREATE OR REPLACE FUNCTION replace_member_commit_slots(
  p_member_id UUID,
  p_slots     JSONB
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM member_commit_slots
  WHERE member_id = p_member_id;

  IF jsonb_array_length(p_slots) > 0 THEN
    INSERT INTO member_commit_slots (member_id, day_of_week, hour)
    SELECT
      p_member_id,
      (elem->>'day_of_week')::INT,
      (elem->>'hour')::INT
    FROM jsonb_array_elements(p_slots) AS elem;
  END IF;
END;
$$;

COMMIT;
