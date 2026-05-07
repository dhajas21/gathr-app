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
  end_datetime: string
  location_name: string
  city: string
  spots_left: number
  capacity: number
  tags: string[]
  visibility: string
  is_featured: boolean
  host_id: string
  rsvp_count?: number
}

const TABS = ['🔥 Trending', '✦ For You', '🏙 Near Me', '👥 Friends', '📌 Mine']

const ALL_CITIES = [
  'Bellingham', 'Seattle', 'Tacoma', 'Olympia', 'Spokane',
  'Vancouver', 'Victoria', 'Surrey', 'Burnaby',
  'Portland', 'Eugene', 'Salem',
  'San Francisco', 'Los Angeles', 'San Diego', 'Sacramento',
  'New York', 'Brooklyn', 'Chicago', 'Austin', 'Denver',
  'Miami', 'Atlanta', 'Nashville', 'Boston', 'Philadelphia',
  'Minneapolis', 'Detroit', 'Phoenix', 'Las Vegas', 'Honolulu'
]

const CAT_EMOJI: Record<string, string> = {
  'Music': '🎸', 'Fitness': '🏃', 'Food & Drink': '🍺',
  'Tech': '💻', 'Outdoors': '🥾', 'Arts & Culture': '🎨',
  'Networking': '💼', 'Social': '🎉',
}

const CAT_GRADIENT: Record<string, string> = {
  'Music': 'linear-gradient(135deg,#1E2E3A,#1A0E2A)',
  'Fitness': 'linear-gradient(135deg,#2A1E0E,#1A2A0E)',
  'Food & Drink': 'linear-gradient(135deg,#2A1A0E,#1E1A0E)',
  'Tech': 'linear-gradient(135deg,#1A1E2A,#0E1A2A)',
  'Outdoors': 'linear-gradient(135deg,#1A2A1A,#0E2A1A)',
  'Arts & Culture': 'linear-gradient(135deg,#2A1A2A,#1A0E1E)',
  'Networking': 'linear-gradient(135deg,#1E1A2A,#1A1E2A)',
  'Social': 'linear-gradient(135deg,#1E3A1E,#2A1A0E)',
}

function isToday(dt: string) {
  const d = new Date(dt), now = new Date()
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

function isTomorrow(dt: string) {
  const d = new Date(dt), tom = new Date()
  tom.setDate(tom.getDate() + 1)
  return d.getDate() === tom.getDate() && d.getMonth() === tom.getMonth() && d.getFullYear() === tom.getFullYear()
}

function isThisWeekend(dt: string) {
  const d = new Date(dt), day = d.getDay()
  if (day !== 0 && day !== 6) return false
  const now = new Date()
  const diff = (d.getTime() - now.getTime()) / 86400000
  return diff >= 0 && diff <= 7
}

function formatTime(dt: string) {
  return new Date(dt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatDate(dt: string) {
  const d = new Date(dt)
  if (isToday(dt)) return 'Today · ' + formatTime(dt)
  if (isTomorrow(dt)) return 'Tomorrow · ' + formatTime(dt)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + formatTime(dt)
}

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [soonEvents, setSoonEvents] = useState<Event[]>([])
  const [featuredEvent, setFeaturedEvent] = useState<Event | null>(null)
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [rsvpEventIds, setRsvpEventIds] = useState<string[]>([])
  const [connectionIds, setConnectionIds] = useState<string[]>([])
  const [showCityPicker, setShowCityPicker] = useState(false)
  const [citySearch, setCitySearch] = useState('')
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUser(session.user)
      fetchAll(session.user.id)
    })
  }, [])

  const fetchAll = async (userId: string) => {
    const [profileRes, eventsRes, rsvpRes, connRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('events').select('*').eq('visibility', 'public').gte('start_datetime', new Date().toISOString()).order('start_datetime', { ascending: true }).limit(100),
      supabase.from('rsvps').select('event_id').eq('user_id', userId),
      supabase.from('connections').select('requester_id, addressee_id').or('requester_id.eq.' + userId + ',addressee_id.eq.' + userId).eq('status', 'accepted'),
    ])

    if (profileRes.data) setProfile(profileRes.data)
    if (rsvpRes.data) setRsvpEventIds(rsvpRes.data.map((r: any) => r.event_id))
    if (connRes.data) setConnectionIds(connRes.data.map((c: any) => c.requester_id === userId ? c.addressee_id : c.requester_id))

    const allEvents: Event[] = eventsRes.data || []
    setEvents(allEvents)

    // Happening soon (today + tomorrow)
    const soon = allEvents.filter(e => isToday(e.start_datetime) || isTomorrow(e.start_datetime))
    setSoonEvents(soon)

    // Featured
    const featured = allEvents.find(e => e.is_featured) || null
    setFeaturedEvent(featured)

    setLoading(false)
  }

  const handleCityChange = async (newCity: string) => {
    setShowCityPicker(false); setCitySearch('')
    if (!user) return
    await supabase.from('profiles').update({ city: newCity }).eq('id', user.id)
    setProfile((prev: any) => prev ? { ...prev, city: newCity } : prev)
  }

  useEffect(() => {
    if (!events.length) { setFilteredEvents([]); return }
    switch (activeTab) {
      case 0:
        setFilteredEvents([...events].sort((a, b) => {
          const filledA = a.capacity > 0 ? (a.capacity - a.spots_left) : 0
          const filledB = b.capacity > 0 ? (b.capacity - b.spots_left) : 0
          return filledB - filledA
        }))
        break
      case 1:
        if (profile?.interests?.length > 0) {
          const userInterests = profile.interests.map((i: string) => i.toLowerCase())
          const matched = events.filter(e => {
            const tags = (e.tags || []).map(t => t.toLowerCase())
            const cat = e.category?.toLowerCase() || ''
            return userInterests.some((int: string) => tags.includes(int) || cat.includes(int))
          })
          setFilteredEvents([...matched, ...events.filter(e => !matched.includes(e))])
        } else {
          setFilteredEvents(events)
        }
        break
      case 2:
        const userCity = profile?.city || 'Bellingham'
        setFilteredEvents(events.filter(e => e.city?.toLowerCase() === userCity.toLowerCase()))
        break
      case 3:
        setFilteredEvents(connectionIds.length > 0 ? events.filter(e => connectionIds.includes(e.host_id)) : [])
        break
      case 4:
        setFilteredEvents(events.filter(e => e.host_id === user?.id || rsvpEventIds.includes(e.id)))
        break
      default:
        setFilteredEvents(events)
    }
  }, [activeTab, events, profile, rsvpEventIds, connectionIds, user])

  const getEmptyMessage = () => {
    switch (activeTab) {
      case 1: return profile?.interests?.length > 0 ? 'No events match your interests yet' : 'Add interests to get personalized picks'
      case 2: return 'No events in ' + (profile?.city || 'your city') + ' yet'
      case 3: return connectionIds.length > 0 ? 'No friends are hosting right now' : 'Connect with people to see their events here'
      case 4: return 'No events yet — create or RSVP to one!'
      default: return 'No events yet — be the first!'
    }
  }

  const filteredCities = ALL_CITIES.filter(c => !citySearch || c.toLowerCase().includes(citySearch.toLowerCase()))

  if (loading) return (
    <div className="min-h-screen bg-[#0D110D] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-5xl font-extrabold text-[#F0EDE6] tracking-tight leading-none font-display">
          Gathr<span className="text-[#E8B84B]">.</span>
        </h1>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#E8B84B] animate-pulse"
              style={{ animationDelay: `${i * 180}ms` }} />
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0D110D] pb-24">

      {/* Header */}
      <div className="px-4 pt-14 pb-0 bg-[#0D110D]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-extrabold text-[#F0EDE6] text-2xl tracking-tight leading-none font-display">
              Gathr<span className="text-[#E8B84B]">.</span>
            </h1>
            {profile?.name && (
              <p className="text-xs text-white/30 mt-0.5">Hey {profile.name.split(' ')[0]} 👋</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/notifications')}
              className="w-9 h-9 bg-[#1C241C] border border-white/10 rounded-xl flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F0EDE6" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
            </button>
            <button onClick={() => setShowCityPicker(true)}
              className="flex items-center gap-1.5 bg-[#1C241C] border border-white/10 rounded-full px-3 py-1.5">
              <div className="w-1.5 h-1.5 rounded-sm bg-[#5BCC7A]"></div>
              <span className="text-[#F0EDE6] text-xs">{profile?.city || 'Bellingham'} ↓</span>
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-2 bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-2.5 mb-4 cursor-pointer active:opacity-80"
          onClick={() => router.push('/search')}>
          <span className="text-white/30 text-sm">🔍</span>
          <span className="text-white/30 text-sm flex-1">Search events, people, vibes...</span>
          <span className="bg-[#1E3A1E] border border-[#E8B84B]/15 rounded-lg px-2 py-0.5 text-[10px] text-[#E8B84B]">✨ AI</span>
        </div>

        {/* Quick links */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => router.push('/communities')}
            className="flex items-center gap-1.5 bg-[#1C241C] border border-[#E8B84B]/20 rounded-full px-3 py-1.5 active:opacity-70 transition-opacity">
            <span className="text-xs">👥</span>
            <span className="text-xs text-[#F0EDE6]/65 font-medium">Communities</span>
          </button>
        </div>

        {/* Happening soon strip */}
        {soonEvents.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#E85B5B] animate-pulse"></div>
                <span className="text-xs font-semibold text-[#F0EDE6]">Happening Soon</span>
              </div>
              <span className="text-[10px] text-white/30">{soonEvents.length} event{soonEvents.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4">
              {soonEvents.map(event => {
                const isRsvpd = rsvpEventIds.includes(event.id)
                return (
                  <div key={event.id} onClick={() => router.push('/events/' + event.id)}
                    className={'flex-shrink-0 w-44 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition-transform border ' + (isRsvpd ? 'border-[#7EC87E]/30' : 'border-white/10')}>
                    <div className="h-20 flex items-center justify-center text-3xl relative"
                      style={{ background: CAT_GRADIENT[event.category] || CAT_GRADIENT['Social'] }}>
                      <span>{CAT_EMOJI[event.category] || '🎉'}</span>
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1C241C] via-transparent to-transparent opacity-70"></div>
                      {isRsvpd && (
                        <div className="absolute top-1.5 right-1.5 bg-[#7EC87E] text-[#0D110D] text-[8px] font-bold px-1.5 py-0.5 rounded-full">Going ✓</div>
                      )}
                      <div className="absolute bottom-1.5 left-2 right-2">
                        <div className={'text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block ' + (isToday(event.start_datetime) ? 'bg-[#E85B5B]/90 text-white' : 'bg-[#E8B84B]/90 text-[#0D110D]')}>
                          {isToday(event.start_datetime) ? 'Today' : 'Tomorrow'} · {formatTime(event.start_datetime)}
                        </div>
                      </div>
                    </div>
                    <div className="p-2 bg-[#1C241C]">
                      <div className="text-xs font-semibold text-[#F0EDE6] truncate leading-snug">{event.title}</div>
                      <div className="text-[9px] text-white/40 mt-0.5 truncate">{event.location_name}</div>
                      {event.spots_left > 0 && event.spots_left < 15 && (
                        <div className="text-[9px] text-[#E8A84B] mt-0.5">{event.spots_left} spots left</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Featured event hero */}
        {featuredEvent && activeTab === 0 && (
          <div onClick={() => router.push('/events/' + featuredEvent.id)}
            className="rounded-3xl overflow-hidden mb-4 cursor-pointer active:scale-[0.98] transition-transform border border-[#E8B84B]/20">
            <div className="h-36 flex items-center justify-center text-5xl relative"
              style={{ background: CAT_GRADIENT[featuredEvent.category] || CAT_GRADIENT['Social'] }}>
              <span>{CAT_EMOJI[featuredEvent.category] || '🎉'}</span>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D110D] via-transparent to-transparent"></div>
              <div className="absolute top-3 left-3">
                <span className="bg-[#E8B84B] text-[#0D110D] text-[9px] font-bold px-2.5 py-1 rounded-full">⭐ Featured</span>
              </div>
              {rsvpEventIds.includes(featuredEvent.id) && (
                <div className="absolute top-3 right-3">
                  <span className="bg-[#7EC87E] text-[#0D110D] text-[9px] font-bold px-2 py-1 rounded-full">Going ✓</span>
                </div>
              )}
            </div>
            <div className="p-3.5 bg-gradient-to-b from-[#1A2A1A] to-[#1C241C]">
              <div className="text-xs text-[#E8B84B] font-medium mb-1">{featuredEvent.category}</div>
              <h3 className="font-bold text-[#F0EDE6] text-base leading-snug mb-2">{featuredEvent.title}</h3>
              <div className="flex items-center gap-3 text-[10px] text-white/45">
                <span>📅 {formatDate(featuredEvent.start_datetime)}</span>
                <span>📍 {featuredEvent.location_name}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-white/10 -mx-4 px-4 overflow-x-auto">
          {TABS.map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)}
              className={'px-3 py-2.5 text-xs whitespace-nowrap border-b-2 -mb-px transition-colors ' + (activeTab === i ? 'text-[#E8B84B] border-[#E8B84B]' : 'text-white/40 border-transparent')}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-[#F0EDE6]">
              {activeTab === 0 ? "What's Popular" : activeTab === 1 ? 'Picked For You' : activeTab === 2 ? ('In ' + (profile?.city || 'Bellingham')) : activeTab === 3 ? "Friends' Events" : 'Your Events'}
            </h2>
            <p className="text-[10px] text-white/30 mt-0.5">
              {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
              {activeTab === 1 && profile?.interests?.length > 0 && (' · ' + profile.interests.slice(0, 3).join(', '))}
            </p>
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="text-4xl">{activeTab === 3 ? '👥' : activeTab === 4 ? '📌' : '🎉'}</div>
            <p className="text-white/40 text-sm text-center max-w-[240px]">{getEmptyMessage()}</p>
            {activeTab === 1 && !profile?.interests?.length && (
              <button onClick={() => router.push('/profile/edit')}
                className="mt-1 bg-[#E8B84B] text-[#0D110D] px-5 py-2.5 rounded-2xl font-semibold text-sm">Add Interests</button>
            )}
            {activeTab === 3 && !connectionIds.length && (
              <button onClick={() => router.push('/communities')}
                className="mt-1 bg-[#E8B84B] text-[#0D110D] px-5 py-2.5 rounded-2xl font-semibold text-sm">Find People</button>
            )}
            {activeTab === 4 && (
              <button onClick={() => router.push('/create')}
                className="mt-1 bg-[#E8B84B] text-[#0D110D] px-5 py-2.5 rounded-2xl font-semibold text-sm">Create Event</button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map(event => {
              const isRsvpd = rsvpEventIds.includes(event.id)
              const isHost = event.host_id === user?.id
              const isSoon = isToday(event.start_datetime) || isTomorrow(event.start_datetime)
              const fillPct = event.capacity > 0 ? Math.round(((event.capacity - event.spots_left) / event.capacity) * 100) : 0

              return (
                <div key={event.id} onClick={() => router.push('/events/' + event.id)}
                  className={'bg-[#1C241C] rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform border ' + (isRsvpd ? 'border-[#7EC87E]/25' : 'border-white/10')}>
                  <div className="h-28 flex items-center justify-center text-4xl relative"
                    style={{ background: CAT_GRADIENT[event.category] || CAT_GRADIENT['Social'] }}>
                    <span>{CAT_EMOJI[event.category] || '🎉'}</span>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1C241C] via-transparent to-transparent opacity-80"></div>
                    <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
                      <div className="flex gap-1">
                        {event.is_featured && <span className="bg-[#E8B84B] text-[#0D110D] text-[8px] font-bold px-2 py-0.5 rounded-full">⭐ Featured</span>}
                        {isSoon && <span className={'text-[8px] font-bold px-2 py-0.5 rounded-full ' + (isToday(event.start_datetime) ? 'bg-[#E85B5B]/90 text-white' : 'bg-[#E8B84B]/90 text-[#0D110D]')}>{isToday(event.start_datetime) ? '🔴 Today' : '🟡 Tomorrow'}</span>}
                      </div>
                      {isRsvpd && <span className="bg-[#7EC87E]/90 text-[#0D110D] text-[8px] font-bold px-2 py-0.5 rounded-full">Going ✓</span>}
                      {isHost && !isRsvpd && <span className="bg-[#E8B84B]/90 text-[#0D110D] text-[8px] font-bold px-2 py-0.5 rounded-full">Hosting</span>}
                    </div>
                  </div>

                  <div className="p-3">
                    <h3 className="font-bold text-[#F0EDE6] text-sm mb-1.5 leading-snug">{event.title}</h3>
                    <div className="flex items-center gap-3 text-[10px] text-white/45 mb-2">
                      <span>📅 {formatDate(event.start_datetime)}</span>
                      <span>📍 {event.location_name}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex gap-1.5 flex-wrap flex-1">
                        {event.tags?.slice(0, 2).map(tag => (
                          <span key={tag} className="bg-[#2A4A2A]/40 text-[#7EC87E] text-[9px] px-1.5 py-0.5 rounded border border-[#7EC87E]/10">#{tag}</span>
                        ))}
                      </div>
                      {event.capacity > 0 && (
                        <div className="flex-shrink-0 text-right ml-2">
                          {event.spots_left < 10 ? (
                            <span className="text-[10px] text-[#E8A84B] font-medium">{event.spots_left} spots left</span>
                          ) : (
                            <span className="text-[10px] text-white/30">{fillPct}% full</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* City picker */}
      {showCityPicker && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={() => { setShowCityPicker(false); setCitySearch('') }}>
          <div className="w-full max-w-md bg-[#1C241C] rounded-t-3xl p-5 pb-10 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4 flex-shrink-0"></div>
            <h3 className="text-base font-bold text-[#F0EDE6] mb-1 flex-shrink-0">Change Location</h3>
            <p className="text-xs text-white/40 mb-3 flex-shrink-0">Events and recommendations update by city</p>
            <div className="flex items-center gap-2 bg-[#0D110D] border border-white/10 rounded-2xl px-4 py-2.5 mb-3 flex-shrink-0">
              <span className="text-sm text-white/30">🔍</span>
              <input type="text" value={citySearch} onChange={e => setCitySearch(e.target.value)}
                placeholder="Search or type a city..." autoFocus
                className="flex-1 bg-transparent text-sm text-[#F0EDE6] placeholder-white/30 outline-none" />
              {citySearch && <button onClick={() => setCitySearch('')} className="text-xs text-white/30">✕</button>}
            </div>
            <div className="overflow-y-auto flex-1 space-y-2">
              {filteredCities.map(city => (
                <button key={city} onClick={() => handleCityChange(city)}
                  className={'w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all ' + (profile?.city === city ? 'border-[#E8B84B]/40 bg-[#E8B84B]/5' : 'border-white/10 bg-[#0D110D]')}>
                  <div className={'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ' + (profile?.city === city ? 'border-[#E8B84B]' : 'border-white/20')}>
                    {profile?.city === city && <div className="w-2 h-2 rounded-full bg-[#E8B84B]" />}
                  </div>
                  <span className="text-sm text-[#F0EDE6]">{city}</span>
                  {profile?.city === city && <span className="ml-auto text-[10px] text-[#E8B84B]">Current</span>}
                </button>
              ))}
              {citySearch.trim() && !ALL_CITIES.some(c => c.toLowerCase() === citySearch.trim().toLowerCase()) && (
                <button onClick={() => handleCityChange(citySearch.trim())}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-dashed border-[#E8B84B]/30 bg-[#0D110D]">
                  <span className="text-sm">📍</span>
                  <span className="text-sm text-[#E8B84B]">Use &quot;{citySearch.trim()}&quot;</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}