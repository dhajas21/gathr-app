-- Prevents duplicate connection-request emails when a user repeatedly
-- connects → withdraws → reconnects to the same person.
--
-- Strategy: before sending the email, check whether a connection_request
-- notification already exists for this requester→addressee pair (created
-- more than 1 minute ago, so we don't race with the push-notification
-- trigger that fires in the same transaction and inserts the row).
-- If one exists, the email was already delivered — skip silently.
-- The notification row is preserved even on withdrawal (marked read
-- client-side) so this check stays accurate across reconnect cycles.

CREATE OR REPLACE FUNCTION trigger_connection_request_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _requester_name  text;
  _addressee_email text;
  _addressee_name  text;
BEGIN
  IF new.status <> 'pending' THEN RETURN new; END IF;

  -- Dedup: skip if a connection_request notification already exists for
  -- this requester→addressee pair (older than 1 minute to avoid a
  -- within-transaction race with the push-notification trigger).
  IF EXISTS (
    SELECT 1 FROM notifications
    WHERE user_id  = new.addressee_id
      AND actor_id = new.requester_id
      AND type     = 'connection_request'
      AND created_at < NOW() - INTERVAL '1 minute'
  ) THEN
    RETURN new;
  END IF;

  SELECT p.name INTO _requester_name FROM profiles p WHERE p.id = new.requester_id;

  SELECT u.email, p.name
    INTO _addressee_email, _addressee_name
    FROM auth.users u
    JOIN profiles p ON p.id = u.id
    WHERE u.id = new.addressee_id;

  IF _addressee_email IS NULL THEN RETURN new; END IF;

  PERFORM dispatch_email(jsonb_build_object(
    'type',           'connection_request',
    'to_email',       _addressee_email,
    'to_name',        COALESCE(_addressee_name, split_part(_addressee_email, '@', 1)),
    'requester_name', COALESCE(_requester_name, 'Someone'),
    'requester_id',   new.requester_id::text
  ));
  RETURN new;
END;
$$;
