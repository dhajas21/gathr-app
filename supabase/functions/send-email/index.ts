// send-email: transactional email via Resend.
//
// Auth model: JWT verification is DISABLED at the function-config level.
// A shared secret (INTERNAL_EMAIL_TOKEN) is required in the X-Internal-Token
// header. Only Postgres triggers (via the dispatch_email DB function) or
// server-side callers with the secret can invoke this.
//
// Supported types:
//   welcome            — fired after signup, one-time onboarding email
//   event_rsvp         — host notified when someone joins their event
//   connection_request — user notified when they get a connection request
//   connection_accepted — user notified when their request is accepted
//
// Body shape: { type, to_email, to_name, ...type-specific fields }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const INTERNAL_TOKEN = Deno.env.get("INTERNAL_EMAIL_TOKEN");
const FROM = "Gathr <onboarding@resend.dev>"
const REPLY_TO = "officialgathr@gmail.com"
const APP_URL = Deno.env.get("APP_ORIGIN")?.split(",")[0]?.trim() ?? "https://gathr-app-sigma.vercel.app";

// ── Shared template shell ────────────────────────────────────────────────────

function shell(preheader: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Gathr</title>
</head>
<body style="margin:0;padding:0;background:#0a0f0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${preheader}&nbsp;</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f0a;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#111811;border-radius:20px;border:1px solid #1e2e1e;overflow:hidden;">
        <!-- Header -->
        <tr><td style="padding:32px 36px 24px;border-bottom:1px solid #1e2e1e;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#e8f5e8;letter-spacing:-0.5px;">gathr</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px 36px;">
          ${body}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 36px;border-top:1px solid #1e2e1e;">
          <p style="margin:0;font-size:12px;color:#4a5e4a;line-height:1.6;">
            You're receiving this because you have a Gathr account.<br/>
            <a href="${APP_URL}/settings" style="color:#6abf6a;text-decoration:none;">Manage notifications</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function btn(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:24px;padding:14px 28px;background:#22c55e;color:#fff;font-size:15px;font-weight:600;text-decoration:none;border-radius:12px;">${label}</a>`
}

function h1(text: string): string {
  return `<h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#e8f5e8;letter-spacing:-0.3px;">${text}</h1>`
}

function p(text: string): string {
  return `<p style="margin:0 0 8px;font-size:15px;color:#a0b8a0;line-height:1.6;">${text}</p>`
}

// ── Email builders ───────────────────────────────────────────────────────────

type EmailPayload =
  | { type: "welcome"; to_email: string; to_name: string }
  | { type: "event_rsvp"; to_email: string; to_name: string; attendee_name: string; event_title: string; event_id: string }
  | { type: "connection_request"; to_email: string; to_name: string; requester_name: string; requester_id: string }
  | { type: "connection_accepted"; to_email: string; to_name: string; accepter_name: string; accepter_id: string }

function buildEmail(payload: EmailPayload): { subject: string; html: string } {
  switch (payload.type) {
    case "welcome": {
      const body = [
        h1(`Welcome to Gathr, ${payload.to_name} 👋`),
        p("Discover events happening near you, connect with people who share your interests, and create your own events."),
        p("Your city is waiting."),
        btn("Explore events", `${APP_URL}/home`),
      ].join("\n")
      return {
        subject: `Welcome to Gathr, ${payload.to_name}!`,
        html: shell("Your city is waiting — start exploring events.", body),
      }
    }

    case "event_rsvp": {
      const eventUrl = `${APP_URL}/events/${payload.event_id}`
      const body = [
        h1("Someone just joined your event"),
        p(`<strong style="color:#e8f5e8;">${payload.attendee_name}</strong> RSVPed to <strong style="color:#e8f5e8;">${payload.event_title}</strong>.`),
        btn("View event", eventUrl),
      ].join("\n")
      return {
        subject: `${payload.attendee_name} joined "${payload.event_title}"`,
        html: shell(`${payload.attendee_name} RSVPed to your event.`, body),
      }
    }

    case "connection_request": {
      const profileUrl = `${APP_URL}/profile/${payload.requester_id}`
      const body = [
        h1("You have a connection request"),
        p(`<strong style="color:#e8f5e8;">${payload.requester_name}</strong> wants to connect with you on Gathr.`),
        btn("View profile", profileUrl),
      ].join("\n")
      return {
        subject: `${payload.requester_name} wants to connect`,
        html: shell(`${payload.requester_name} sent you a connection request.`, body),
      }
    }

    case "connection_accepted": {
      const profileUrl = `${APP_URL}/profile/${payload.accepter_id}`
      const body = [
        h1("You're now connected!"),
        p(`<strong style="color:#e8f5e8;">${payload.accepter_name}</strong> accepted your connection request.`),
        btn("Say hi", profileUrl),
      ].join("\n")
      return {
        subject: `${payload.accepter_name} accepted your connection request`,
        html: shell(`You and ${payload.accepter_name} are now connected.`, body),
      }
    }
  }
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  // Shared-secret auth — same pattern as send-push
  if (INTERNAL_TOKEN) {
    const incoming = req.headers.get("X-Internal-Token") ?? ""
    if (incoming !== INTERNAL_TOKEN) return json({ error: "Unauthorized" }, 403)
  }

  if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY not configured" }, 500)

  let payload: EmailPayload
  try { payload = await req.json() } catch { return json({ error: "Invalid JSON" }, 400) }

  if (!payload.type || !payload.to_email) {
    return json({ error: "type and to_email are required" }, 400)
  }

  const { subject, html } = buildEmail(payload)

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [payload.to_email],
      reply_to: REPLY_TO,
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error("Resend error:", err)
    return json({ error: "Failed to send email", detail: err }, 500)
  }

  const result = await res.json()
  return json({ sent: true, id: result.id })
})
