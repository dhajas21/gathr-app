-- fix_grant_founding_member_security
--
-- Two bugs found during Phase 1 test pass:
--
-- 1. grant_founding_member had EXECUTE granted to anon + authenticated.
--    Supabase re-applies default role grants after every migration, so the
--    original REVOKE FROM PUBLIC was silently overridden.
--    Fix: explicit revokes + internal auth.uid() guard inside the function.
--    Service-role calls (the only legitimate caller — the billing webhook)
--    carry no JWT, so auth.uid() IS NULL → allowed.
--    Any user-tier call carries a JWT → auth.uid() IS NOT NULL → rejected.
--
-- 2. waves table had a duplicate unique constraint:
--    waves_unique_per_event (added by Phase 1 migration) is identical to
--    the pre-existing waves_sender_id_receiver_id_event_id_key.
--    Fix: drop the redundant one.

-- ── Fix 1 ─────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.grant_founding_member(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.grant_founding_member(uuid) FROM authenticated;

CREATE OR REPLACE FUNCTION public.grant_founding_member(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
BEGIN
  -- Reject any call that carries a user JWT.
  -- Service-role invocations have auth.uid() = NULL; user requests do not.
  IF auth.uid() IS NOT NULL THEN
    RETURN false;
  END IF;

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

-- Re-apply revokes after CREATE OR REPLACE (which resets grants to defaults).
REVOKE ALL     ON FUNCTION public.grant_founding_member(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_founding_member(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.grant_founding_member(uuid) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.grant_founding_member(uuid) TO service_role;

-- ── Fix 2 ─────────────────────────────────────────────────────────────────

ALTER TABLE public.waves DROP CONSTRAINT IF EXISTS waves_unique_per_event;
