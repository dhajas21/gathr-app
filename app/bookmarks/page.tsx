'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { BookmarksPageSkeleton } from '@/components/Skeleton'

export default function BookmarksPage() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      fetchBookmarks(session.user.id)
    })
  }, [])

  const fetchBookmarks = async (userId: string) => {
    const { data } = await supabase
      .from('event_bookmarks')
      .select('event_id, events(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (data) setEvents(data.map((b: any) => b.events).filter(Boolean))
    setLoading(false)
  }

  const formatDate = (dt: string) => new Date(dt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const formatTime = (dt: string) => new Date(dt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  const CAT_GRADIENT: Record<string, string> = {
    'Music': 'linear-gradient(135deg,#1E1E3A,#2A0E2A)',
    'Fitness': 'linear-gradient(135deg,#1A3A1A,#0E2A1A)',
    'Food & Drink': 'linear-gradient(135deg,#3A2A1E,#2A1E0E)',
    'Tech': 'linear-gradient(135deg,#1E2A3A,#0E1A2A)',
    'Outdoors': 'linear-gradient(135deg,#1A3A1E,#1A2A0E)',
    'Arts & Culture': 'linear-gradient(135deg,#3A1E2A,#2A0E1E)',
    'Social': 'linear-gradient(135deg,#1E3A1E,#2A1A0E)',
    'Networking': 'linear-gradient(135deg,#1E2A3A,#0E1E2A)',
  }

  const now = Date.now()
  const upcoming = events.filter(e => new Date(e.start_datetime).getTime() >= now)
  const past = events.filter(e => new Date(e.start_datetime).getTime() < now)

  const EventCard = ({ event }: { event: any }) => (
    <div key={event.id} onClick={() => router.push('/events/' + event.id)}
      className="bg-[#1C241C] rounded-2xl overflow-hidden border border-white/10 cursor-pointer active:scale-[0.98] transition-transform">
      <div className="category-gradient-card h-28 flex items-center justify-center text-4xl relative"
        style={{ background: CAT_GRADIENT[event.category] || CAT_GRADIENT['Social'] }}>
        {event.cover_url
          ? <img src={event.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          : <span className="relative z-10">{event.category === 'Music' ? '🎸' : event.category === 'Fitness' ? '🏃' : event.category === 'Food & Drink' ? '🍺' : event.category === 'Tech' ? '💻' : event.category === 'Outdoors' ? '🥾' : event.category === 'Arts & Culture' ? '🎨' : '🎉'}</span>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-[#1C241C] via-transparent to-transparent opacity-80" />
      </div>
      <div className="p-3.5">
        <div className="text-[10px] text-[#E8B84B] font-medium mb-0.5">{event.category}</div>
        <h3 className="font-bold text-[#F0EDE6] text-sm leading-snug mb-2">{event.title}</h3>
        <div className="flex items-center gap-3 text-[10px] text-white/40">
          <span>📅 {formatDate(event.start_datetime)} · {formatTime(event.start_datetime)}</span>
        </div>
        <div className="text-[10px] text-white/40 mt-0.5">📍 {event.location_name}{event.city ? ', ' + event.city : ''}</div>
      </div>
    </div>
  )

  if (loading) return <BookmarksPageSkeleton />

  return (
    <div className="min-h-screen bg-[#0D110D] pb-24">
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 border-b border-white/10">
        <button onClick={() => router.push('/profile')}
          className="w-9 h-9 bg-[#1C241C] border border-white/10 rounded-xl flex items-center justify-center text-[#F0EDE6]">
          {'←'}
        </button>
        <h1 className="text-lg font-bold text-[#F0EDE6]">Saved Events</h1>
        <span className="ml-auto text-xs text-white/30">{events.length} saved</span>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 px-4">
          <div className="text-4xl">🔖</div>
          <p className="text-white/40 text-sm text-center">No saved events yet</p>
          <p className="text-white/25 text-xs text-center max-w-[220px]">Tap the bookmark icon on any event to save it here</p>
          <button onClick={() => router.push('/home')}
            className="mt-2 bg-[#E8B84B] text-[#0D110D] px-5 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-transform">
            Browse Events
          </button>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-3">
          {upcoming.map(event => <EventCard key={event.id} event={event} />)}
          {past.length > 0 && (
            <>
              <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium pt-2 pb-1">Past Events</div>
              {past.map(event => (
                <div key={event.id} className="opacity-50">
                  <EventCard event={event} />
                </div>
              ))}
            </>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
