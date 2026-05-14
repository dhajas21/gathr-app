'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import UndoToast from '@/components/UndoToast'
import { BookmarksPageSkeleton } from '@/components/Skeleton'
import { CAT_GRADIENT, cityToTimezone } from '@/lib/constants'
import { optimizedImgSrc, formatDateShort, formatTime } from '@/lib/utils'

export default function BookmarksPage() {
  const [events, setEvents] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [undoState, setUndoState] = useState<{ open: boolean; event: any | null }>({ open: false, event: null })
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUserId(session.user.id)
      fetchBookmarks(session.user.id)
    })
  }, [router])

  const fetchBookmarks = async (uid: string) => {
    try {
      const { data } = await supabase
        .from('event_bookmarks')
        .select('event_id, events(id, title, category, start_datetime, location_name, city, cover_url, spots_left, capacity, visibility)')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(200)
      if (data) {
        const events = data.map((b: any) => b.events).filter(Boolean)
        setEvents(events)
        const orphanIds = data.filter((b: any) => !b.events).map((b: any) => b.event_id)
        if (orphanIds.length > 0) {
          supabase.from('event_bookmarks').delete().eq('user_id', uid).in('event_id', orphanIds)
            .then(({ error }) => { if (error) console.error('[bookmarks] orphan cleanup failed:', error.message) })
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleUnbookmark = (event: any) => {
    setEvents(prev => prev.filter(e => e.id !== event.id))
    setUndoState({ open: true, event })
  }

  const commitUnbookmark = async () => {
    if (!undoState.event || !userId) return
    await supabase.from('event_bookmarks').delete().eq('user_id', userId).eq('event_id', undoState.event.id)
  }

  const rollbackUnbookmark = () => {
    if (!undoState.event) return
    setEvents(prev => prev.some(e => e.id === undoState.event!.id) ? prev : [undoState.event!, ...prev])
  }

  const now = Date.now()
  const upcoming = events.filter(e => new Date(e.start_datetime).getTime() >= now)
  const past = events.filter(e => new Date(e.start_datetime).getTime() < now)

  const EventCard = ({ event }: { event: any }) => (
    <div key={event.id} onClick={() => router.push('/events/' + event.id)}
      className="bg-[#1C241C] rounded-2xl overflow-hidden border border-white/10 cursor-pointer active:scale-[0.98] transition-transform">
      <div className="category-gradient-card h-28 relative overflow-hidden"
        style={{ '--cat-bg': CAT_GRADIENT[event.category] || CAT_GRADIENT['Social'] } as React.CSSProperties}>
        {optimizedImgSrc(event.cover_url, 800) && (
          <img src={optimizedImgSrc(event.cover_url, 800)!} alt={event.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1C241C] via-transparent to-transparent opacity-80" />
        {/* Unbookmark button */}
        <button
          onClick={e => { e.stopPropagation(); handleUnbookmark(event) }}
          className="absolute top-2 right-2 w-7 h-7 bg-[#0D110D]/70 backdrop-blur-sm border border-white/15 rounded-lg flex items-center justify-center active:scale-90 transition-transform">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            <line x1="4" y1="4" x2="20" y2="20"/>
          </svg>
        </button>
      </div>
      <div className="p-3.5">
        <div className="text-[10px] text-[#E8B84B] font-medium mb-0.5">{event.category}</div>
        <h3 className="font-bold text-[#F0EDE6] text-sm leading-snug mb-2">{event.title}</h3>
        <div className="flex items-center gap-1.5 text-[10px] text-white/40">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>{formatDateShort(event.start_datetime, cityToTimezone(event.city))} · {formatTime(event.start_datetime, cityToTimezone(event.city))}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-white/40 mt-0.5">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span>{event.location_name}{event.city ? ', ' + event.city : ''}</span>
        </div>
      </div>
    </div>
  )

  if (loading) return <BookmarksPageSkeleton />

  return (
    <div className="min-h-screen bg-[#0D110D] pb-24">
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 border-b border-white/10">
        <button onClick={() => router.push('/profile')}
          className="w-9 h-9 bg-[#1C241C] border border-white/10 rounded-xl flex items-center justify-center text-[#F0EDE6] active:scale-95 transition-transform">
          {'←'}
        </button>
        <h1 className="text-lg font-bold text-[#F0EDE6]">Saved Events</h1>
        <span className="ml-auto text-xs text-white/35">{events.length} saved</span>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 px-4">
          <div className="w-14 h-14 bg-[#1C241C] border border-white/10 rounded-2xl flex items-center justify-center empty-float">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
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

      <UndoToast
        open={undoState.open}
        message="Bookmark removed"
        onUndo={rollbackUnbookmark}
        onCommit={commitUnbookmark}
        onClose={() => setUndoState({ open: false, event: null })}
      />

      <BottomNav />
    </div>
  )
}
