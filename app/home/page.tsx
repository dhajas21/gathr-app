'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'

interface Event {
  id: string
  title: string
  category: string
  start_datetime: string
  location_name: string
  city: string
  spots_left: number
  capacity: number
  tags: string[]
  visibility: string
  is_featured: boolean
  host_id: string
}

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUser(session.user)
      fetchEvents()
    })
  }, [router])

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('visibility', 'public')
      .order('start_datetime', { ascending: true })
    if (data) setEvents(data)
    setLoading(false)
  }

  const formatDate = (dt: string) => {
    const d = new Date(dt)
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0D110D] flex items-center justify-center">
      <div className="text-[#E8B84B] text-2xl font-bold">Gathr.</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0D110D] pb-24">
      <div className="px-4 pt-14 pb-0 bg-[#0D110D]">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-bold text-[#F0EDE6] text-xl" style={{fontFamily:'sans-serif'}}>
            Gathr<span className="text-[#E8B84B]">.</span>
          </h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#1C241C] border border-white/10 rounded-full px-3 py-1.5">
              <div className="w-1.5 h-1.5 rounded-sm bg-[#5BCC7A]"></div>
              <span className="text-[#F0EDE6] text-xs">Bellingham</span>
            </div>
            <div className="w-8 h-8 bg-[#1C241C] border border-white/10 rounded-xl flex items-center justify-center text-base relative">
              🔔
              <div className="absolute -top-1 -right-1 bg-[#E8B84B] text-[#0D110D] text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center border border-[#0D110D]">4</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-2.5 mb-3 cursor-pointer" onClick={() => router.push('/search')}>
          <span className="text-[#F0EDE6] opacity-30 text-sm">🔍</span>
          <span className="text-[#F0EDE6] opacity-30 text-sm flex-1">Search events, people, vibes...</span>
          <span className="bg-[#1E3A1E] border border-[#E8B84B]/15 rounded-lg px-2 py-0.5 text-[10px] text-[#E8B84B]">Filter</span>
        </div>
        <div className="flex border-b border-white/10 -mx-4 px-4 overflow-x-auto">
          {['🔥 Trending', '✦ For You', '🏙 City', '👥 Friends', '📌 My Events'].map((tab, i) => (
            <button key={tab} className={`px-3 py-2.5 text-xs whitespace-nowrap border-b-2 -mb-px transition-colors ${i === 0 ? 'text-[#E8B84B] border-[#E8B84B]' : 'text-white/40 border-transparent'}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="mb-3">
          <h2 className="text-lg font-bold text-[#F0EDE6]">What's Happening in Bellingham</h2>
          <p className="text-xs text-white/40 mt-0.5">{events.length} upcoming events</p>
        </div>

        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="text-4xl">🎉</div>
            <p className="text-[#F0EDE6] opacity-50 text-sm text-center">No events yet — be the first to create one!</p>
            <button onClick={() => router.push('/create')}
              className="mt-2 bg-[#E8B84B] text-[#0D110D] px-6 py-3 rounded-2xl font-semibold text-sm">
              Create Event
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event, i) => (
              <div key={event.id}
                onClick={() => router.push(`/events/${event.id}`)}
                className="bg-[#1C241C] border border-white/10 rounded-2xl overflow-hidden cursor-pointer active:scale-98 transition-transform">
                <div className="h-32 flex items-center justify-center text-5xl relative"
                  style={{background: i % 3 === 0 ? 'linear-gradient(135deg,#1E3A1E,#2A1A0E)' : i % 3 === 1 ? 'linear-gradient(135deg,#1A1E2A,#0E1A0E)' : 'linear-gradient(135deg,#2A1A1A,#1A0E0E)'}}>
                  {event.category === 'Music' ? '🎸' : event.category === 'Fitness' ? '🏃' : event.category === 'Food & Drink' ? '🍺' : event.category === 'Tech' ? '💻' : event.category === 'Outdoors' ? '🥾' : event.category === 'Arts & Culture' ? '🎨' : '🎉'}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0D110D] via-transparent to-transparent opacity-60"></div>
                  <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
                    {event.is_featured && <span className="bg-[#E8B84B] text-[#0D110D] text-[9px] font-bold px-2 py-0.5 rounded-full">Featured</span>}
                    <span className="ml-auto bg-[#0E1E0E]/90 text-[#7EC87E] text-[9px] px-2 py-0.5 rounded-full border border-[#7EC87E]/20">◉ Public</span>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-[#F0EDE6] text-sm mb-1.5 leading-snug">{event.title}</h3>
                  <div className="flex items-center gap-1 text-[10px] text-white/45 mb-1">
                    <span>📅</span><span>{formatDate(event.start_datetime)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-white/45 mb-2">
                    <span>📍</span><span>{event.location_name} · {event.city}</span>
                  </div>
                  {event.spots_left > 0 && event.spots_left < 20 && (
                    <div className="text-[10px] text-[#E8A84B] font-medium mb-2">👥 Only {event.spots_left} spots left!</div>
                  )}
                  {event.tags && event.tags.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {event.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="bg-[#2A4A2A]/40 text-[#7EC87E] text-[9px] px-2 py-0.5 rounded border border-[#7EC87E]/10">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}