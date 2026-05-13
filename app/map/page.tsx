'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import dynamic from 'next/dynamic'
import { optimizedImgSrc, formatDateShort, formatTime } from '@/lib/utils'
import { cityToTimezone, CAT_GRADIENT } from '@/lib/constants'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

export default function MapPage() {
  const [events, setEvents] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userCity, setUserCity] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      fetchEvents(session.user.id)
    })
  }, [router])

  const fetchEvents = async (userId: string) => {
    const { data: profileData } = await supabase.from('profiles').select('city').eq('id', userId).maybeSingle()
    const city = profileData?.city || null
    setUserCity(city)

    // Only fetch events that already have coords — geocoding happens server-side at event create/edit
    let query = supabase
      .from('events')
      .select('id, title, category, location_name, city, start_datetime, latitude, longitude, spots_left, capacity, cover_url')
      .eq('visibility', 'public')
      .gte('start_datetime', new Date().toISOString())
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('start_datetime', { ascending: true })
      .limit(100)
    if (city) query = (query as any).eq('city', city)
    const { data } = await query

    setEvents(data ?? [])
    setLoading(false)
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
          </p>
        </div>
        <button onClick={() => router.push('/home')}
          className="text-xs text-white/40 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
          List view
        </button>
      </div>

      <div className="flex-1 relative" style={{ height: 'calc(100vh - 200px)' }}>
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
            <div className="w-14 h-14 bg-[#1C241C] border border-white/10 rounded-2xl flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
            </div>
            <p className="text-white/40 text-sm text-center">No events with locations yet</p>
            <p className="text-white/25 text-xs text-center max-w-[240px]">Create an event with an address to see it appear on the map.</p>
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
              <div className="category-gradient-card w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden relative"
                style={{ '--cat-bg': CAT_GRADIENT[selected.category] || CAT_GRADIENT['Social'] } as React.CSSProperties}>
                {optimizedImgSrc(selected.cover_url, 800) && (
                  <img src={optimizedImgSrc(selected.cover_url, 800)!} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#F0EDE6] truncate">{selected.title}</div>
                <div className="text-xs text-white/40 mt-0.5">{formatDateShort(selected.start_datetime, cityToTimezone(selected.city))} · {formatTime(selected.start_datetime, cityToTimezone(selected.city))}</div>
                <div className="text-xs text-white/40">{selected.location_name}</div>
              </div>
              <span className="text-[10px] bg-[#E8B84B]/10 text-[#E8B84B] border border-[#E8B84B]/20 px-2 py-0.5 rounded-lg flex-shrink-0">View →</span>
            </div>
          </div>
          <button onClick={() => setSelected(null)}
            className="absolute -top-2 -right-2 w-6 h-6 bg-[#1C241C] border border-white/20 rounded-full flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
