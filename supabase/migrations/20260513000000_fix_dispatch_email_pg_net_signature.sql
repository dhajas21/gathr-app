-- Fix dispatch_email: body was cast to text but net.http_post expects jsonb.
-- The mismatch caused SQLSTATE 42883 ("function does not exist") which aborted
-- the signup transaction, showing users "Database error saving new user".
-- Also adds EXCEPTION WHEN OTHERS so any future email failure is logged but
-- never propagates to the caller.
CREATE OR REPLACE FUNCTION public.dispatch_email(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
declare
  v_token text;
  v_url   text;
begin
  select decrypted_secret into v_token
  from vault.decrypted_secrets
  where name = 'internal_email_token'
  limit 1;

  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name = 'send_email_url'
  limit 1;

  if v_token is null or v_url is null then
    raise log 'dispatch_email: vault secret missing, email not sent';
    return;
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'X-Internal-Token', v_token
    ),
    body    := payload
  );
exception when others then
  raise log 'dispatch_email: http_post failed — %', sqlerrm;
end;
$$;
