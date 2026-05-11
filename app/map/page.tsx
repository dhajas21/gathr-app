'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import dynamic from 'next/dynamic'
import { safeImgSrc } from '@/lib/utils'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

export default function MapPage() {
  const [events, setEvents] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [geocoding, setGeocoding] = useState(false)
  const [userCity, setUserCity] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      fetchEvents(session.user.id)
    })
  }, [])

  const fetchEvents = async (userId: string) => {
    const { data: profileData } = await supabase.from('profiles').select('city').eq('id', userId).single()
    const city = profileData?.city || null
    setUserCity(city)

    let query = supabase
      .from('events')
      .select('id, title, category, location_name, city, start_datetime, latitude, longitude, spots_left, capacity, cover_url')
      .eq('visibility', 'public')
      .gte('start_datetime', new Date().toISOString())
      .order('start_datetime', { ascending: true })
      .limit(50)
    if (city) query = (query as any).eq('city', city)
    const { data } = await query

    if (!data) { setLoading(false); return }

    const withCoords = data.filter(e => e.latitude && e.longitude)
    const withoutCoords = data.filter(e => !e.latitude || !e.longitude)

    setEvents(withCoords)
    setLoading(false) // show map immediately; geocoding continues in background

    // Geocode events missing coordinates in the background
    if (withoutCoords.length > 0) {
      setGeocoding(true)
      for (const event of withoutCoords) {
        const query = [event.location_name, event.city].filter(Boolean).join(', ')
        if (!query) continue
        try {
          await new Promise(r => setTimeout(r, 1100)) // Nominatim rate limit: 1 req/s
          const res = await fetch(
            'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(query),
            { headers: { 'User-Agent': 'GathrApp/1.0' } }
          )
          const geodata = await res.json()
          if (geodata[0]) {
            const lat = parseFloat(geodata[0].lat)
            const lng = parseFloat(geodata[0].lon)
            setEvents(prev => [...prev, { ...event, latitude: lat, longitude: lng }])
          }
        } catch {}
      }
      setGeocoding(false)
    }
  }

  const formatDate = (dt: string) => new Date(dt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const formatTime = (dt: string) => new Date(dt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const catEmoji = (cat: string) => {
    const map: Record<string, string> = { Music: '🎸', Fitness: '🏃', 'Food & Drink': '🍺', Tech: '💻', Outdoors: '🥾' }
    return map[cat] || '🎉'
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0D110D] flex flex-col">
      <div className="flex items-center justify-between px-4 pt-14 pb-3 flex-shrink-0">
        <div className="space-y-1.5">
          <div className="h-5 w-20 bg-white/[0.07] rounded-xl animate-pulse" />
          <div className="h-3 w-32 bg-white/[0.05] rounded-xl animate-pulse" />
        </div>
        <div className="w-9 h-9 bg-white/[0.07] rounded-xl animate-pulse" />
      </div>
      <div className="flex-1 bg-white/[0.04] animate-pulse" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0D110D] flex flex-col">
      <div className="flex items-center justify-between px-4 pt-14 pb-3 flex-shrink-0">
        <div>
          <h1 className="font-bold text-[#F0EDE6] text-xl">{userCity || 'Map'}</h1>
          <p className="text-xs text-white/40 mt-0.5">
            {events.length} event{events.length !== 1 ? 's' : ''} near you
            {geocoding && <span className="text-[#E8B84B]/60"> · locating...</span>}
          </p>
        </div>
        <button onClick={() => router.push('/home')}
          className="text-xs text-white/40 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
          List view
        </button>
      </div>

      <div className="flex-1 relative" style={{ height: 'calc(100vh - 200px)' }}>
        {events.length === 0 && !geocoding ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
            <div className="text-4xl">🗺️</div>
            <p className="text-white/40 text-sm text-center">No events with locations yet</p>
            <p className="text-white/25 text-xs text-center max-w-[240px]">Create an event with an address to see it appear on the map.</p>
          </div>
        ) : events.length === 0 && geocoding ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
            <div className="text-4xl animate-pulse">🗺️</div>
            <p className="text-white/40 text-sm text-center">Finding event locations...</p>
          </div>
        ) : (
          <MapView events={events} onSelect={setSelected} />
        )}
      </div>

      {selected && (
        <div className="fixed bottom-24 left-4 right-4 z-[1000]">
          <div className="bg-[#1C241C] border border-white/15 rounded-2xl p-3.5 shadow-2xl cursor-pointer"
            onClick={() => router.push('/events/' + selected.id)}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1E3A1E] rounded-xl flex items-center justify-center text-lg flex-shrink-0 overflow-hidden relative">
                {safeImgSrc(selected.cover_url)
                  ? <img src={safeImgSrc(selected.cover_url)!} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  : catEmoji(selected.category)
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#F0EDE6] truncate">{selected.title}</div>
                <div className="text-xs text-white/40 mt-0.5">{formatDate(selected.start_datetime)} · {formatTime(selected.start_datetime)}</div>
                <div className="text-xs text-white/40">{selected.location_name}</div>
              </div>
              <span className="text-[10px] bg-[#E8B84B]/10 text-[#E8B84B] border border-[#E8B84B]/20 px-2 py-0.5 rounded-lg flex-shrink-0">View →</span>
            </div>
          </div>
          <button onClick={() => setSelected(null)}
            className="absolute -top-2 -right-2 w-6 h-6 bg-[#1C241C] border border-white/20 rounded-full text-white/50 text-xs flex items-center justify-center">
            ✕
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
