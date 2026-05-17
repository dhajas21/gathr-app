-- Community owner/admin can link any member's public event to the community.
-- SECURITY DEFINER bypasses the events RLS policy that restricts updates to
-- the event's own host — the function re-enforces the community role check
-- before allowing the update.

CREATE OR REPLACE FUNCTION link_event_to_community(
  p_event_id     uuid,
  p_community_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role
  FROM community_members
  WHERE community_id = p_community_id
    AND user_id = auth.uid();

  IF v_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only community owners and admins can link events';
  END IF;

  UPDATE events
  SET community_id = p_community_id
  WHERE id = p_event_id;
END;
$$;

REVOKE ALL ON FUNCTION link_event_to_community(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION link_event_to_community(uuid, uuid) TO authenticated;
