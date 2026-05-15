-- get_incoming_waves(p_event_id)
--
-- Returns incoming waves for the authenticated caller at a given event.
-- Identity data (first_name, avatar_url, shared_interests) is populated ONLY
-- when the caller is an active Gathr+ subscriber — at the query layer, not the UI.
-- A free user calling this directly gets null for all identity fields; the
-- wave count and mutual status are still returned so existing UI still works.
--
-- "Wave back" is handled client-side via a normal waves INSERT — no change needed
-- to the wave-sending path.

CREATE OR REPLACE FUNCTION public.get_incoming_waves(p_event_id uuid)
RETURNS TABLE (
  sender_id        uuid,
  first_name       text,     -- null for non-Gathr+ callers
  avatar_url       text,     -- null for non-Gathr+ callers
  shared_interests text[],   -- null for non-Gathr+ callers
  is_mutual        boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  caller_id     uuid    := auth.uid();
  is_gathr_plus boolean := false;
BEGIN
  IF caller_id IS NULL THEN
    RETURN;
  END IF;

  SELECT (
    gathr_plus = true
    OR (gathr_plus_expires_at IS NOT NULL AND gathr_plus_expires_at > NOW())
  ) INTO is_gathr_plus
  FROM profiles
  WHERE id = caller_id;

  IF is_gathr_plus THEN
    -- Gathr+: join sender profile and compute shared interests with the caller.
    RETURN QUERY
    SELECT
      w.sender_id,
      split_part(sender.name, ' ', 1)                     AS first_name,
      sender.avatar_url,
      ARRAY(
        SELECT pi.interest
        FROM unnest(sender.interests) AS pi(interest)
        WHERE EXISTS (
          SELECT 1
          FROM unnest(caller.interests) AS ci(i)
          WHERE lower(ci.i) = lower(pi.interest)
        )
      )                                                    AS shared_interests,
      COALESCE(w.is_mutual, false)                        AS is_mutual
    FROM waves w
    JOIN profiles sender ON sender.id = w.sender_id
    JOIN profiles caller  ON caller.id  = caller_id
    WHERE w.receiver_id = caller_id
      AND w.event_id    = p_event_id;
  ELSE
    -- Free tier: wave count + mutual status only; identity stays hidden.
    RETURN QUERY
    SELECT
      w.sender_id,
      NULL::text     AS first_name,
      NULL::text     AS avatar_url,
      NULL::text[]   AS shared_interests,
      COALESCE(w.is_mutual, false) AS is_mutual
    FROM waves w
    WHERE w.receiver_id = caller_id
      AND w.event_id    = p_event_id;
  END IF;
END;
$$;

-- Anon callers get nothing (double-gated by auth.uid() IS NULL check above).
REVOKE ALL     ON FUNCTION public.get_incoming_waves(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_incoming_waves(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_incoming_waves(uuid) TO authenticated;
