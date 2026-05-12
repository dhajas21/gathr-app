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

const MILESTONES = [
  { level: 5, hours: 48, label: '48-hour' },
  { level: 10, hours: 168, label: '7-day' },
]

Deno.serve(async (req) => {
  const CORS = corsFor(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // Compute XP and level from authoritative DB counts
  const [profileRes, hostedRes, rsvpRes, connRes] = await Promise.all([
    supabase.from('profiles').select('interests, gathr_plus_trial_levels').eq('id', user.id).single(),
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('host_id', user.id),
    supabase.from('rsvps').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('connections')
      .select('id', { count: 'exact', head: true })
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted'),
  ])

  const interests: string[] = profileRes.data?.interests || []
  const xp = (hostedRes.count || 0) * 10 + (rsvpRes.count || 0) * 5 + (connRes.count || 0) * 3 + interests.length * 2
  const level = Math.floor(xp / 50) + 1

  const claimedLevels: number[] = profileRes.data?.gathr_plus_trial_levels || []
  const milestone = MILESTONES.find(m => level >= m.level && !claimedLevels.includes(m.level))

  if (!milestone) {
    return new Response(JSON.stringify({ level, granted: null }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const expiresAt = new Date(Date.now() + milestone.hours * 3600000).toISOString()
  await supabase.from('profiles').update({
    gathr_plus_expires_at: expiresAt,
    gathr_plus_trial_levels: [...claimedLevels, milestone.level],
  }).eq('id', user.id)

  return new Response(JSON.stringify({ level, granted: milestone }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
