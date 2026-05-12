// Server-side activation of the one-time 7-day Gathr+ trial.
// Frontend cannot grant trials directly any more (RLS trigger blocks writes to
// gathr_plus_* columns); this function is the only authorised path.
//
// Eligibility:
//   - Account must be at least 1 hour old (prevents throwaway-account abuse)
//   - gathr_plus_trial_used must be false
//   - gathr_plus must be false (not already a paying subscriber)
//
// On success, sets gathr_plus_expires_at = now() + 7 days and gathr_plus_trial_used = true.

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

const TRIAL_DAYS = 7
const MIN_ACCOUNT_AGE_MS = 60 * 60 * 1000 // 1 hour

Deno.serve(async (req) => {
  const CORS = corsFor(req)
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // JWT validated via the user client
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
  )

  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return json({ error: 'Unauthorized' }, 401)

  const accountAgeMs = Date.now() - new Date(user.created_at).getTime()
  if (accountAgeMs < MIN_ACCOUNT_AGE_MS) {
    return json({ error: 'Account too new for a free trial — try again later' }, 403)
  }

  // Service-role client to bypass the column guard trigger
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: profile, error: pErr } = await adminClient
    .from('profiles')
    .select('gathr_plus, gathr_plus_trial_used, gathr_plus_expires_at')
    .eq('id', user.id)
    .maybeSingle()

  if (pErr) return json({ error: 'Failed to read profile' }, 500)
  if (!profile) return json({ error: 'Profile not found' }, 404)
  if (profile.gathr_plus === true) {
    return json({ error: 'You already have Gathr+ — no trial needed', alreadyActive: true }, 409)
  }
  if (profile.gathr_plus_trial_used === true) {
    return json({ error: 'You\'ve already used your free trial', alreadyUsed: true }, 409)
  }

  const trialExpiresAt = new Date(Date.now() + TRIAL_DAYS * 24 * 3600 * 1000).toISOString()

  const { error: uErr } = await adminClient
    .from('profiles')
    .update({
      gathr_plus_expires_at: trialExpiresAt,
      gathr_plus_trial_used: true,
    })
    .eq('id', user.id)

  if (uErr) return json({ error: 'Failed to activate trial' }, 500)

  return json({
    success: true,
    expires_at: trialExpiresAt,
    days: TRIAL_DAYS,
  })
})
