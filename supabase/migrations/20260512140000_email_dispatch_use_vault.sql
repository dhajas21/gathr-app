-- Move dispatch_email() off hardcoded token/URL and onto Vault.
--
-- Vault secrets required (create via Supabase dashboard → Vault, or vault.create_secret()):
--   internal_email_token  — matches INTERNAL_EMAIL_TOKEN edge function secret
--   send_email_url        — https://<project>.supabase.co/functions/v1/send-email
--
-- Rotation procedure:
--   1. Generate new token:  openssl rand -hex 32
--   2. Update Vault:        UPDATE vault.secrets SET secret = '<new>' WHERE name = 'internal_email_token'
--   3. Update edge function secret INTERNAL_EMAIL_TOKEN in Supabase dashboard
--   No migration or function body change required.

create or replace function dispatch_email(payload jsonb)
returns void
language plpgsql
security definer
as $$
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
    body    := payload::text
  );
end;
$$;
