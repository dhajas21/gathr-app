-- Helper function so send-push edge function can read the shared secret from
-- Vault at request time. Both sides (this function + dispatch_push_notification
-- trigger) now use vault as the single source of truth, eliminating the
-- env-var / vault mismatch that caused 401s.

CREATE OR REPLACE FUNCTION public.get_internal_push_token()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = vault, public
AS $$
  SELECT decrypted_secret
  FROM vault.decrypted_secrets
  WHERE name = 'internal_push_token'
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_internal_push_token() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_internal_push_token() TO service_role;
