'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'

interface Event {
  id: string
  title: string
  category: string
  description: string
  start_datetime: string
  end_datetime: string
  location_name: string
  location_address: string
  city: string
  spots_left: number
  capacity: number
  tags: string[]
  visibility: string
  is_featured: boolean
  host_id: string
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [event, setEvent] = useState<Event | null>(null)
  const [host, setHost] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [rsvped, setRsvped] = useState(false)
  const [rsvpLoading, setRsvpLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [eventId, setEventId] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    params.then(({ id }) => {
      setEventId(id)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) { router.push('/auth'); return }
        setUser(session.user)
        fetchEvent(id, session.user.id)
      })
    })
  }, [])

  const fetchEvent = async (id: string, userId: string) => {
    const { data: eventData } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()

    if (!eventData) { router.push('/home'); return }
    setEvent(eventData)

    const { data: hostData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', eventData.host_id)
      .single()
    if (hostData) setHost(hostData)

    const { data: rsvpData } = await supabase
      .from('rsvps')
      .select('id')
      .eq('event_id', id)
      .eq('user_id', userId)
      .single()
    if (rsvpData) setRsvped(true)

    setLoading(false)
  }

  const handleRsvp = async () => {
    if (!user || !event) return
    setRsvpLoading(true)
    if (rsvped) {
      await supabase.from('rsvps').delete()
        .eq('event_id', event.id).eq('user_id', user.id)
      setRsvped(false)
    } else {
      await supabase.from('rsvps').insert({
        event_id: event.id, user_id: user.id, status: 'joined'
      })
      setRsvped(true)
    }
    setRsvpLoading(false)
  }

  const formatDate = (dt: string) => new Date(dt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const formatTime = (dt: string) => new Date(dt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  if (loading) return (
    <div className="min-h-screen bg-[#0D110D] flex items-center justify-center">
      <div className="text-[#E8B84B] text-2xl font-bold">Gathr.</div>
    </div>
  )

  if (!event) return null

  const spotsPercent = event.capacity > 0 ? ((event.capacity - event.spots_left) / event.capacity) * 100 : 0

  return (
    <div className="min-h-screen bg-[#0D110D] flex flex-col">

      {/* Hero */}
      <div className="relative h-52 flex items-center justify-center text-6xl flex-shrink-0"
        style={{background: 'linear-gradient(135deg,#1E3A1E,#2A1A0E)'}}>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D110D] via-transparent to-transparent"></div>
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 z-10">
          <button onClick={() => router.back()}
            className="w-9 h-9 bg-[#0D110D]/70 border border-white/15 rounded-xl flex items-center justify-center text-[#F0EDE6]">
            ←
          </button>
          <div className="flex gap-2">
            <button className="w-9 h-9 bg-[#0D110D]/70 border border-white/15 rounded-xl flex items-center justify-center text-base">↑</button>
            <button className="w-9 h-9 bg-[#0D110D]/70 border border-white/15 rounded-xl flex items-center justify-center text-base">🔖</button>
          </div>
        </div>
        <span className="relative z-5">
          {event.category === 'Music' ? '🎸' : event.category === 'Fitness' ? '🏃' : event.category === 'Food & Drink' ? '🍺' : event.category === 'Tech' ? '💻' : event.category === 'Outdoors' ? '🥾' : event.category === 'Arts & Culture' ? '🎨' : '🎉'}
        </span>
        <div className="absolute bottom-3 left-4 flex gap-2 z-10">
          {event.is_featured && <span className="bg-[#E8B84B] text-[#0D110D] text-[9px] font-bold px-2 py-0.5 rounded-full">Featured</span>}
          <span className="bg-[#0E1E0E]/90 text-[#7EC87E] text-[9px] px-2 py-0.5 rounded-full border border-[#7EC87E]/20">◉ {event.visibility}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-40">

        <h1 className="font-bold text-[#F0EDE6] text-lg leading-snug mb-4" style={{fontFamily:'sans-serif'}}>
          {event.title}
        </h1>

        {/* Date + Location */}
        <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5 mb-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 bg-[#1E3A1E] rounded-lg flex items-center justify-center text-xs flex-shrink-0">📅</div>
            <div>
              <div className="text-sm font-medium text-[#F0EDE6]">{formatDate(event.start_datetime)}</div>
              <div className="text-xs text-white/45">{formatTime(event.start_datetime)} – {formatTime(event.end_datetime)}</div>
            </div>
            <button className="ml-auto bg-[#1E3A1E] border border-[#E8B84B]/20 rounded-lg px-2.5 py-1 text-[10px] text-[#E8B84B]">
              + Calendar
            </button>
          </div>
          <div className="border-t border-white/10 my-2.5"></div>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-[#1E3A1E] rounded-lg flex items-center justify-center text-xs flex-shrink-0">📍</div>
            <div>
              <div className="text-sm font-medium text-[#F0EDE6]">{event.location_name}</div>
              <div className="text-xs text-white/45">{event.location_address || event.city}</div>
            </div>
          </div>
        </div>

        {/* About */}
        {event.description && (
          <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5 mb-3">
            <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2 font-medium">About this event</div>
            <p className="text-sm text-white/60 leading-relaxed font-light">{event.description}</p>
          </div>
        )}

        {/* Spots */}
        {event.capacity > 0 && (
          <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5 mb-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-white/45">Spots remaining</span>
              <span className={`text-xs font-semibold ${event.spots_left < 20 ? 'text-[#E8A84B]' : 'text-[#F0EDE6]'}`}>
                {event.spots_left} of {event.capacity} left
              </span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#7EC87E] to-[#E8B84B]"
                style={{width: `${spotsPercent}%`}}></div>
            </div>
          </div>
        )}

        {/* Host */}
        {host && (
          <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5 mb-3 flex items-center gap-3">
          {host.avatar_url ? (
  <img src={host.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-[#E8B84B]/20" />
) : (
  <div className="w-10 h-10 bg-[#2A4A2A] rounded-xl flex items-center justify-center text-lg flex-shrink-0 border border-[#E8B84B]/20">
    🧑‍💻
  </div>
)}
            <div>
              <div className="text-sm font-semibold text-[#F0EDE6]">{host.name}</div>
              <div className="text-xs text-white/45 mt-0.5">{host.hosted_count} events hosted</div>
            </div>
            <div className="ml-auto bg-[#E8B84B]/10 border border-[#E8B84B]/20 rounded-lg px-2.5 py-1 text-[9px] text-[#E8B84B]">
              Host
            </div>
          </div>
        )}

        {/* Tags */}
        {event.tags && event.tags.length > 0 && (
          <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5 mb-3">
            <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2 font-medium">Tags</div>
            <div className="flex flex-wrap gap-2">
              {event.tags.map(tag => (
                <span key={tag} className="bg-[#2A4A2A]/40 text-[#7EC87E] text-xs px-3 py-1 rounded-lg border border-[#7EC87E]/10">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RSVP CTA — sits above BottomNav */}
      <div className="fixed bottom-16 left-0 right-0 px-4 pb-4 pt-4 bg-gradient-to-t from-[#0D110D] to-transparent">
        <button onClick={handleRsvp} disabled={rsvpLoading}
          className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 ${rsvped ? 'bg-[#1C241C] border border-[#E8B84B]/30 text-[#E8B84B]' : 'bg-[#E8B84B] text-[#0D110D]'}`}
          style={{boxShadow: rsvped ? 'none' : '0 5px 22px rgba(232,184,75,0.3)'}}>
          {rsvpLoading ? 'Loading...' : rsvped ? '✓ You\'re going · Cancel RSVP' : `Join Event${event.spots_left > 0 && event.spots_left < 20 ? ` · ${event.spots_left} spots left` : ''}`}
        </button>
      </div>

      <BottomNav />
    </div>
  )
}