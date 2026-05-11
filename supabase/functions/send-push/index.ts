// send-push (v6+):
// Fans out a Web Push notification to all of a user's push_subscriptions
// in response to an internal call from the dispatch_push_notification
// Postgres trigger.
//
// Auth model:
//   - verify_jwt is DISABLED at the function-config level. Standard JWT
//     verification accepts anon keys, which would let any browser trigger
//     arbitrary pushes. Instead we use a shared-secret header.
//   - The trigger fetches INTERNAL_PUSH_TOKEN from Supabase Vault and
//     passes it as X-Internal-Token. We compare against the env var with
//     the same name. Mismatch -> 403.
//
// Inputs (JSON body from the Postgres trigger):
//   { user_id, title, body, link, type }
//
// Behaviour:
//   1. Look up push_subscriptions rows for the user.
//   2. Build per-type title via formatPushCopy() so notifications read
//      naturally regardless of the underlying DB title.
//   3. webpush.sendNotification() to each subscription.
//   4. Auto-prune dead push_subscriptions on send failure so we don't
//      keep retrying expired endpoints.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import webpush from "npm:web-push@3.6.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INTERNAL_PUSH_TOKEN = Deno.env.get("INTERNAL_PUSH_TOKEN") ?? "";

webpush.setVapidDetails(
  "mailto:dhattjaskaran21@gmail.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Per-type push copy. Keep titles short (under ~30 chars looks best on lock screens).
// Types must exactly match the notifications.type CHECK constraint values:
//   connection_request, connection_accepted, rsvp, event_reminder,
//   community_event, message, achievement, after_event_match, survey_prompt,
//   wave, event_comment
function formatPushCopy(notif: { type?: string; title?: string; body?: string }) {
  const t = notif.type ?? "";
  const titleByType: Record<string, string> = {
    message: "New message",
    rsvp: "New RSVP",
    connection_request: "Connection request",
    connection_accepted: "Connection accepted",
    event_comment: "New comment",
    event_reminder: "Event starting soon",
    community_event: "New community event",
    survey_prompt: "How was it?",
    after_event_match: "Your matches are ready",
    wave: "Someone waved",
    achievement: "Achievement unlocked",
  };
  const title = titleByType[t] ?? notif.title ?? "Gathr";
  const body = (notif.body ?? notif.title ?? "Tap to open").slice(0, 140);
  return { title, body };
}

Deno.serve(async (req) => {
  try {
    const incomingToken = req.headers.get("X-Internal-Token") ?? "";
    if (!INTERNAL_PUSH_TOKEN || incomingToken !== INTERNAL_PUSH_TOKEN) {
      return new Response("forbidden", { status: 403 });
    }

    const notif = await req.json();
    if (!notif?.user_id) return new Response("missing user_id", { status: 400 });

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", notif.user_id);

    if (!subs?.length) return new Response("no subscriptions");

    const { title, body } = formatPushCopy(notif);
    const payload = JSON.stringify({
      title,
      body,
      url: notif.link || "/notifications",
    });

    await Promise.all(
      subs.map((sub: { endpoint: string; p256dh: string; auth: string }) =>
        webpush
          .sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          )
          .catch(() =>
            supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint)
          )
      ),
    );

    return new Response("ok");
  } catch (err) {
    console.error("send-push error:", err);
    return new Response("error", { status: 500 });
  }
});
