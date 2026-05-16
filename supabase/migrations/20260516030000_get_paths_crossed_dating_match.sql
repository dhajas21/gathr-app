-- get_paths_crossed: add is_dating_match column
--
-- Surgical update — adds is_dating_match boolean to the return shape.
-- is_dating_match is true only when:
--   • viewer is Gathr+ (already gated by the existing Gathr+ check), AND
--   • viewer has open_to_dating = true, AND
--   • candidate has open_to_dating = true AND is also active Gathr+.
-- This never exposes either party's individual open_to_dating value.
--
-- Full function replaced (not altered) so source control has the complete body.

-- DROP required because PostgreSQL doesn't allow CREATE OR REPLACE when the
-- return type changes (new is_dating_match column added to the TABLE return).
DROP FUNCTION IF EXISTS public.get_paths_crossed(uuid, timestamptz, int);

CREATE OR REPLACE FUNCTION public.get_paths_crossed(
  p_user_id  uuid,
  p_cursor   timestamptz DEFAULT NULL,
  p_limit    int         DEFAULT 30
)
RETURNS TABLE (
  other_user_id          uuid,
  name                   text,
  avatar_url             text,
  interests              text[],
  safety_tier            text,
  review_count           integer,
  shared_event_count     bigint,
  shared_interest_count  integer,
  most_recent_event_date timestamptz,
  co_attended_events     jsonb,
  is_dating_match        boolean   -- NEW: mutual Gathr+ opt-in; never exposes individual flag
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  viewer_dating boolean := false;
BEGIN

  -- ── Gathr+ gate ────────────────────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND id = p_user_id
      AND (
        gathr_plus = true
        OR (
          gathr_plus_expires_at IS NOT NULL
          AND gathr_plus_expires_at > NOW()
        )
      )
  ) THEN
    RETURN;
  END IF;

  -- Viewer's dating intent (read once; used in SELECT below).
  SELECT COALESCE(open_to_dating, false)
  INTO viewer_dating
  FROM profiles
  WHERE id = p_user_id;

  -- ── Main query ─────────────────────────────────────────────────────────────
  RETURN QUERY
  WITH

  my_events AS (
    SELECT DISTINCT event_id FROM check_ins WHERE user_id = p_user_id
    UNION
    SELECT DISTINCT event_id FROM rsvps    WHERE user_id = p_user_id
  ),

  co_attendees AS (
    SELECT DISTINCT event_id, user_id AS other_id
    FROM (
      SELECT event_id, user_id
      FROM check_ins
      WHERE event_id IN (SELECT event_id FROM my_events)
        AND user_id <> p_user_id
      UNION
      SELECT event_id, user_id
      FROM rsvps
      WHERE event_id IN (SELECT event_id FROM my_events)
        AND user_id <> p_user_id
    ) all_others
  ),

  connected_ids AS (
    SELECT
      CASE
        WHEN requester_id = p_user_id THEN addressee_id
        ELSE requester_id
      END AS other_id
    FROM connections
    WHERE (requester_id = p_user_id OR addressee_id = p_user_id)
      AND status = 'accepted'
  ),

  grouped AS (
    SELECT
      ca.other_id,
      COUNT(DISTINCT ca.event_id)                          AS shared_event_count,
      MAX(ev.start_datetime)                               AS most_recent_event_date,
      jsonb_agg(
        jsonb_build_object(
          'id',    ev.id,
          'title', ev.title,
          'date',  ev.start_datetime
        )
        ORDER BY ev.start_datetime DESC
      )                                                    AS co_attended_events
    FROM co_attendees ca
    JOIN events ev ON ev.id = ca.event_id
    GROUP BY ca.other_id
  )

  SELECT
    p.id                                                   AS other_user_id,
    split_part(p.name, ' ', 1)                            AS name,
    p.avatar_url,
    p.interests,
    p.safety_tier,
    p.review_count,
    g.shared_event_count,
    (
      SELECT COUNT(*)::integer
      FROM unnest(p.interests) AS pi(interest)
      JOIN (
        SELECT lower(i) AS li
        FROM unnest(
          (SELECT interests FROM profiles WHERE id = p_user_id)
        ) AS t(i)
      ) caller_ints ON lower(interest) = caller_ints.li
    )                                                      AS shared_interest_count,
    g.most_recent_event_date,
    g.co_attended_events,

    -- Dating match: viewer_dating already read above; check candidate side here.
    (
      viewer_dating
      AND COALESCE(p.open_to_dating, false)
      AND (
        p.gathr_plus = true
        OR (p.gathr_plus_expires_at IS NOT NULL AND p.gathr_plus_expires_at > NOW())
      )
    )                                                      AS is_dating_match

  FROM grouped g
  JOIN profiles p ON p.id = g.other_id

  WHERE p.matching_enabled = true
    AND COALESCE(p.safety_tier, 'new') <> 'flagged'
    AND NOT EXISTS (
      SELECT 1 FROM connected_ids c WHERE c.other_id = g.other_id
    )
    AND (p_cursor IS NULL OR g.most_recent_event_date < p_cursor)

  ORDER BY g.most_recent_event_date DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 30);

END;
$$;

-- Supabase re-applies default grants after every migration, so we revoke AFTER
-- CREATE OR REPLACE (which resets the function's grant state to defaults).
REVOKE ALL     ON FUNCTION public.get_paths_crossed(uuid, timestamptz, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_paths_crossed(uuid, timestamptz, int) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_paths_crossed(uuid, timestamptz, int) TO authenticated;
