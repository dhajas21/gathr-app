-- compute_match_score(p_viewer_id, p_candidate_id, p_event_mode)
--
-- Returns a 0–100 match score between two profiles. Called internally by
-- get_event_matches() and get_paths_crossed() to rank candidates.
-- Authenticated users may also call it directly (the score reveals no private data).
--
-- Scoring weights (social mode):
--   50  Shared interests — Jaccard similarity × 50
--   15  Vibe match       — exact=15, one side is "mix"=7, mismatch=0
--   10  looking_for overlap — any shared entry=10, community-seeker bonus=+5
--    5  (bonus)          — see looking_for above
--   10  Mutual connections — min(count,5) × 2
--    5  Same city        — binary
--    5  Both early in journey — both connection_count < 10
--  ───
--  100  max
--
-- Only 'social' mode is implemented. Passing 'professional' raises an exception
-- so the caller knows the mode is not yet available (rather than silently returning 0).

CREATE OR REPLACE FUNCTION public.compute_match_score(
  p_viewer_id    uuid,
  p_candidate_id uuid,
  p_event_mode   text DEFAULT 'social'
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v               RECORD;  -- viewer profile
  c               RECORD;  -- candidate profile

  -- interest scoring
  v_interests     text[];
  c_interests     text[];
  intersect_count integer := 0;
  union_count     integer := 0;
  interest_score  numeric := 0;

  -- vibe scoring
  vibe_score      numeric := 0;

  -- looking_for scoring
  lf_overlap      integer := 0;
  lf_score        numeric := 0;

  -- mutual connections
  mutual_count    integer := 0;
  mutual_score    numeric := 0;

  -- city
  city_score      numeric := 0;

  -- early journey
  journey_score   numeric := 0;

  total           numeric := 0;
BEGIN
  -- Only 'social' is implemented; raise so callers know it's not silently wrong.
  IF p_event_mode <> 'social' THEN
    RAISE EXCEPTION 'compute_match_score: event_mode "%" is not yet supported. Only "social" is available.', p_event_mode;
  END IF;

  -- Fetch both profiles in one pass each.
  SELECT interests, vibe, looking_for, city, connection_count
  INTO v
  FROM profiles WHERE id = p_viewer_id;

  SELECT interests, vibe, looking_for, city, connection_count
  INTO c
  FROM profiles WHERE id = p_candidate_id;

  -- If either profile is missing, return 0.
  IF v IS NULL OR c IS NULL THEN
    RETURN 0;
  END IF;

  -- ── 1. Shared interests (max 50) — Jaccard similarity ───────────────────────
  v_interests := COALESCE(v.interests, '{}');
  c_interests := COALESCE(c.interests, '{}');

  SELECT COUNT(*) INTO intersect_count
  FROM unnest(v_interests) vi
  WHERE EXISTS (
    SELECT 1 FROM unnest(c_interests) ci WHERE lower(ci) = lower(vi)
  );

  -- Union = |A| + |B| - |A∩B|; guard division-by-zero
  union_count := cardinality(v_interests) + cardinality(c_interests) - intersect_count;

  IF union_count > 0 THEN
    interest_score := (intersect_count::numeric / union_count::numeric) * 50;
  END IF;

  -- ── 2. Vibe match (max 15) ───────────────────────────────────────────────────
  IF v.vibe IS NOT NULL AND c.vibe IS NOT NULL THEN
    IF v.vibe = c.vibe THEN
      vibe_score := 15;
    ELSIF v.vibe = 'mix' OR c.vibe = 'mix' THEN
      -- 'mix' users are compatible with any vibe — partial credit
      vibe_score := 7;
    END IF;
  END IF;

  -- ── 3. Compatible looking_for (max 10 + 5 bonus) ────────────────────────────
  IF v.looking_for IS NOT NULL AND c.looking_for IS NOT NULL
     AND cardinality(v.looking_for) > 0 AND cardinality(c.looking_for) > 0 THEN

    SELECT COUNT(*) INTO lf_overlap
    FROM unnest(v.looking_for) vl
    WHERE vl = ANY(c.looking_for);

    IF lf_overlap > 0 THEN
      lf_score := 10;

      -- Bonus: both community-seekers (new_to_city ↔ new_to_city or life_change_community)
      IF (
        ('new_to_city' = ANY(v.looking_for) AND 'new_to_city' = ANY(c.looking_for))
        OR (
          'new_to_city' = ANY(v.looking_for)
          AND 'life_change_community' = ANY(c.looking_for)
        )
        OR (
          'life_change_community' = ANY(v.looking_for)
          AND 'new_to_city' = ANY(c.looking_for)
        )
      ) THEN
        lf_score := lf_score + 5;
      END IF;
    END IF;
  END IF;

  -- ── 4. Mutual connections (max 10) ───────────────────────────────────────────
  -- Count users who are accepted-connected to BOTH viewer and candidate.
  SELECT COUNT(*) INTO mutual_count
  FROM (
    SELECT
      CASE WHEN requester_id = p_viewer_id THEN addressee_id ELSE requester_id END AS uid
    FROM connections
    WHERE (requester_id = p_viewer_id OR addressee_id = p_viewer_id)
      AND status = 'accepted'
  ) vc
  JOIN (
    SELECT
      CASE WHEN requester_id = p_candidate_id THEN addressee_id ELSE requester_id END AS uid
    FROM connections
    WHERE (requester_id = p_candidate_id OR addressee_id = p_candidate_id)
      AND status = 'accepted'
  ) cc ON vc.uid = cc.uid;

  mutual_score := LEAST(mutual_count, 5) * 2;

  -- ── 5. Same city (max 5) ─────────────────────────────────────────────────────
  IF v.city IS NOT NULL AND c.city IS NOT NULL
     AND lower(trim(v.city)) = lower(trim(c.city)) THEN
    city_score := 5;
  END IF;

  -- ── 6. Both early in journey (max 5) ─────────────────────────────────────────
  IF COALESCE(v.connection_count, 0) < 10 AND COALESCE(c.connection_count, 0) < 10 THEN
    journey_score := 5;
  END IF;

  -- ── Total ────────────────────────────────────────────────────────────────────
  total := LEAST(
    interest_score + vibe_score + lf_score + mutual_score + city_score + journey_score,
    100
  );

  RETURN round(total, 1);
END;
$$;

-- Supabase re-applies default grants after every migration, so we revoke AFTER
-- CREATE OR REPLACE (which resets the function's grant state to defaults).
REVOKE ALL     ON FUNCTION public.compute_match_score(uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.compute_match_score(uuid, uuid, text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.compute_match_score(uuid, uuid, text) TO authenticated;
