-- get_event_matches(p_event_id, p_viewer_id)
--
-- Replaces the inline Promise.all match query in app/events/[id]/page.tsx.
-- Scores and returns match candidates for an event, gating identity columns
-- at the DB layer so free users can never inspect names/avatars from the network.
--
-- Identity columns (first_name, avatar_url, shared_interests, bio_social) are
-- populated only when:
--   (a) viewer is an active Gathr+ subscriber or trial holder, OR
--   (b) viewer has BOTH an RSVP and a check-in for the event (post-attendance reveal)
--
-- match_count is always populated — needed for the free-user count teaser.
-- is_dating_match is true only on mutual Gathr+ opt-in — never exposes individual
-- open_to_dating values directly.
--
-- incomingWaves and myWaves (sent waves) are NOT included here; they stay as
-- separate client-side fetches. connections for "Connect" button state also
-- stays client-side (the RPC filters accepted connections but pending requests
-- still need to be surfaced in the UI).

CREATE OR REPLACE FUNCTION public.get_event_matches(
  p_event_id  uuid,
  p_viewer_id uuid
)
RETURNS TABLE (
  candidate_id         uuid,
  first_name           text,     -- NULL for free viewers who haven't checked in
  avatar_url           text,     -- NULL for free viewers who haven't checked in
  shared_interests     text[],   -- NULL for free viewers who haven't checked in
  bio_social           text,     -- NULL for free viewers who haven't checked in
  safety_tier          text,
  review_count         integer,
  attended_count       integer,
  match_score          numeric,
  is_gathr_plus_viewer boolean,
  match_count          integer,  -- total filtered candidates; same value in every row
  is_dating_match      boolean   -- mutual Gathr+ opt-in only; never exposes individual flag
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  caller_id       uuid    := auth.uid();
  is_plus         boolean := false;
  viewer_dating   boolean := false;
  has_rsvp        boolean := false;
  has_checkin     boolean := false;
  reveal_identity boolean := false;
BEGIN
  -- Caller must match the viewer being requested — prevents querying on behalf of others.
  IF caller_id IS NULL OR caller_id <> p_viewer_id THEN
    RETURN;
  END IF;

  -- Viewer's Gathr+ status and dating intent.
  SELECT
    (gathr_plus = true OR (gathr_plus_expires_at IS NOT NULL AND gathr_plus_expires_at > NOW())),
    COALESCE(open_to_dating, false)
  INTO is_plus, viewer_dating
  FROM profiles
  WHERE id = caller_id;

  -- Post-attendance reveal: RSVP'd AND physically checked in unlocks identity for free users.
  SELECT EXISTS (SELECT 1 FROM rsvps     WHERE event_id = p_event_id AND user_id = caller_id)
  INTO has_rsvp;
  SELECT EXISTS (SELECT 1 FROM check_ins WHERE event_id = p_event_id AND user_id = caller_id)
  INTO has_checkin;

  reveal_identity := is_plus OR (has_rsvp AND has_checkin);

  RETURN QUERY
  WITH
  -- All attendees (RSVP'd or checked in), excluding the viewer.
  attendees AS (
    SELECT DISTINCT uid FROM (
      SELECT user_id AS uid FROM rsvps     WHERE event_id = p_event_id AND user_id <> caller_id
      UNION
      SELECT user_id AS uid FROM check_ins WHERE event_id = p_event_id AND user_id <> caller_id
    ) a
  ),

  -- Viewer's interests for shared-interest computation.
  viewer_profile AS (
    SELECT COALESCE(interests, '{}') AS viewer_interests
    FROM profiles WHERE id = caller_id
  ),

  -- Filter candidates: privacy/safety/connection rules applied before scoring.
  candidates AS (
    SELECT
      p.id,
      p.name,
      p.avatar_url,
      COALESCE(p.interests, '{}')  AS interests,
      p.bio_social,
      p.safety_tier,
      p.review_count,
      p.attended_count,
      COALESCE(p.open_to_dating, false)          AS open_to_dating,
      COALESCE(p.gathr_plus, false)              AS gathr_plus,
      p.gathr_plus_expires_at,
      vp.viewer_interests
    FROM attendees a
    JOIN profiles p ON p.id = a.uid
    CROSS JOIN viewer_profile vp
    WHERE p.matching_enabled = true
      AND COALESCE(p.safety_tier, 'new') <> 'flagged'
      -- Exclude accepted connections — they already know each other.
      AND NOT EXISTS (
        SELECT 1 FROM connections cn
        WHERE cn.status = 'accepted'
          AND (
            (cn.requester_id = caller_id AND cn.addressee_id = p.id)
            OR (cn.requester_id = p.id    AND cn.addressee_id = caller_id)
          )
      )
  ),

  -- Score each candidate once; compute total count via window function (single pass).
  scored AS (
    SELECT
      c.*,
      public.compute_match_score(caller_id, c.id, 'social') AS score,
      COUNT(*) OVER ()::integer                              AS total_count
    FROM candidates c
  )

  SELECT
    s.id                                                         AS candidate_id,

    -- Identity gate
    CASE WHEN reveal_identity THEN split_part(s.name, ' ', 1)  ELSE NULL END AS first_name,
    CASE WHEN reveal_identity THEN s.avatar_url                 ELSE NULL END AS avatar_url,
    CASE WHEN reveal_identity THEN
      ARRAY(
        SELECT i FROM unnest(s.interests) i
        WHERE EXISTS (
          SELECT 1 FROM unnest(s.viewer_interests) vi WHERE lower(vi) = lower(i)
        )
      )
    ELSE NULL END                                                              AS shared_interests,
    CASE WHEN reveal_identity THEN s.bio_social                 ELSE NULL END AS bio_social,

    -- Always visible
    s.safety_tier,
    s.review_count,
    s.attended_count,
    s.score                                                                    AS match_score,
    is_plus                                                                    AS is_gathr_plus_viewer,
    s.total_count                                                              AS match_count,

    -- Dating match: both Gathr+ AND both opted in — never exposes individual flag.
    (
      is_plus
      AND viewer_dating
      AND s.open_to_dating
      AND (
        s.gathr_plus = true
        OR (s.gathr_plus_expires_at IS NOT NULL AND s.gathr_plus_expires_at > NOW())
      )
    )                                                                          AS is_dating_match

  FROM scored s
  ORDER BY s.score DESC;

END;
$$;

-- Supabase re-applies default grants after every migration, so we revoke AFTER
-- CREATE OR REPLACE (which resets the function's grant state to defaults).
REVOKE ALL     ON FUNCTION public.get_event_matches(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_event_matches(uuid, uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_event_matches(uuid, uuid) TO authenticated;
