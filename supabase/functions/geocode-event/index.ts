// Server-side geocoding for events.
// Replaces the browser-side Nominatim fetch (which violated their User-Agent
// policy and could get the user's IP rate-limited or banned).
//
// Trigger: invoked by the client after event create/edit with { event_id }.
// Only the host of the event can request a geocode for it.
//
// The function:
//   1. Loads the event (location_address, location_name, city)
//   2. Calls Nominatim with a proper User-Agent identifying Gathr
//   3. Updates events.latitude / events.longitude if a result is returned
//   4. Falls back to CITY_COORDS[city] if Nominatim returns nothing
//
// Idempotent. Fire-and-forget from the client.

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

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'GathrApp/1.0 (gathr.app)'

// Mirrors the CITIES array in lib/constants.ts as a final fallback
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Bellingham: { lat: 48.7519, lng: -122.4787 },
  Bellevue: { lat: 47.6101, lng: -122.2015 },
  Seattle: { lat: 47.6062, lng: -122.3321 },
  Tacoma: { lat: 47.2529, lng: -122.4443 },
  Olympia: { lat: 47.0379, lng: -122.9007 },
  Spokane: { lat: 47.6588, lng: -117.4260 },
  Portland: { lat: 45.5051, lng: -122.6750 },
  Eugene: { lat: 44.0521, lng: -123.0868 },
  Salem: { lat: 44.9429, lng: -123.0351 },
  Vancouver: { lat: 49.2827, lng: -123.1207 },
  Victoria: { lat: 48.4284, lng: -123.3656 },
  Surrey: { lat: 49.1913, lng: -122.8490 },
  Burnaby: { lat: 49.2488, lng: -122.9805 },
  'San Francisco': { lat: 37.7749, lng: -122.4194 },
  'Los Angeles': { lat: 34.0522, lng: -118.2437 },
  'San Diego': { lat: 32.7157, lng: -117.1611 },
  Sacramento: { lat: 38.5816, lng: -121.4944 },
}

Deno.serve(async (req) => {
  const CORS = corsFor(req)
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body: { event_id?: string }
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
  const eventId = body.event_id
  if (!eventId || typeof eventId !== 'string') {
    return json({ error: 'event_id required' }, 400)
  }

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
  )
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return json({ error: 'Unauthorized' }, 401)

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: event } = await adminClient
    .from('events')
    .select('id, host_id, location_address, location_name, city')
    .eq('id', eventId)
    .maybeSingle()

  if (!event) return json({ error: 'Event not found' }, 404)
  if (event.host_id !== user.id) return json({ error: 'Only the host can geocode this event' }, 403)

  const queryParts = [event.location_address?.trim(), event.location_name?.trim(), event.city?.trim()]
    .filter(Boolean)
  if (queryParts.length === 0) return json({ error: 'Nothing to geocode' }, 400)
  const q = queryParts.join(', ')

  let lat: number | null = null
  let lng: number | null = null

  try {
    const url = `${NOMINATIM}?format=json&limit=1&q=${encodeURIComponent(q)}`
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    if (res.ok) {
      const data = await res.json() as Array<{ lat: string; lon: string }>
      if (data[0]) {
        lat = parseFloat(data[0].lat)
        lng = parseFloat(data[0].lon)
      }
    }
  } catch { /* fall through to city fallback */ }

  if ((lat === null || lng === null) && event.city) {
    const fallback = CITY_COORDS[event.city]
    if (fallback) { lat = fallback.lat; lng = fallback.lng }
  }

  if (lat === null || lng === null) {
    return json({ error: 'Could not geocode this address', geocoded: false }, 200)
  }

  const { error: uErr } = await adminClient
    .from('events')
    .update({ latitude: lat, longitude: lng })
    .eq('id', eventId)

  if (uErr) return json({ error: 'Failed to save coords' }, 500)

  return json({ geocoded: true, latitude: lat, longitude: lng })
})
