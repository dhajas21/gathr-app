-- Gathr+ Phase 1 schema additions.
--
-- 1. founding_member column on profiles (for the Founding Member badge).
-- 2. grant_founding_member() function — only service_role may call it.
--    The billing webhook calls this when activating a paid Gathr+ plan;
--    it enforces the 1,000-subscriber cap at the DB layer.
-- 3. Performance indexes on check_ins that the get_paths_crossed RPC requires.
--    rsvps already has idx_rsvps_event_user (20260512052611_perf_indexes.sql).
--
-- Safe to re-run: all DDL uses IF NOT EXISTS / CREATE OR REPLACE.

-- ─── 1. Founding Member column ──────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS founding_member boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.founding_member IS
  'True for the first 1,000 paid Gathr+ subscribers. Set by grant_founding_member(), never by users.';

-- ─── 2. Founding Member grant function ──────────────────────────────────────
-- Called by the billing webhook (service_role JWT) when a paid Gathr+ plan
-- activates. Returns true if the badge was granted, false if the cap is full.

CREATE OR REPLACE FUNCTION public.grant_founding_member(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM profiles
  WHERE founding_member = true;

  IF current_count >= 1000 THEN
    RETURN false;
  END IF;

  UPDATE profiles
  SET founding_member = true
  WHERE id = p_user_id
    AND founding_member = false;

  RETURN FOUND;
END;
$$;

-- Strip public execute; only service_role (billing webhook) may call this.
REVOKE ALL ON FUNCTION public.grant_founding_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_founding_member(uuid) TO service_role;

-- ─── 3. check_ins performance indexes ───────────────────────────────────────
-- get_paths_crossed joins check_ins twice: once for the caller, once for all
-- co-attendees. Without these, every call causes a full table scan.

CREATE INDEX IF NOT EXISTS idx_check_ins_event_user
  ON public.check_ins (event_id, user_id);

CREATE INDEX IF NOT EXISTS idx_check_ins_user_id
  ON public.check_ins (user_id);
