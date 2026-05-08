'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'

const CAT_EMOJI: Record<string, string> = {
  'Music': '🎸', 'DJ & Electronic': '🎧', 'Fitness': '🏃', 'Yoga & Pilates': '🧘',
  'Food & Drink': '🍺', 'Coffee & Brunch': '☕', 'Tech & Coding': '💻',
  'Startups & Entrepreneurship': '🚀', 'Outdoors & Adventure': '🥾', 'Arts & Culture': '🎨',
  'Social & Parties': '🎉', 'Networking': '💼', 'Wellness & Mindfulness': '🌿',
}
const catEmoji = (cat: string) => CAT_EMOJI[cat] || '🎉'

export default function HostDashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [rsvpCounts, setRsvpCounts] = useState<Record<string, number>>({})
  const [ticketRevenue, setTicketRevenue] = useState<Record<string, number>>({})
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'insights'>('overview')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUser(session.user)
      fetchData(session.user.id)
    })
  }, [])

  const fetchData = async (userId: string) => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('host_id', userId)
      .order('start_datetime', { ascending: false })

    if (!data) { setLoading(false); return }
    setEvents(data)

    if (data.length > 0) {
      const ids = data.map((e: any) => e.id)
      const [rsvpRes, ticketRes] = await Promise.all([
        supabase.from('rsvps').select('event_id').in('event_id', ids),
        supabase.from('tickets').select('event_id, total_amount').in('event_id', ids),
      ])

      if (rsvpRes.data) {
        const counts: Record<string, number> = {}
        rsvpRes.data.forEach((r: any) => { counts[r.event_id] = (counts[r.event_id] || 0) + 1 })
        setRsvpCounts(counts)
      }

      if (ticketRes.data) {
        const revenue: Record<string, number> = {}
        ticketRes.data.forEach((t: any) => { revenue[t.event_id] = (revenue[t.event_id] || 0) + (t.total_amount || 0) })
        setTicketRevenue(revenue)
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
  const totalRevenue = Object.values(ticketRevenue).reduce((a, b) => a + b, 0)

  const bestEvent = [...events].sort((a, b) => (rsvpCounts[b.id] || 0) - (rsvpCounts[a.id] || 0))[0]
  const avgAttendance = past.length > 0
    ? Math.round(past.reduce((sum, e) => sum + (rsvpCounts[e.id] || 0), 0) / past.length)
    : 0

  const catBreakdown = events.reduce((acc: Record<string, number>, e) => {
    if (e.category) acc[e.category] = (acc[e.category] || 0) + (rsvpCounts[e.id] || 0)
    return acc
  }, {})
  const topCats = Object.entries(catBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 3)

  const thisMonth = new Date()
  thisMonth.setDate(1)
  const eventsThisMonth = events.filter(e => new Date(e.start_datetime) >= thisMonth).length
  const rsvpsThisMonth = events
    .filter(e => new Date(e.start_datetime) >= thisMonth)
    .reduce((sum, e) => sum + (rsvpCounts[e.id] || 0), 0)

  if (loading) return (
    <div className="min-h-screen bg-[#0D110D] flex items-center justify-center">
      <div className="text-[#E8B84B] text-2xl font-bold">Gathr.</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0D110D] pb-28">

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-14 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-[#F0EDE6]">
            ←
          </button>
          <div>
            <h1 className="font-bold text-[#F0EDE6] text-xl">Host Dashboard</h1>
            <p className="text-xs text-white/40 mt-0.5">{events.length} event{events.length !== 1 ? 's' : ''} · {totalRsvps} total RSVPs</p>
          </div>
        </div>
        <button onClick={() => router.push('/create')}
          className="bg-[#E8B84B] text-[#0D110D] font-bold text-xs px-3 py-2 rounded-xl"
          style={{ boxShadow: '0 4px 14px rgba(232,184,75,0.28)' }}>
          + Event
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 px-4 mb-4">
        {(['overview', 'events', 'insights'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={'flex-1 py-2.5 text-xs text-center border-b-2 -mb-px capitalize transition-colors ' + (activeTab === tab ? 'text-[#E8B84B] border-[#E8B84B]' : 'text-white/40 border-transparent')}>
            {tab}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-4">

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            {/* Key stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { num: upcoming.length, label: 'Upcoming', icon: '📅', color: 'text-[#7EC87E]' },
                { num: totalRsvps, label: 'Total RSVPs', icon: '👥', color: 'text-[#E8B84B]' },
                { num: totalRevenue > 0 ? '$' + totalRevenue.toFixed(0) : '—', label: 'Revenue', icon: '💰', color: 'text-[#E8B84B]' },
                { num: avgAttendance || '—', label: 'Avg attendance', icon: '📊', color: 'text-[#7EC87E]' },
              ].map(stat => (
                <div key={stat.label} className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-base">{stat.icon}</span>
                  </div>
                  <div className={'font-bold text-2xl ' + stat.color}>{stat.num}</div>
                  <div className="text-[10px] text-white/35 uppercase tracking-wide mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* This month */}
            {eventsThisMonth > 0 && (
              <div className="bg-gradient-to-br from-[#1E3A1E] to-[#1A2A1A] border border-[#7EC87E]/20 rounded-2xl p-4">
                <div className="text-[9px] uppercase tracking-widest text-[#7EC87E]/60 font-medium mb-2">This month</div>
                <div className="flex items-center gap-6">
                  <div>
                    <div className="text-2xl font-bold text-[#7EC87E]">{eventsThisMonth}</div>
                    <div className="text-[10px] text-white/40">events</div>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div>
                    <div className="text-2xl font-bold text-[#7EC87E]">{rsvpsThisMonth}</div>
                    <div className="text-[10px] text-white/40">RSVPs</div>
                  </div>
                </div>
              </div>
            )}

            {/* Upcoming events preview */}
            {upcoming.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium">Next up</div>
                  <button onClick={() => setActiveTab('events')} className="text-[10px] text-[#E8B84B]">See all →</button>
                </div>
                {upcoming.slice(0, 2).map(event => {
                  const count = rsvpCounts[event.id] || 0
                  const cap = event.capacity || 0
                  const pct = cap > 0 ? Math.min((count / cap) * 100, 100) : 0
                  return (
                    <div key={event.id} className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5 mb-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-[#1E3A1E] rounded-xl flex items-center justify-center text-lg flex-shrink-0 overflow-hidden relative">
                          {event.cover_url
                            ? <img src={event.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                            : catEmoji(event.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-[#F0EDE6] truncate">{event.title}</div>
                          <div className="text-xs text-white/40 mt-0.5">{formatDate(event.start_datetime)} · {formatTime(event.start_datetime)}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-[#E8B84B] text-lg">{count}</div>
                          <div className="text-[9px] text-white/30">going</div>
                        </div>
                      </div>
                      {cap > 0 && (
                        <div className="mt-3">
                          <div className="flex justify-between text-[9px] text-white/30 mb-1">
                            <span>{Math.round(pct)}% full</span>
                            <span>{cap - count} spots left</span>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: pct + '%', background: pct >= 90 ? '#ef4444' : pct >= 70 ? '#E8B84B' : '#7EC87E' }} />
                          </div>
                        </div>
                      )}
                      {event.ticket_type && event.ticket_type !== 'free' && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="text-[10px] text-[#E8B84B]">🎟 {event.ticket_type === 'paid' && event.ticket_price ? '$' + event.ticket_price + ' · ' : ''}{ticketRevenue[event.id] ? '$' + ticketRevenue[event.id].toFixed(0) + ' collected' : 'No sales yet'}</span>
                        </div>
                      )}
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => router.push('/events/' + event.id)}
                          className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60 font-medium">View</button>
                        <button onClick={() => router.push('/events/' + event.id + '/edit')}
                          className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60 font-medium">Edit</button>
                        <button onClick={() => router.push('/messages')}
                          className="flex-1 py-2 rounded-xl bg-[#1E3A1E] border border-[#E8B84B]/15 text-xs text-[#E8B84B] font-medium">Message</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Host Pro CTA */}
            <div className="bg-gradient-to-br from-[#2A2010] to-[#1A1408] border border-[#E8B84B]/25 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E8B84B]/15 border border-[#E8B84B]/25 flex items-center justify-center text-lg flex-shrink-0">👑</div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-[#E8B84B] mb-1">Unlock Host Pro</div>
                  <div className="text-[10px] text-white/50 leading-relaxed">Sell tickets, collect payments, access advanced analytics, and promote your events to more people.</div>
                  <button className="mt-3 bg-[#E8B84B] text-[#0D110D] text-xs font-bold px-4 py-2 rounded-xl active:scale-95 transition-transform">
                    Join the waitlist →
                  </button>
                </div>
              </div>
            </div>

            {events.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="text-4xl">🎉</div>
                <p className="text-white/40 text-sm">No events yet</p>
                <button onClick={() => router.push('/create')}
                  className="mt-2 bg-[#E8B84B] text-[#0D110D] font-bold px-6 py-3 rounded-2xl text-sm">
                  Create Your First Event
                </button>
              </div>
            )}
          </>
        )}

        {/* EVENTS TAB */}
        {activeTab === 'events' && (
          <>
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
                            {event.cover_url ? <img src={event.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" /> : catEmoji(event.category)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-[#F0EDE6] truncate">{event.title}</div>
                            <div className="text-xs text-white/40 mt-0.5">{formatDate(event.start_datetime)} · {formatTime(event.start_datetime)}</div>
                            <div className="text-xs text-white/30">{event.location_name}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-bold text-[#E8B84B] text-lg">{count}</div>
                            <div className="text-[9px] text-white/30">RSVPs</div>
                          </div>
                        </div>
                        {cap > 0 && (
                          <div className="mt-3">
                            <div className="flex justify-between text-[9px] text-white/30 mb-1">
                              <span>{count} going · {Math.round(pct)}% full</span>
                              <span>{cap} capacity</span>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: pct + '%', background: pct >= 90 ? '#ef4444' : pct >= 70 ? '#E8B84B' : '#7EC87E' }} />
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => router.push('/events/' + event.id)} className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60 font-medium">View</button>
                          <button onClick={() => router.push('/events/' + event.id + '/edit')} className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60 font-medium">Edit</button>
                          <button onClick={() => router.push('/messages')} className="flex-1 py-2 rounded-xl bg-[#1E3A1E] border border-[#E8B84B]/15 text-xs text-[#E8B84B] font-medium">Message</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2 font-medium mt-2">Past</div>
                <div className="space-y-2">
                  {past.map(event => {
                    const count = rsvpCounts[event.id] || 0
                    const rev = ticketRevenue[event.id] || 0
                    return (
                      <div key={event.id} onClick={() => router.push('/events/' + event.id)}
                        className="bg-[#1C241C] border border-white/10 rounded-2xl p-3 flex items-center gap-3 cursor-pointer active:opacity-70">
                        <div className="w-9 h-9 bg-[#1A2A1A] rounded-xl flex items-center justify-center text-base flex-shrink-0 overflow-hidden relative opacity-60">
                          {event.cover_url ? <img src={event.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" /> : catEmoji(event.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white/50 truncate">{event.title}</div>
                          <div className="text-[10px] text-white/25 mt-0.5">{formatDate(event.start_datetime)}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold text-white/40">{count}</div>
                          <div className="text-[9px] text-white/20">attended</div>
                          {rev > 0 && <div className="text-[9px] text-[#E8B84B] mt-0.5">${rev.toFixed(0)}</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* INSIGHTS TAB */}
        {activeTab === 'insights' && (
          <>
            {bestEvent && (
              <div className="bg-gradient-to-br from-[#1E3A1E] to-[#1A2A1A] border border-[#7EC87E]/20 rounded-2xl p-4">
                <div className="text-[9px] uppercase tracking-widest text-[#7EC87E]/60 font-medium mb-2">⭐ Best performing event</div>
                <div className="text-sm font-bold text-[#F0EDE6] mb-1 truncate">{bestEvent.title}</div>
                <div className="text-[10px] text-white/40 mb-2">{formatDate(bestEvent.start_datetime)}</div>
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-xl font-bold text-[#7EC87E]">{rsvpCounts[bestEvent.id] || 0}</div>
                    <div className="text-[9px] text-white/35">RSVPs</div>
                  </div>
                  {bestEvent.capacity > 0 && (
                    <div>
                      <div className="text-xl font-bold text-[#7EC87E]">{Math.round(((rsvpCounts[bestEvent.id] || 0) / bestEvent.capacity) * 100)}%</div>
                      <div className="text-[9px] text-white/35">fill rate</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-4">
              <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium mb-3">Performance summary</div>
              <div className="space-y-3">
                {[
                  { label: 'Events hosted', val: events.length },
                  { label: 'Total RSVPs', val: totalRsvps },
                  { label: 'Avg per event', val: events.length > 0 ? Math.round(totalRsvps / events.length) : 0 },
                  { label: 'Avg past attendance', val: avgAttendance || '—' },
                  { label: 'Total revenue', val: totalRevenue > 0 ? '$' + totalRevenue.toFixed(2) : '$0.00' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-white/[0.06] last:border-0">
                    <span className="text-xs text-white/50">{item.label}</span>
                    <span className="text-xs font-bold text-[#F0EDE6]">{item.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {topCats.length > 0 && (
              <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-4">
                <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium mb-3">Top categories by RSVPs</div>
                <div className="space-y-2.5">
                  {topCats.map(([cat, count], i) => {
                    const maxCount = topCats[0][1]
                    return (
                      <div key={cat}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-white/60">{catEmoji(cat)} {cat}</span>
                          <span className="text-xs font-bold text-[#E8B84B]">{count} RSVPs</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-[#E8B84B] rounded-full" style={{ width: Math.round((count / maxCount) * 100) + '%' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="bg-gradient-to-br from-[#2A2010] to-[#1A1408] border border-[#E8B84B]/25 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E8B84B]/15 border border-[#E8B84B]/25 flex items-center justify-center text-lg flex-shrink-0">👑</div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-[#E8B84B] mb-1">Host Pro — Advanced Insights</div>
                  <div className="text-[10px] text-white/50 leading-relaxed">Attendee demographics, repeat visitor tracking, revenue forecasting, and promotional tools.</div>
                  <button className="mt-3 bg-[#E8B84B] text-[#0D110D] text-xs font-bold px-4 py-2 rounded-xl active:scale-95 transition-transform">
                    Join the waitlist →
                  </button>
                </div>
              </div>
            </div>

            {events.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="text-4xl">📊</div>
                <p className="text-white/40 text-sm text-center">Host your first event to see insights</p>
              </div>
            )}
          </>
        )}

      </div>
      <BottomNav />
    </div>
  )
}
