// toggle-dating-intent
//
// Gathr+-gated toggle for the open_to_dating profile flag.
// Direct profile UPDATE is blocked by the guard_profile_protected_columns trigger;
// this is the only authorised path.
//
// Rules:
//   - Authenticated users only
//   - Gathr+ required (gathr_plus = true OR trial still active)
//   - Rate limit: 5 toggles per user per 24 hours
//   - Input: { enabled: boolean }
//   - On success: updates open_to_dating and returns { success: true, open_to_dating: boolean }

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

const RATE_LIMIT_MAX    = 5
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000 // 24 hours in ms
const ACTION_KEY        = 'toggle_dating_intent'

Deno.serve(async (req) => {
  const CORS = corsFor(req)
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // ── 1. Authenticate ────────────────────────────────────────────────────────
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
  )

  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return json({ error: 'Unauthorized' }, 401)

  // ── 2. Validate input ──────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('enabled' in body) ||
    typeof (body as Record<string, unknown>).enabled !== 'boolean'
  ) {
    return json({ error: 'Body must be { enabled: boolean }' }, 400)
  }

  const enabled = (body as { enabled: boolean }).enabled

  // ── 3. Service-role client for all subsequent DB operations ────────────────
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // ── 4. Check Gathr+ status ─────────────────────────────────────────────────
  const { data: profile, error: pErr } = await adminClient
    .from('profiles')
    .select('gathr_plus, gathr_plus_expires_at')
    .eq('id', user.id)
    .maybeSingle()

  if (pErr)    return json({ error: 'Failed to read profile' }, 500)
  if (!profile) return json({ error: 'Profile not found' }, 404)

  const trialActive = profile.gathr_plus_expires_at
    ? new Date(profile.gathr_plus_expires_at) > new Date()
    : false
  const isGathrPlus = profile.gathr_plus === true || trialActive

  if (!isGathrPlus) {
    return json({ error: 'gathr_plus_required' }, 403)
  }

  // ── 5. Rate limit check ────────────────────────────────────────────────────
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW).toISOString()

  const { count, error: rlErr } = await adminClient
    .from('user_rate_limits')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('action', ACTION_KEY)
    .gte('created_at', since)

  if (rlErr) return json({ error: 'Failed to check rate limit' }, 500)

  if (count !== null && count >= RATE_LIMIT_MAX) {
    return json({
      error: 'Rate limit exceeded — max 5 toggles per 24 hours',
      retry_after: since,
    }, 429)
  }

  // ── 6. Toggle open_to_dating (service-role bypasses the column guard) ──────
  const { error: uErr } = await adminClient
    .from('profiles')
    .update({ open_to_dating: enabled })
    .eq('id', user.id)

  if (uErr) return json({ error: 'Failed to update dating intent' }, 500)

  // ── 7. Log the action for rate limiting ────────────────────────────────────
  await adminClient
    .from('user_rate_limits')
    .insert({ user_id: user.id, action: ACTION_KEY })

  return json({ success: true, open_to_dating: enabled })
})
