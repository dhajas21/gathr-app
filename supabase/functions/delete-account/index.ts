import { createClient } from 'jsr:@supabase/supabase-js@2'

// CORS allowlist: APP_ORIGIN is a comma-separated list of allowed origins
// (e.g. "https://gathr.app,https://www.gathr.app,http://localhost:3000").
// If a request arrives from an origin not on the list, we echo back the first
// allowed origin — which makes the browser refuse the response. We never fall
// back to '*' because these endpoints are credentialed.
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

Deno.serve(async (req) => {
  const CORS = corsFor(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // Verify the caller is the authenticated user
  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  )
  const { data: { user }, error: authError } = await anonClient.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // Use service-role client to delete the auth user (requires admin privileges)
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
