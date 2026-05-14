-- Fix: notify_on_connection_accepted was not setting actor_id, causing
-- "X accepted your request" notifications to show no avatar.
CREATE OR REPLACE FUNCTION public.notify_on_connection_accepted()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  accepter_name text;
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    SELECT name INTO accepter_name FROM profiles WHERE id = NEW.addressee_id;
    INSERT INTO notifications (user_id, actor_id, type, title, icon, link)
    VALUES (
      NEW.requester_id,
      NEW.addressee_id,
      'connection_accepted',
      accepter_name || ' accepted your connection request',
      '🤝',
      '/profile/' || NEW.addressee_id
    );
  END IF;
  RETURN NEW;
END;
$function$;
