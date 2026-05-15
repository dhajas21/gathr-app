import { createClient } from 'jsr:@supabase/supabase-js@2'

const ALLOWED_ORIGINS = (Deno.env.get('APP_ORIGIN') ?? '')
  .split(',').map(s => s.trim()).filter(Boolean)

function corsFor(req: Request): Record<string, string> {
  const reqOrigin = req.headers.get('Origin') ?? ''
  const allow = ALLOWED_ORIGINS.includes(reqOrigin) ? reqOrigin : (ALLOWED_ORIGINS[0] ?? '')
  return {
    'Access-Control-Allow-Origin': allow,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

const WINDOW_HOURS = 48

Deno.serve(async (req) => {
  const CORS = corsFor(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // Verify JWT — user client so RLS applies when we read profiles
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
  )

  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(user.id)) {
    return new Response(JSON.stringify({ error: 'Invalid user ID' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // Service-role client for multi-table joins that bypass RLS
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const windowStart = new Date(Date.now() - WINDOW_HOURS * 3_600_000).toISOString()
  const now = new Date().toISOString()

  // Step 1: prefer check-ins (verified attendance); fall back to RSVPs for events
  // that pre-date the check-in feature or where nobody checked in.
  const [checkInRes, rsvpRes] = await Promise.all([
    adminClient
      .from('check_ins')
      .select('event_id, events!inner(id, title, end_datetime)')
      .eq('user_id', user.id)
      .gte('events.end_datetime', windowStart)
      .lte('events.end_datetime', now),
    adminClient
      .from('rsvps')
      .select('event_id, events!inner(id, title, end_datetime)')
      .eq('user_id', user.id)
      .gte('events.end_datetime', windowStart)
      .lte('events.end_datetime', now),
  ])

  // Merge: check-in takes priority; RSVPs only added for events with no check-in row for this user
  const checkedInEventIds = new Set((checkInRes.data ?? []).map((r: any) => r.event_id))
  const myRsvps = [
    ...(checkInRes.data ?? []),
    ...(rsvpRes.data ?? []).filter((r: any) => !checkedInEventIds.has(r.event_id)),
  ]

  if (!myRsvps.length) {
    return new Response(JSON.stringify({ matched: 0 }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // Step 2: accepted connections so we can exclude them
  const { data: connRows } = await adminClient
    .from('connections')
    .select('requester_id, addressee_id')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .eq('status', 'accepted')

  const connectedIds = new Set<string>(
    (connRows ?? []).map((c: { requester_id: string; addressee_id: string }) =>
      c.requester_id === user.id ? c.addressee_id : c.requester_id
    ),
  )
  connectedIds.add(user.id) // exclude self

  // Step 3: existing after_event_match notifications for this user to dedupe
  const { data: existingNotifs } = await adminClient
    .from('notifications')
    .select('link')
    .eq('user_id', user.id)
    .eq('type', 'after_event_match')

  const notifiedEventIds = new Set<string>(
    (existingNotifs ?? [])
      .map((n: { link: string }) => {
        const m = n.link?.match(/\/events\/([^/]+)\/survey/)
        return m ? m[1] : null
      })
      .filter(Boolean) as string[],
  )

  // Step 4: batch-fetch all co-attendees for qualifying events in one query
  const qualifyingEvents = myRsvps
    .map((row: { event_id: string; events: unknown }) => row.events as { id: string; title: string; end_datetime: string })
    .filter((event: { id: string }) => !notifiedEventIds.has(event.id))

  const toInsert: {
    user_id: string
    type: string
    title: string
    body: string
    link: string
    read: boolean
  }[] = []

  if (qualifyingEvents.length > 0) {
    const qualifyingEventIds = qualifyingEvents.map((e: { id: string }) => e.id)

    // For each qualifying event, prefer check-ins; fall back to RSVPs for events with none.
    const { data: checkInAttendees } = await adminClient
      .from('check_ins')
      .select('event_id, user_id, profiles!inner(matching_enabled)')
      .in('event_id', qualifyingEventIds)
      .neq('user_id', user.id)
      .eq('profiles.matching_enabled', true)

    const eventsWithCheckIns = new Set((checkInAttendees ?? []).map((r: any) => r.event_id))
    const rsvpFallbackIds = qualifyingEventIds.filter((id: string) => !eventsWithCheckIns.has(id))

    const { data: rsvpAttendees } = rsvpFallbackIds.length
      ? await adminClient
          .from('rsvps')
          .select('event_id, user_id, profiles!inner(matching_enabled)')
          .in('event_id', rsvpFallbackIds)
          .neq('user_id', user.id)
          .eq('profiles.matching_enabled', true)
      : { data: [] }

    const allCoAttendees = [...(checkInAttendees ?? []), ...(rsvpAttendees ?? [])]
    const coErr = false

    if (!coErr && allCoAttendees) {
      // Group by event_id client-side
      const byEvent = new Map<string, string[]>()
      for (const a of allCoAttendees as { event_id: string; user_id: string }[]) {
        const list = byEvent.get(a.event_id) ?? []
        list.push(a.user_id)
        byEvent.set(a.event_id, list)
      }

      for (const event of qualifyingEvents) {
        const coAttendeeIds = byEvent.get(event.id) ?? []
        const matchCount = coAttendeeIds.filter((uid: string) => !connectedIds.has(uid)).length
        if (matchCount === 0) continue
        toInsert.push({
          user_id: user.id,
          type: 'after_event_match',
          title: 'New matches from your event',
          body: `You attended "${event.title}" — ${matchCount} ${matchCount === 1 ? 'person' : 'people'} you haven\'t connected with yet.`,
          link: `/events/${event.id}/survey`,
          read: false,
        })
      }
    }
  }

  if (toInsert.length) {
    await adminClient.from('notifications').insert(toInsert)
  }

  return new Response(JSON.stringify({ matched: toInsert.length }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
