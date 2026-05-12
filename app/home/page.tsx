'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, connectionPairOr } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { ALL_CITIES, CAT_GRADIENT, INTEREST_TO_CATS } from '@/lib/constants'
import { CAT_EMOJI } from '@/lib/categoryEmoji'
import { isToday, isTomorrow, formatTime, formatDate, optimizedImgSrc } from '@/lib/utils'

interface Event {
  id: string; title: string; category: string; start_datetime: string; end_datetime: string
  location_name: string; city: string; spots_left: number; capacity: number
  tags: string[]; visibility: string; is_featured: boolean; host_id: string; rsvp_count?: number
}

const TABS = ['🔥 Trending', '✦ For You', '🏙 Near Me', '👥 Friends', '📌 Mine']

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  usePushNotifications(user?.id ?? null)
  const [profile, setProfile] = useState<any>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [soonEvents, setSoonEvents] = useState<Event[]>([])
  const [featuredEvent, setFeaturedEvent] = useState<Event | null>(null)
  const [activeTab, setActiveTab] = useState(() => {
    try { return parseInt(sessionStorage.getItem('gathr_home_tab') || '0') || 0 } catch { return 0 }
  })
  const [loading, setLoading] = useState(true)
  const [rsvpEventIds, setRsvpEventIds] = useState<string[]>([])
  const [connectionIds, setConnectionIds] = useState<string[]>([])
  const [showCityPicker, setShowCityPicker] = useState(false)
  const [citySearch, setCitySearch] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [geoGranted, setGeoGranted] = useState(false)
  const [bookmarkedEventIds, setBookmarkedEventIds] = useState<string[]>([])
  const [friendRsvpEventIds, setFriendRsvpEventIds] = useState<string[]>([])
  const [cityToast, setCityToast] = useState('')
  const cityToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  const { refreshing, pullProgress, handleTouchStart, handleTouchMove, handleTouchEnd } = usePullToRefresh(
    async () => { if (user) await fetchAll(user.id) }
  )

  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      if (!session) { router.push('/auth'); return }
      setUser(session.user)
      fetchAll(session.user.id)
    })

    // Refresh when the user returns to the tab / app from background.
    // Catches "edited interests on another tab" and "came back from background" cases.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && !cancelled) fetchAll(session.user.id)
      })
    }
    document.addEventListener('visibilitychange', onVisible)

    // Refresh on auth events (e.g. user signs in on another tab, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (event === 'SIGNED_IN' && session) fetchAll(session.user.id)
      if (event === 'SIGNED_OUT') router.push('/auth')
    })

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      subscription.unsubscribe()
      if (cityToastTimerRef.current) clearTimeout(cityToastTimerRef.current)
    }
  }, [router])

  // Realtime subscription on the user's own profile row — when interests / city
  // / mode change from ANYWHERE (this tab, another tab, another device), the
  // home feed receives the update instantly without waiting for refocus.
  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel('profile-self-' + user.id)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: 'id=eq.' + user.id,
      }, (payload) => {
        setProfile((prev: any) => prev ? { ...prev, ...payload.new } : payload.new)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id || !profile?.city) return
    const city = profile.city
    const channel = supabase
      .channel('home-events-' + user.id)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'events',
        filter: 'city=eq.' + city,
      }, (payload) => {
        const newEvent = payload.new as Event
        if (newEvent.visibility !== 'public') return
        if (new Date(newEvent.start_datetime) < new Date()) return
        setEvents(prev => {
          if (prev.some(e => e.id === newEvent.id)) return prev
          const updated = [...prev, newEvent].sort(
            (a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
          )
          setSoonEvents(updated.filter(e => isToday(e.start_datetime) || isTomorrow(e.start_datetime)))
          return updated
        })
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'events',
        filter: 'city=eq.' + city,
      }, (payload) => {
        const updated = payload.new as Event
        setEvents(prev => prev.map(e => e.id === updated.id ? { ...e, spots_left: updated.spots_left } : e))
        setSoonEvents(prev => prev.map(e => e.id === updated.id ? { ...e, spots_left: updated.spots_left } : e))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id, profile?.city])

  const requestGeolocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoGranted(true) },
      () => { setGeoGranted(false) },
      { timeout: 8000 }
    )
  }

  const haversineDist = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  const fetchAll = async (userId: string) => {
    try {
    const [profileRes, eventsRes, rsvpRes, connRes, notifRes, bookmarkRes] = await Promise.all([
      supabase.from('profiles').select('name,city,interests,profile_mode,avatar_url').eq('id', userId).single(),
      supabase.from('events').select('id,title,category,start_datetime,end_datetime,location_name,city,spots_left,capacity,tags,visibility,is_featured,host_id,cover_url,latitude,longitude,ticket_type,ticket_price').eq('visibility', 'public').gte('start_datetime', new Date().toISOString()).order('start_datetime', { ascending: true }).limit(50),
      supabase.from('rsvps').select('event_id').eq('user_id', userId).limit(200),
      supabase.from('connections').select('requester_id, addressee_id').or(connectionPairOr(userId)).eq('status', 'accepted').limit(500),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('read', false),
      supabase.from('event_bookmarks').select('event_id').eq('user_id', userId),
    ])
    if (profileRes.data) setProfile(profileRes.data)
    if (rsvpRes.data) setRsvpEventIds(rsvpRes.data.map((r: any) => r.event_id))
    if (notifRes.count !== null) setUnreadCount(notifRes.count)
    if (bookmarkRes.data) setBookmarkedEventIds(bookmarkRes.data.map((b: any) => b.event_id))

    if (connRes.data) {
      const friendIds = connRes.data.map((c: any) => c.requester_id === userId ? c.addressee_id : c.requester_id)
      setConnectionIds(friendIds)
      if (friendIds.length > 0) {
        const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
        const { data: friendRsvps } = await supabase.from('rsvps').select('event_id').in('user_id', friendIds).gte('created_at', oneWeekAgo).limit(500)
        if (friendRsvps) setFriendRsvpEventIds(friendRsvps.map((r: any) => r.event_id))
      }
    }

    const allEvents: Event[] = eventsRes.data || []
    setEvents(allEvents)
    setSoonEvents(allEvents.filter(e => isToday(e.start_datetime) || isTomorrow(e.start_datetime)))
    setFeaturedEvent(allEvents.find(e => e.is_featured) || null)
    if (!sessionStorage.getItem('gathr_match_check')) {
      sessionStorage.setItem('gathr_match_check', '1')
      supabase.functions.invoke('after-event-matches').catch((err) => console.error('after-event-matches:', err))
    }
    } finally {
      setLoading(false)
    }
  }

  const handleBookmark = async (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation()
    if (!user) return
    if (bookmarkedEventIds.includes(eventId)) {
      setBookmarkedEventIds(prev => prev.filter(id => id !== eventId))
      const { error } = await supabase.from('event_bookmarks').delete().eq('event_id', eventId).eq('user_id', user.id)
      if (error) setBookmarkedEventIds(prev => [...prev, eventId])
    } else {
      setBookmarkedEventIds(prev => [...prev, eventId])
      const { error } = await supabase.from('event_bookmarks').insert({ event_id: eventId, user_id: user.id })
      if (error) setBookmarkedEventIds(prev => prev.filter(id => id !== eventId))
    }
  }

  const handleCityChange = async (newCity: string) => {
    setShowCityPicker(false); setCitySearch('')
    if (!user) return
    if (!newCity || newCity.trim().length > 100) return
    await supabase.from('profiles').update({ city: newCity }).eq('id', user.id)
    setProfile((prev: any) => prev ? { ...prev, city: newCity } : prev)
    setCityToast(newCity)
    if (cityToastTimerRef.current) clearTimeout(cityToastTimerRef.current)
    cityToastTimerRef.current = setTimeout(() => setCityToast(''), 2500)
    fetchAll(user.id)
  }

  useEffect(() => {
    if (!events.length) { setFilteredEvents([]); return }
    switch (activeTab) {
      case 0: {
        const userCity = profile?.city
        let pool = userCity
          ? events.filter(e => e.city?.toLowerCase() === userCity.toLowerCase())
          : events
        if (pool.length < 4) pool = events
        setFilteredEvents([...pool].sort((a, b) => {
          const filledA = a.capacity > 0 ? (a.capacity - a.spots_left) : 0
          const filledB = b.capacity > 0 ? (b.capacity - b.spots_left) : 0
          return filledB - filledA
        }))
        break
      }
      case 1:
        if (profile?.interests?.length > 0) {
          const matched = events.filter(e => {
            const tags = (e.tags || []).map((t: string) => t.toLowerCase())
            return profile.interests.some((int: string) => {
              const mappedCats = INTEREST_TO_CATS[int.toLowerCase()] || []
              if (mappedCats.includes(e.category)) return true
              return tags.some((t: string) => t.includes(int.toLowerCase()) || int.toLowerCase().includes(t))
            })
          })
          setFilteredEvents([...matched, ...events.filter(e => !matched.includes(e))])
        } else {
          setFilteredEvents(events)
        }
        break
      case 2:
        if (userLocation) {
          const nearby = events
            .map(e => ({ ...e, _dist: haversineDist(userLocation.lat, userLocation.lng, (e as any).latitude, (e as any).longitude) }))
            .filter(e => !isNaN(e._dist) && e._dist <= 80)
            .sort((a, b) => a._dist - b._dist)
          setFilteredEvents(nearby)
        } else {
          const userCity = profile?.city || 'Bellingham'
          setFilteredEvents(events.filter(e => e.city?.toLowerCase() === userCity.toLowerCase()))
        }
        break
      case 3:
        setFilteredEvents(connectionIds.length > 0
          ? events.filter(e => friendRsvpEventIds.includes(e.id) || connectionIds.includes(e.host_id))
          : [])
        break
      case 4:
        setFilteredEvents(events.filter(e => e.host_id === user?.id || rsvpEventIds.includes(e.id)))
        break
      default:
        setFilteredEvents(events)
    }
  }, [activeTab, events, profile, rsvpEventIds, connectionIds, friendRsvpEventIds, user, userLocation])

  const getEmptyMessage = () => {
    switch (activeTab) {
      case 1: return profile?.interests?.length > 0 ? 'No events match your interests yet' : 'Add interests to get personalized picks'
      case 2: return geoGranted ? 'No events within 80km of you' : 'No events in ' + (profile?.city || 'your city') + ' yet'
      case 3: return connectionIds.length > 0 ? 'No friends have upcoming events' : 'Connect with people to see their events here'
      case 4: return 'No events yet — create or RSVP to one!'
      default: return 'No events yet — be the first!'
    }
  }

  const filteredCities = ALL_CITIES.filter(c => !citySearch || c.toLowerCase().includes(citySearch.toLowerCase()))

  if (loading) return (
    <div className="min-h-screen bg-[#0D110D] flex flex-col items-center justify-center gap-6">
      <div className="text-center">
        <h1 className="font-extrabold text-[#F0EDE6] text-5xl tracking-tight leading-none">
          Gathr<span className="text-[#E8B84B] animate-pulse">.</span>
        </h1>
      </div>
      <div className="flex gap-3">
        {['🎸', '🏃', '🍺', '💻', '🥾', '🎉'].map((emoji, i) => (
          <span key={i} className="text-xl animate-pulse" style={{ animationDelay: i * 120 + 'ms', opacity: 0.5 }}>{emoji}</span>
        ))}
      </div>
      <div className="w-10 h-0.5 bg-[#E8B84B]/40 rounded-full animate-pulse" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0D110D] pb-24"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}>
      {(refreshing || pullProgress > 0) && (
        <div className="fixed top-0 left-0 right-0 h-0.5 z-[100]" style={{ background: 'rgba(232,184,75,0.25)' }}>
          <div className={'h-full bg-[#E8B84B] ' + (refreshing ? 'animate-pulse w-full' : 'transition-none')}
            style={!refreshing ? { width: pullProgress * 100 + '%' } : undefined} />
        </div>
      )}
      {cityToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[90] bg-[#1C241C] border border-[#E8B84B]/25 text-[#E8B84B] text-xs font-semibold px-4 py-2 rounded-full shadow-lg pointer-events-none">
          📍 {cityToast}
        </div>
      )}
      <div className="px-4 pt-14 pb-0 bg-[#0D110D]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-extrabold text-[#F0EDE6] text-2xl tracking-tight leading-none font-display">Gathr<span className="text-[#E8B84B]">.</span></h1>
            {profile?.name && <p className="text-xs text-white/30 mt-0.5">Hey {profile.name.split(' ')[0]} 👋</p>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/map')}
              className="w-9 h-9 bg-[#1C241C] border border-[#7EC87E]/20 rounded-xl flex items-center justify-center text-[#7EC87E] active:scale-95 transition-all btn-glow-location">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </button>
            <button onClick={() => router.push('/notifications')}
              className={'w-9 h-9 rounded-xl flex items-center justify-center relative transition-all active:scale-95 ' + (unreadCount > 0 ? 'bg-[#E8B84B]/10 border border-[#E8B84B]/30 text-[#E8B84B]' : 'bg-[#1C241C] border border-white/10 text-[#F0EDE6]')}
              style={unreadCount > 0 ? { boxShadow: '0 0 14px rgba(232,184,75,0.18)' } : undefined}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-[#E85B5B] rounded-full flex items-center justify-center border-2 border-[#0D110D] soft-pulse">
                  <span className="text-[9px] font-bold text-white px-0.5">{unreadCount > 9 ? '9+' : unreadCount}</span>
                </div>
              )}
            </button>
            <button onClick={() => setShowCityPicker(true)}
              className="flex items-center gap-1.5 bg-[#1C241C] border border-white/10 rounded-full px-3 py-1.5 active:scale-95 transition-all btn-glow-location">
              <div className="w-1.5 h-1.5 rounded-full bg-[#5BCC7A] animate-pulse"></div>
              <span className="text-[#F0EDE6] text-xs font-medium">{profile?.city || 'Bellingham'}</span>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5 bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-2.5 mb-4 cursor-pointer active:opacity-80 transition-opacity"
          onClick={() => router.push('/search')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/30 flex-shrink-0">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span className="text-white/30 text-sm flex-1">Search events, people, vibes...</span>
          <span className="bg-[#1E3A1E] border border-[#E8B84B]/15 rounded-lg px-2 py-0.5 text-[10px] text-[#E8B84B]">⚡ Search</span>
        </div>

        {soonEvents.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#E85B5B] animate-pulse"></div>
                <span className="text-xs font-semibold text-[#F0EDE6]">Happening Soon</span>
              </div>
              <span className="text-[10px] text-white/30">{soonEvents.length} event{soonEvents.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
              {soonEvents.map(event => {
                const isRsvpd = rsvpEventIds.includes(event.id)
                return (
                  <div key={event.id} onClick={() => router.push('/events/' + event.id)}
                    className={'flex-shrink-0 w-44 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition-transform border ' + (isRsvpd ? 'border-[#7EC87E]/30' : 'border-white/10')}>
                    <div className="category-gradient-card h-20 flex items-center justify-center text-3xl relative"
                      style={{ background: CAT_GRADIENT[event.category] || CAT_GRADIENT['Social'] }}>
                      <span>{CAT_EMOJI[event.category] || '🎉'}</span>
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1C241C] via-transparent to-transparent opacity-70"></div>
                      {isRsvpd && <div className="absolute top-1.5 right-1.5 bg-[#7EC87E] text-[#0D110D] text-[8px] font-bold px-1.5 py-0.5 rounded-full">Going ✓</div>}
                      <div className="absolute bottom-1.5 left-2 right-2">
                        <div className={'text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block ' + (isToday(event.start_datetime) ? 'bg-[#E85B5B]/90 text-white' : 'bg-[#E8B84B]/90 text-[#0D110D]')}>
                          {isToday(event.start_datetime) ? 'Today' : 'Tomorrow'} · {formatTime(event.start_datetime)}
                        </div>
                      </div>
                    </div>
                    <div className="p-2 bg-[#1C241C]">
                      <div className="text-xs font-semibold text-[#F0EDE6] truncate leading-snug">{event.title}</div>
                      <div className="text-[9px] text-white/40 mt-0.5 truncate">{event.location_name}</div>
                      {event.spots_left > 0 && event.spots_left < 15 && <div className="text-[9px] text-[#E8A84B] mt-0.5">{event.spots_left} spots left</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {featuredEvent && activeTab === 0 && (
          <div onClick={() => router.push('/events/' + featuredEvent.id)}
            className="rounded-3xl overflow-hidden mb-4 cursor-pointer active:scale-[0.98] transition-transform border border-[#E8B84B]/20">
            <div className="category-gradient-card h-36 flex items-center justify-center text-5xl relative"
              style={{ background: CAT_GRADIENT[featuredEvent.category] || CAT_GRADIENT['Social'] }}>
              {optimizedImgSrc((featuredEvent as any).cover_url, 800) && <img src={optimizedImgSrc((featuredEvent as any).cover_url, 800)!} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />}
              <span className="relative z-10">{CAT_EMOJI[featuredEvent.category] || '🎉'}</span>
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

        <div className="flex border-b border-white/10 -mx-4 px-4 overflow-x-auto scrollbar-hide">
          {TABS.map((tab, i) => (
            <button key={tab} onClick={() => { setActiveTab(i); try { sessionStorage.setItem('gathr_home_tab', String(i)) } catch {} }}
              className={'px-3 py-2.5 text-xs whitespace-nowrap border-b-2 -mb-px transition-colors ' + (activeTab === i ? 'text-[#E8B84B] border-[#E8B84B]' : 'text-white/40 border-transparent')}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-[#F0EDE6]">
              {activeTab === 0 ? "What's Popular" : activeTab === 1 ? 'Picked For You' : activeTab === 2 ? (geoGranted ? 'Near You' : 'In ' + (profile?.city || 'Bellingham')) : activeTab === 3 ? "Friends' Events" : 'Your Events'}
            </h2>
            <p className="text-[10px] text-white/30 mt-0.5">
              {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
              {activeTab === 1 && profile?.interests?.length > 0 && (' · ' + profile.interests.slice(0, 3).join(', '))}
              {activeTab === 2 && geoGranted && ' · GPS'}
            </p>
          </div>
          {activeTab === 2 && !geoGranted && (
            <button onClick={requestGeolocation}
              className="flex items-center gap-1 text-[10px] text-[#E8B84B] bg-[#E8B84B]/10 border border-[#E8B84B]/20 px-2.5 py-1.5 rounded-xl">
              📍 Use GPS
            </button>
          )}
        </div>

        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="text-4xl">{activeTab === 3 ? '👥' : activeTab === 4 ? '📌' : '🎉'}</div>
            <p className="text-white/40 text-sm text-center max-w-[240px]">{getEmptyMessage()}</p>
            {activeTab === 1 && !profile?.interests?.length && (
              <button onClick={() => router.push('/profile/edit')} className="mt-1 bg-[#E8B84B] text-[#0D110D] px-5 py-2.5 rounded-2xl font-semibold text-sm">Add Interests</button>
            )}
            {activeTab === 2 && !geoGranted && (
              <button onClick={requestGeolocation} className="mt-1 bg-[#E8B84B] text-[#0D110D] px-5 py-2.5 rounded-2xl font-semibold text-sm">📍 Use My Location</button>
            )}
            {activeTab === 2 && geoGranted && (
              <button onClick={() => router.push('/create')} className="mt-1 bg-[#1C241C] border border-white/10 text-white/60 px-5 py-2.5 rounded-2xl font-semibold text-sm">Host something nearby</button>
            )}
            {activeTab === 3 && !connectionIds.length && (
              <button onClick={() => router.push('/communities')} className="mt-1 bg-[#E8B84B] text-[#0D110D] px-5 py-2.5 rounded-2xl font-semibold text-sm">Find People</button>
            )}
            {activeTab === 4 && (
              <button onClick={() => router.push('/create')} className="mt-1 bg-[#E8B84B] text-[#0D110D] px-5 py-2.5 rounded-2xl font-semibold text-sm">Create Event</button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map(event => {
              const isRsvpd = rsvpEventIds.includes(event.id)
              const isHost = event.host_id === user?.id
              const isSoon = isToday(event.start_datetime) || isTomorrow(event.start_datetime)
              const fillPct = event.capacity > 0 ? Math.round(((event.capacity - event.spots_left) / event.capacity) * 100) : 0
              const isBookmarked = bookmarkedEventIds.includes(event.id)
              return (
                <div key={event.id} onClick={() => router.push('/events/' + event.id)}
                  className={'bg-[#1C241C] rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform border ' + (isRsvpd ? 'border-[#7EC87E]/25' : 'border-white/10')}>
                  <div className="category-gradient-card h-28 flex items-center justify-center text-4xl relative"
                    style={{ background: CAT_GRADIENT[event.category] || CAT_GRADIENT['Social'] }}>
                    {optimizedImgSrc((event as any).cover_url, 800) && <img src={optimizedImgSrc((event as any).cover_url, 800)!} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />}
                    <span className="relative z-10">{CAT_EMOJI[event.category] || '🎉'}</span>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1C241C] via-transparent to-transparent opacity-80"></div>
                    <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
                      <div className="flex gap-1">
                        {event.is_featured && <span className="bg-[#E8B84B] text-[#0D110D] text-[8px] font-bold px-2 py-0.5 rounded-full">⭐ Featured</span>}
                        {isSoon && <span className={'text-[8px] font-bold px-2 py-0.5 rounded-full ' + (isToday(event.start_datetime) ? 'bg-[#E85B5B]/90 text-white' : 'bg-[#E8B84B]/90 text-[#0D110D]')}>{isToday(event.start_datetime) ? '🔴 Today' : '🟡 Tomorrow'}</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        {isRsvpd && <span className="bg-[#7EC87E]/90 text-[#0D110D] text-[8px] font-bold px-2 py-0.5 rounded-full">Going ✓</span>}
                        {isHost && !isRsvpd && <span className="bg-[#E8B84B]/90 text-[#0D110D] text-[8px] font-bold px-2 py-0.5 rounded-full">Hosting</span>}
                        <button onClick={(e) => handleBookmark(e, event.id)}
                          className={'w-6 h-6 rounded-lg flex items-center justify-center text-[11px] transition-all ' + (isBookmarked ? 'bg-[#E8B84B]/25 text-[#E8B84B]' : 'bg-black/30 text-white/50')}>
                          🔖
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-[#F0EDE6] text-sm mb-1.5 leading-snug">{event.title}</h3>
                    <div className="flex items-center gap-3 text-[10px] text-white/45 mb-2">
                      <span>📅 {formatDate(event.start_datetime)}</span>
                      <span>📍 {event.location_name}</span>
                      {activeTab === 2 && userLocation && (event as any)._dist !== undefined && (
                        <span className="text-[#7EC87E]">
                          {(event as any)._dist < 1 ? Math.round((event as any)._dist * 1000) + 'm' : ((event as any)._dist).toFixed(1) + 'km'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1.5 flex-wrap flex-1 items-center">
                        {event.tags?.slice(0, 2).map(tag => (
                          <span key={tag} className="bg-[#2A4A2A]/40 text-[#7EC87E] text-[9px] px-1.5 py-0.5 rounded border border-[#7EC87E]/10">#{tag}</span>
                        ))}
                        {(event as any).ticket_type === 'paid' && (event as any).ticket_price > 0 && (
                          <span className="text-[9px] font-bold text-[#E8B84B] bg-[#E8B84B]/10 border border-[#E8B84B]/20 px-1.5 py-0.5 rounded">${(event as any).ticket_price}</span>
                        )}
                        {(event as any).ticket_type === 'donation' && (
                          <span className="text-[9px] text-[#7EC87E] bg-[#7EC87E]/10 border border-[#7EC87E]/20 px-1.5 py-0.5 rounded">Donation</span>
                        )}
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

      {showCityPicker && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={() => { setShowCityPicker(false); setCitySearch('') }}>
          <div className="w-full max-w-md bg-[#1C241C] rounded-t-3xl p-5 pb-10 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4 flex-shrink-0"></div>
            <h3 className="text-base font-bold text-[#F0EDE6] mb-1 flex-shrink-0">Change Location</h3>
            <p className="text-xs text-white/40 mb-3 flex-shrink-0">Events and recommendations update by city</p>
            <div className="flex items-center gap-2 bg-[#0D110D] border border-white/10 rounded-2xl px-4 py-2.5 mb-3 flex-shrink-0">
              <span className="text-sm text-white/30">🔍</span>
              <input type="text" value={citySearch} onChange={e => setCitySearch(e.target.value)}
                placeholder="Search or type a city..."
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
