-- Transactional email triggers via send-email edge function.
--
-- Triggers:
--   1. welcome email  → after a profile row is created (post-signup)
--   2. event RSVP     → after a rsvps row is inserted (host notified)
--   3. connection req → after a connections row is inserted (addressee notified)
--   4. connection acc → after a connections row is updated to 'accepted'

-- dispatch_email: superseded by migration 20260512140000_email_dispatch_use_vault.sql
-- Token and URL are now read from Vault at call time — no secrets in function body.
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

-- ── Trigger 1: welcome email on new profile ──────────────────────────────────

create or replace function trigger_welcome_email()
returns trigger
language plpgsql
security definer
as $$
declare
  _email text;
begin
  select email into _email from auth.users where id = new.id;
  if _email is null then return new; end if;

  perform dispatch_email(jsonb_build_object(
    'type',     'welcome',
    'to_email', _email,
    'to_name',  coalesce(new.name, split_part(_email, '@', 1))
  ));
  return new;
end;
$$;

drop trigger if exists on_profile_created_send_welcome on profiles;
create trigger on_profile_created_send_welcome
  after insert on profiles
  for each row
  execute function trigger_welcome_email();

-- ── Trigger 2: RSVP email to event host ─────────────────────────────────────

create or replace function trigger_rsvp_email()
returns trigger
language plpgsql
security definer
as $$
declare
  _event      record;
  _host_email text;
  _host_name  text;
  _guest_name text;
begin
  select id, title, host_id into _event from events where id = new.event_id;
  if not found then return new; end if;
  if _event.host_id = new.user_id then return new; end if;

  select u.email, p.name
    into _host_email, _host_name
    from auth.users u
    join profiles p on p.id = u.id
    where u.id = _event.host_id;

  select name into _guest_name from profiles where id = new.user_id;

  if _host_email is null then return new; end if;

  perform dispatch_email(jsonb_build_object(
    'type',          'event_rsvp',
    'to_email',      _host_email,
    'to_name',       coalesce(_host_name, split_part(_host_email, '@', 1)),
    'attendee_name', coalesce(_guest_name, 'Someone'),
    'event_title',   _event.title,
    'event_id',      _event.id::text
  ));
  return new;
end;
$$;

drop trigger if exists on_rsvp_send_host_email on rsvps;
create trigger on_rsvp_send_host_email
  after insert on rsvps
  for each row
  execute function trigger_rsvp_email();

-- ── Trigger 3: connection request email ─────────────────────────────────────

create or replace function trigger_connection_request_email()
returns trigger
language plpgsql
security definer
as $$
declare
  _requester_name  text;
  _addressee_email text;
  _addressee_name  text;
begin
  if new.status <> 'pending' then return new; end if;

  select p.name into _requester_name from profiles p where p.id = new.requester_id;

  select u.email, p.name
    into _addressee_email, _addressee_name
    from auth.users u
    join profiles p on p.id = u.id
    where u.id = new.addressee_id;

  if _addressee_email is null then return new; end if;

  perform dispatch_email(jsonb_build_object(
    'type',           'connection_request',
    'to_email',       _addressee_email,
    'to_name',        coalesce(_addressee_name, split_part(_addressee_email, '@', 1)),
    'requester_name', coalesce(_requester_name, 'Someone'),
    'requester_id',   new.requester_id::text
  ));
  return new;
end;
$$;

drop trigger if exists on_connection_request_send_email on connections;
create trigger on_connection_request_send_email
  after insert on connections
  for each row
  execute function trigger_connection_request_email();

-- ── Trigger 4: connection accepted email ────────────────────────────────────

create or replace function trigger_connection_accepted_email()
returns trigger
language plpgsql
security definer
as $$
declare
  _accepter_name    text;
  _requester_email  text;
  _requester_name   text;
begin
  if old.status = 'accepted' or new.status <> 'accepted' then return new; end if;

  select p.name into _accepter_name from profiles p where p.id = new.addressee_id;

  select u.email, p.name
    into _requester_email, _requester_name
    from auth.users u
    join profiles p on p.id = u.id
    where u.id = new.requester_id;

  if _requester_email is null then return new; end if;

  perform dispatch_email(jsonb_build_object(
    'type',          'connection_accepted',
    'to_email',      _requester_email,
    'to_name',       coalesce(_requester_name, split_part(_requester_email, '@', 1)),
    'accepter_name', coalesce(_accepter_name, 'Someone'),
    'accepter_id',   new.addressee_id::text
  ));
  return new;
end;
$$;

drop trigger if exists on_connection_accepted_send_email on connections;
create trigger on_connection_accepted_send_email
  after update on connections
  for each row
  execute function trigger_connection_accepted_email();
