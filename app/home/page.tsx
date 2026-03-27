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

const TABS = ['🔥 Trending', '✦ For You', '🏙 City', '👥 Friends', '📌 My Events']

const ALL_CITIES = [
  'Bellingham', 'Seattle', 'Tacoma', 'Olympia', 'Spokane',
  'Vancouver', 'Victoria', 'Surrey', 'Burnaby',
  'Portland', 'Eugene', 'Salem',
  'San Francisco', 'Los Angeles', 'San Diego', 'Sacramento',
  'New York', 'Brooklyn', 'Chicago', 'Austin', 'Denver',
  'Miami', 'Atlanta', 'Nashville', 'Boston', 'Philadelphia',
  'Minneapolis', 'Detroit', 'Phoenix', 'Las Vegas', 'Honolulu'
]

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [rsvpEventIds, setRsvpEventIds] = useState<string[]>([])
  const [connectionIds, setConnectionIds] = useState<string[]>([])
  const [showCityPicker, setShowCityPicker] = useState(false)
  const [citySearch, setCitySearch] = useState('')
  const [notifCount, setNotifCount] = useState(0)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUser(session.user)
      fetchAll(session.user.id)
    })
  }, [])

  const fetchAll = async (userId: string) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (profileData) setProfile(profileData)

    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .eq('visibility', 'public')
      .order('start_datetime', { ascending: true })
    if (eventsData) setEvents(eventsData)

    const { data: rsvpData } = await supabase
      .from('rsvps')
      .select('event_id')
      .eq('user_id', userId)
    if (rsvpData) setRsvpEventIds(rsvpData.map(r => r.event_id))

    const { data: connData } = await supabase
      .from('connections')
      .select('requester_id, addressee_id')
      .or('requester_id.eq.' + userId + ',addressee_id.eq.' + userId)
      .eq('status', 'accepted')
    if (connData) {
      const ids = connData.map(c => c.requester_id === userId ? c.addressee_id : c.requester_id)
      setConnectionIds(ids)
    }

    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)
    if (count !== null) setNotifCount(count)

    setLoading(false)
  }

  const handleCityChange = async (newCity: string) => {
    setShowCityPicker(false)
    setCitySearch('')
    if (!user) return
    await supabase.from('profiles').update({ city: newCity }).eq('id', user.id)
    setProfile((prev: any) => prev ? { ...prev, city: newCity } : prev)
  }

  const filteredCities = ALL_CITIES.filter(c =>
    !citySearch || c.toLowerCase().includes(citySearch.toLowerCase())
  )

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
            const eventTags = (e.tags || []).map(t => t.toLowerCase())
            const eventCat = e.category?.toLowerCase() || ''
            return userInterests.some((interest: string) =>
              eventTags.includes(interest) || eventCat.includes(interest)
            )
          })
          const unmatched = events.filter(e => !matched.includes(e))
          setFilteredEvents([...matched, ...unmatched])
        } else {
          setFilteredEvents(events)
        }
        break
      case 2:
        const userCity = profile?.city || 'Bellingham'
        setFilteredEvents(events.filter(e => e.city?.toLowerCase() === userCity.toLowerCase()))
        break
      case 3:
        if (connectionIds.length > 0) {
          setFilteredEvents(events.filter(e => connectionIds.includes(e.host_id)))
        } else {
          setFilteredEvents([])
        }
        break
      case 4:
        setFilteredEvents(events.filter(e => e.host_id === user?.id || rsvpEventIds.includes(e.id)))
        break
      default:
        setFilteredEvents(events)
    }
  }, [activeTab, events, profile, rsvpEventIds, connectionIds, user])

  const formatDate = (dt: string) => {
    const d = new Date(dt)
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const getEmptyMessage = () => {
    switch (activeTab) {
      case 1: return profile?.interests?.length > 0 ? 'No events match your interests yet' : 'Add interests in your profile to get personalized recommendations'
      case 2: return 'No events in your city yet'
      case 3: return connectionIds.length > 0 ? 'None of your connections are hosting events right now' : 'Connect with people to see their events here'
      case 4: return 'You haven\'t created or RSVPd to any events yet'
      default: return 'No events yet — be the first to create one!'
    }
  }

  const getEmptyAction = () => {
    switch (activeTab) {
      case 1: return profile?.interests?.length > 0 ? null : { label: 'Add Interests', href: '/profile/edit' }
      case 3: return connectionIds.length > 0 ? null : { label: 'Find People', href: '/communities' }
      case 4: return { label: 'Create Event', href: '/create' }
      default: return { label: 'Create Event', href: '/create' }
    }
  }

  const getCategoryEmoji = (cat: string) => {
    switch (cat) {
      case 'Music': return '🎸'
      case 'Fitness': return '🏃'
      case 'Food & Drink': return '🍺'
      case 'Tech': return '💻'
      case 'Outdoors': return '🥾'
      case 'Arts & Culture': return '🎨'
      case 'Networking': return '💼'
      case 'Social': return '🎉'
      default: return '🎉'
    }
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
          <h1 className="font-bold text-[#F0EDE6] text-xl" style={{ fontFamily: 'sans-serif' }}>
            Gathr<span className="text-[#E8B84B]">.</span>
          </h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCityPicker(true)} className="flex items-center gap-1.5 bg-[#1C241C] border border-white/10 rounded-full px-3 py-1.5">
              <div className="w-1.5 h-1.5 rounded-sm bg-[#5BCC7A]"></div>
              <span className="text-[#F0EDE6] text-xs">{profile?.city || 'Bellingham'} ↓</span>
            </button>
            <button onClick={() => router.push('/notifications')}
              className="w-8 h-8 bg-[#1C241C] border border-white/10 rounded-xl flex items-center justify-center text-base relative">
              🔔
              {notifCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-[#E8B84B] text-[#0D110D] text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center border border-[#0D110D]">
                  {notifCount > 9 ? '9+' : notifCount}
                </div>
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-2.5 mb-3 cursor-pointer" onClick={() => router.push('/search')}>
          <span className="text-[#F0EDE6] opacity-30 text-sm">🔍</span>
          <span className="text-[#F0EDE6] opacity-30 text-sm flex-1">Search events, people, vibes...</span>
          <span className="bg-[#1E3A1E] border border-[#E8B84B]/15 rounded-lg px-2 py-0.5 text-[10px] text-[#E8B84B]">Filter</span>
        </div>

        <div className="flex border-b border-white/10 -mx-4 px-4 overflow-x-auto">
          {TABS.map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)}
              className={'px-3 py-2.5 text-xs whitespace-nowrap border-b-2 -mb-px transition-colors ' + (activeTab === i ? 'text-[#E8B84B] border-[#E8B84B]' : 'text-white/40 border-transparent')}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="mb-3">
          <h2 className="text-lg font-bold text-[#F0EDE6]">
            {activeTab === 0 ? 'What\'s Popular' : activeTab === 1 ? 'Picked For You' : activeTab === 2 ? ('In ' + (profile?.city || 'Bellingham')) : activeTab === 3 ? 'Friends\' Events' : 'Your Events'}
          </h2>
          <p className="text-xs text-white/40 mt-0.5">
            {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
            {activeTab === 1 && profile?.interests?.length > 0 && (' · Based on: ' + profile.interests.slice(0, 3).join(', '))}
          </p>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="text-4xl">{activeTab === 3 ? '👥' : activeTab === 4 ? '📌' : '🎉'}</div>
            <p className="text-[#F0EDE6] opacity-50 text-sm text-center max-w-[240px]">{getEmptyMessage()}</p>
            {getEmptyAction() && (
              <button onClick={() => router.push(getEmptyAction()!.href)}
                className="mt-2 bg-[#E8B84B] text-[#0D110D] px-6 py-3 rounded-2xl font-semibold text-sm">
                {getEmptyAction()!.label}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((event, i) => (
              <div key={event.id}
                onClick={() => router.push('/events/' + event.id)}
                className="bg-[#1C241C] border border-white/10 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform">
                <div className="h-32 flex items-center justify-center text-5xl relative"
                  style={{ background: i % 3 === 0 ? 'linear-gradient(135deg,#1E3A1E,#2A1A0E)' : i % 3 === 1 ? 'linear-gradient(135deg,#1A1E2A,#0E1A0E)' : 'linear-gradient(135deg,#2A1A1A,#1A0E0E)' }}>
                  {getCategoryEmoji(event.category)}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0D110D] via-transparent to-transparent opacity-60"></div>
                  <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
                    {event.is_featured && <span className="bg-[#E8B84B] text-[#0D110D] text-[9px] font-bold px-2 py-0.5 rounded-full">Featured</span>}
                    <span className="ml-auto bg-[#0E1E0E]/90 text-[#7EC87E] text-[9px] px-2 py-0.5 rounded-full border border-[#7EC87E]/20">◉ Public</span>
                  </div>
                  {activeTab === 4 && event.host_id === user?.id && (
                    <div className="absolute bottom-2 left-2 bg-[#E8B84B]/90 text-[#0D110D] text-[9px] font-bold px-2 py-0.5 rounded-full">You're hosting</div>
                  )}
                  {activeTab === 4 && event.host_id !== user?.id && (
                    <div className="absolute bottom-2 left-2 bg-[#7EC87E]/90 text-[#0D110D] text-[9px] font-bold px-2 py-0.5 rounded-full">RSVPd</div>
                  )}
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

      {/* City picker modal */}
      {showCityPicker && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={() => { setShowCityPicker(false); setCitySearch('') }}>
          <div className="w-full max-w-md bg-[#1C241C] rounded-t-3xl p-5 pb-10 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4 flex-shrink-0"></div>
            <h3 className="text-base font-bold text-[#F0EDE6] mb-1 flex-shrink-0">Change Location</h3>
            <p className="text-xs text-white/40 mb-3 flex-shrink-0">Events and recommendations will update based on your city</p>

            <div className="flex items-center gap-2 bg-[#0D110D] border border-white/10 rounded-2xl px-4 py-2.5 mb-3 flex-shrink-0">
              <span className="text-sm text-white/30">🔍</span>
              <input
                type="text"
                value={citySearch}
                onChange={e => setCitySearch(e.target.value)}
                placeholder="Search or type a city..."
                className="flex-1 bg-transparent text-sm text-[#F0EDE6] placeholder-white/30 outline-none"
                autoFocus
              />
              {citySearch && (
                <button onClick={() => setCitySearch('')} className="text-xs text-white/30">✕</button>
              )}
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 -mx-1 px-1">
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