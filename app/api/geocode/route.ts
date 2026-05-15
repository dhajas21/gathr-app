import { NextRequest, NextResponse } from 'next/server'

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'GathrApp/1.0 (gathr.app)'

// Simple in-memory rate limiter: max 5 requests per IP per second
const ipTimestamps = new Map<string, number[]>()
function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const hits = (ipTimestamps.get(ip) ?? []).filter(t => now - t < 1000)
  if (hits.length >= 5) { ipTimestamps.set(ip, hits); return true }
  hits.push(now)
  if (hits.length > 0) ipTimestamps.set(ip, hits)
  else ipTimestamps.delete(ip)
  return false
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2 || q.length > 200) {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 })
  }

  try {
    const url = `${NOMINATIM}?format=json&limit=5&addressdetails=1&q=${encodeURIComponent(q)}`
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' },
    })
    if (!res.ok) return NextResponse.json({ results: [] })
    const data = await res.json() as Array<{ name?: string; display_name: string; lat: string; lon: string }>
    const results = data.map(r => ({
      display_name: r.name || r.display_name.split(',')[0],
      address_line: r.display_name,
      lat: r.lat,
      lon: r.lon,
    }))
    return NextResponse.json({ results }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
