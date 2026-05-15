-- get_paths_crossed(p_user_id, p_cursor, p_limit)
--
-- Returns the "Paths Crossed" feed for a Gathr+ user: everyone they've
-- co-attended events with, ordered by most-recent shared event descending.
--
-- Security model:
--   SECURITY DEFINER — runs as the function owner so it can bypass RLS and
--   join freely, but the first thing it does is verify the caller is Gathr+.
--   Free users get an empty result set regardless of what they pass.
--   Only the `authenticated` role may execute this function.
--
-- Pagination:
--   Pass the most_recent_event_date of the last row from the previous page
--   as p_cursor. Omit (or pass NULL) for the first page.
--   Maximum 30 rows per call regardless of p_limit.

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
  co_attended_events     jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN

  -- ── Gathr+ gate ────────────────────────────────────────────────────────────
  -- auth.uid() must equal p_user_id (prevents querying on behalf of others)
  -- AND the profile must be an active Gathr+ subscriber or trial holder.
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

  -- ── Main query ─────────────────────────────────────────────────────────────
  RETURN QUERY
  WITH

  -- All events the caller has attended (check-in preferred, RSVP as fallback).
  -- UNION deduplicates so a check-in + RSVP to the same event counts once.
  my_events AS (
    SELECT DISTINCT event_id FROM check_ins WHERE user_id = p_user_id
    UNION
    SELECT DISTINCT event_id FROM rsvps    WHERE user_id = p_user_id
  ),

  -- Everyone else who attended those same events (also deduplicated per event).
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

  -- Accepted connections the caller already has — exclude these from results.
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

  -- Aggregate per co-attendee: event count, most-recent event date, event list.
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
    -- First name only — preserves some mystery, consistent with the rest of the app
    split_part(p.name, ' ', 1)                            AS name,
    p.avatar_url,
    p.interests,
    p.safety_tier,
    p.review_count,
    g.shared_event_count,
    -- Count interests the caller shares with this person (case-insensitive)
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
    g.co_attended_events

  FROM grouped g
  JOIN profiles p ON p.id = g.other_id

  -- Safety + privacy filters (matching the same rules used in post-event reveals)
  WHERE p.matching_enabled = true
    AND COALESCE(p.safety_tier, 'new') <> 'flagged'
    AND NOT EXISTS (
      SELECT 1 FROM connected_ids c WHERE c.other_id = g.other_id
    )
    -- Cursor: only rows older than the last item the caller already received
    AND (p_cursor IS NULL OR g.most_recent_event_date < p_cursor)

  ORDER BY g.most_recent_event_date DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 30);

END;
$$;

-- Only authenticated users may call this; anon and public get nothing.
-- Supabase re-applies default grants after migrations, so we revoke anon explicitly.
REVOKE ALL   ON FUNCTION public.get_paths_crossed(uuid, timestamptz, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_paths_crossed(uuid, timestamptz, int) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_paths_crossed(uuid, timestamptz, int) TO authenticated;
