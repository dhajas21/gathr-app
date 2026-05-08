'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'

export default function HostDashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [rsvpCounts, setRsvpCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUser(session.user)
      fetchEvents(session.user.id)
    })
  }, [])

  const fetchEvents = async (userId: string) => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('host_id', userId)
      .order('start_datetime', { ascending: false })

    if (!data) { setLoading(false); return }
    setEvents(data)

    if (data.length > 0) {
      const ids = data.map((e: any) => e.id)
      const { data: rsvps } = await supabase
        .from('rsvps')
        .select('event_id')
        .in('event_id', ids)

      if (rsvps) {
        const counts: Record<string, number> = {}
        rsvps.forEach((r: any) => {
          counts[r.event_id] = (counts[r.event_id] || 0) + 1
        })
        setRsvpCounts(counts)
      }
    }

    setLoading(false)
  }

  const formatDate = (dt: string) => new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const formatTime = (dt: string) => new Date(dt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  const now = new Date().toISOString()
  const upcoming = events.filter(e => e.start_datetime >= now)
  const past = events.filter(e => e.start_datetime < now)

  const totalRsvps = Object.values(rsvpCounts).reduce((a, b) => a + b, 0)

  if (loading) return (
    <div className="min-h-screen bg-[#0D110D] flex items-center justify-center">
      <div className="text-[#E8B84B] text-2xl font-bold">Gathr.</div>
    </div>
  )

  const catEmoji = (cat: string) => {
    const map: Record<string, string> = { Music: '🎸', Fitness: '🏃', 'Food & Drink': '🍺', Tech: '💻', Outdoors: '🥾' }
    return map[cat] || '🎉'
  }

  return (
    <div className="min-h-screen bg-[#0D110D] pb-28">

      <div className="flex items-center justify-between px-4 pt-14 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-[#F0EDE6]">
            ←
          </button>
          <div>
            <h1 className="font-bold text-[#F0EDE6] text-xl" style={{ fontFamily: 'sans-serif' }}>Host Dashboard</h1>
            <p className="text-xs text-white/40 mt-0.5">Your events at a glance</p>
          </div>
        </div>
        <button onClick={() => router.push('/create')}
          className="bg-[#E8B84B] text-[#0D110D] font-bold text-xs px-3 py-2 rounded-xl"
          style={{ boxShadow: '0 4px 14px rgba(232,184,75,0.28)' }}>
          + Event
        </button>
      </div>

      {/* Summary stats */}
      <div className="flex px-4 gap-3 mb-5">
        {[
          { num: events.length, label: 'Total events' },
          { num: upcoming.length, label: 'Upcoming' },
          { num: totalRsvps, label: 'Total RSVPs' },
        ].map(stat => (
          <div key={stat.label} className="flex-1 bg-[#1C241C] border border-white/10 rounded-2xl p-3 text-center">
            <div className="font-bold text-[#E8B84B] text-xl">{stat.num}</div>
            <div className="text-[9px] text-white/35 uppercase tracking-wide mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="px-4 space-y-5">

        {/* Upcoming events */}
        {upcoming.length > 0 && (
          <div>
            <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2 font-medium">Upcoming</div>
            <div className="space-y-3">
              {upcoming.map(event => {
                const count = rsvpCounts[event.id] || 0
                const cap = event.capacity || 0
                const pct = cap > 0 ? Math.min((count / cap) * 100, 100) : 0

                return (
                  <div key={event.id} className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-[#1E3A1E] rounded-xl flex items-center justify-center text-lg flex-shrink-0 overflow-hidden relative">
                        {event.cover_url
                          ? <img src={event.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                          : catEmoji(event.category)
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[#F0EDE6] truncate">{event.title}</div>
                        <div className="text-xs text-white/40 mt-0.5">{formatDate(event.start_datetime)} · {formatTime(event.start_datetime)}</div>
                        <div className="text-xs text-white/40">{event.location_name}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-[#E8B84B] text-base">{count}</div>
                        <div className="text-[9px] text-white/30 uppercase">RSVPs</div>
                      </div>
                    </div>

                    {cap > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-[9px] text-white/30 mb-1">
                          <span>{count} going</span>
                          <span>{cap} capacity</span>
                        </div>
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: pct + '%',
                              background: pct >= 90 ? '#ef4444' : pct >= 70 ? '#E8B84B' : '#7EC87E',
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mt-3">
                      <button onClick={() => router.push('/events/' + event.id)}
                        className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60 font-medium">
                        View
                      </button>
                      <button onClick={() => router.push('/events/' + event.id + '/edit')}
                        className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60 font-medium">
                        Edit
                      </button>
                      <button onClick={() => router.push('/messages')}
                        className="flex-1 py-2 rounded-xl bg-[#1E3A1E] border border-[#E8B84B]/15 text-xs text-[#E8B84B] font-medium">
                        Message
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Past events */}
        {past.length > 0 && (
          <div>
            <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2 font-medium">Past</div>
            <div className="space-y-2">
              {past.map(event => {
                const count = rsvpCounts[event.id] || 0
                return (
                  <div key={event.id} onClick={() => router.push('/events/' + event.id)}
                    className="bg-[#1C241C] border border-white/10 rounded-2xl p-3 flex items-center gap-3 cursor-pointer active:opacity-70">
                    <div className="w-9 h-9 bg-[#1A2A1A] rounded-xl flex items-center justify-center text-base flex-shrink-0 overflow-hidden relative opacity-60">
                      {event.cover_url
                        ? <img src={event.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        : catEmoji(event.category)
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white/50 truncate">{event.title}</div>
                      <div className="text-[10px] text-white/25 mt-0.5">{formatDate(event.start_datetime)}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-white/40">{count}</div>
                      <div className="text-[9px] text-white/20 uppercase">attended</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {events.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 px-4">
            <div className="text-4xl">🎉</div>
            <p className="text-white/40 text-sm text-center">No events yet</p>
            <p className="text-white/25 text-xs text-center max-w-[240px]">Create your first event and start gathering people.</p>
            <button onClick={() => router.push('/create')}
              className="mt-3 bg-[#E8B84B] text-[#0D110D] font-bold px-6 py-3 rounded-2xl text-sm"
              style={{ boxShadow: '0 4px 14px rgba(232,184,75,0.28)' }}>
              Create Event
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
