'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { usePushNotifications } from '@/hooks/usePushNotifications'

interface Event {
  id: string; title: string; category: string; start_datetime: string; end_datetime: string
  location_name: string; city: string; spots_left: number; capacity: number
  tags: string[]; visibility: string; is_featured: boolean; host_id: string; rsvp_count?: number
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
  'Music': '🎸', 'DJ & Electronic': '🎧', 'Hip Hop & R&B': '🎤', 'Jazz & Blues': '🎷', 'Live Concerts & Festivals': '🎪',
  'Fitness': '🏃', 'Yoga & Pilates': '🧘', 'Running & Cycling': '🚴', 'Climbing & Hiking': '🧗', 'Combat Sports & CrossFit': '🥊',
  'Food & Drink': '🍺', 'Coffee & Brunch': '☕', 'Wine & Cocktails': '🍷', 'Cooking & Culinary': '👨‍🍳', 'Street Food & Markets': '🌮',
  'Tech & Coding': '💻', 'Startups & Entrepreneurship': '🚀', 'AI & Innovation': '🤖', 'Gaming & Esports': '🎮', 'Web3 & Crypto': '⛓',
  'Outdoors & Adventure': '🥾', 'Hiking & Camping': '⛺', 'Water Sports': '🏄', 'Snow Sports': '🎿',
  'Arts & Culture': '🎨', 'Photography & Film': '📷', 'Theatre & Comedy': '🎭', 'Fashion & Style': '👗', 'Literature & Writing': '📚',
  'Social & Parties': '🎉', 'Nightlife': '🌙', 'Networking': '💼', 'Business & Finance': '📈',
  'Wellness & Mindfulness': '🌿', 'Dance & Movement': '💃', 'Spirituality': '✨', 'Volunteering & Activism': '🌱',
  'Education & Workshops': '🎓', 'Sports & Recreation': '⚽', 'Pets & Animals': '🐾', 'Science & Innovation': '🔬',
  'Markets & Pop-ups': '🏪',
  'Tech': '💻', 'Outdoors': '🥾', 'Social': '🎉',
}

const CAT_GRADIENT: Record<string, string> = {
  'Music': 'linear-gradient(135deg,#1E2E3A,#1A0E2A)',
  'DJ & Electronic': 'linear-gradient(135deg,#1A0E2A,#0E0A1E)',
  'Hip Hop & R&B': 'linear-gradient(135deg,#2A0E1A,#1A0E0E)',
  'Jazz & Blues': 'linear-gradient(135deg,#0E1A2A,#1A1E2A)',
  'Live Concerts & Festivals': 'linear-gradient(135deg,#1E1A2A,#2A1E0E)',
  'Fitness': 'linear-gradient(135deg,#2A1E0E,#1A2A0E)',
  'Yoga & Pilates': 'linear-gradient(135deg,#1A2A1A,#0E2A1A)',
  'Running & Cycling': 'linear-gradient(135deg,#2A2A0E,#1A2A0E)',
  'Climbing & Hiking': 'linear-gradient(135deg,#1A2A1A,#0E1A0E)',
  'Combat Sports & CrossFit': 'linear-gradient(135deg,#2A1A0E,#1A0E0E)',
  'Food & Drink': 'linear-gradient(135deg,#2A1A0E,#1E1A0E)',
  'Coffee & Brunch': 'linear-gradient(135deg,#2A1E0E,#1A1A0E)',
  'Wine & Cocktails': 'linear-gradient(135deg,#2A0E1A,#1A0E0E)',
  'Cooking & Culinary': 'linear-gradient(135deg,#2A1A0E,#2A0E0E)',
  'Street Food & Markets': 'linear-gradient(135deg,#2A1E0E,#1E2A0E)',
  'Tech & Coding': 'linear-gradient(135deg,#1A1E2A,#0E1A2A)',
  'Startups & Entrepreneurship': 'linear-gradient(135deg,#1E1A2A,#2A1A0E)',
  'AI & Innovation': 'linear-gradient(135deg,#0E1A2A,#1A0E2A)',
  'Gaming & Esports': 'linear-gradient(135deg,#1A0E2A,#0E0A1E)',
  'Web3 & Crypto': 'linear-gradient(135deg,#1A1E0E,#0E1A2A)',
  'Outdoors & Adventure': 'linear-gradient(135deg,#1A2A1A,#0E2A1A)',
  'Hiking & Camping': 'linear-gradient(135deg,#1A2A1A,#0E1A0E)',
  'Water Sports': 'linear-gradient(135deg,#0E1A2A,#1A2A2A)',
  'Snow Sports': 'linear-gradient(135deg,#1A1E2A,#0E1A2A)',
  'Arts & Culture': 'linear-gradient(135deg,#2A1A2A,#1A0E1E)',
  'Photography & Film': 'linear-gradient(135deg,#1A1A1A,#2A1A0E)',
  'Theatre & Comedy': 'linear-gradient(135deg,#2A1A0E,#1A0E2A)',
  'Fashion & Style': 'linear-gradient(135deg,#2A0E1A,#1A0E2A)',
  'Literature & Writing': 'linear-gradient(135deg,#1A1E2A,#0E1A1A)',
  'Social & Parties': 'linear-gradient(135deg,#1E3A1E,#2A1A0E)',
  'Nightlife': 'linear-gradient(135deg,#1A0E2A,#0E0A1A)',
  'Networking': 'linear-gradient(135deg,#1E1A2A,#1A1E2A)',
  'Business & Finance': 'linear-gradient(135deg,#1A1E2A,#2A1A0E)',
  'Wellness & Mindfulness': 'linear-gradient(135deg,#1A2A1A,#2A2A0E)',
  'Dance & Movement': 'linear-gradient(135deg,#2A0E1A,#1A0E2A)',
  'Spirituality': 'linear-gradient(135deg,#1A0E2A,#2A1A0E)',
  'Volunteering & Activism': 'linear-gradient(135deg,#1A2A1A,#0E2A1A)',
  'Education & Workshops': 'linear-gradient(135deg,#1A1E2A,#0E1A2A)',
  'Sports & Recreation': 'linear-gradient(135deg,#1E2A0E,#2A1E0E)',
  'Pets & Animals': 'linear-gradient(135deg,#2A2A0E,#1A2A0E)',
  'Science & Innovation': 'linear-gradient(135deg,#0E1A2A,#1A1E2A)',
  'Markets & Pop-ups': 'linear-gradient(135deg,#2A1E0E,#1A2A0E)',
  'Tech': 'linear-gradient(135deg,#1A1E2A,#0E1A2A)',
  'Outdoors': 'linear-gradient(135deg,#1A2A1A,#0E2A1A)',
  'Social': 'linear-gradient(135deg,#1E3A1E,#2A1A0E)',
}

const INTEREST_TO_CATS: Record<string, string[]> = {
  'music': ['Music', 'Live Concerts & Festivals'], 'live music': ['Music', 'Live Concerts & Festivals'],
  'concerts': ['Live Concerts & Festivals'], 'festivals': ['Live Concerts & Festivals'],
  'dj': ['DJ & Electronic'], 'electronic': ['DJ & Electronic'], 'hip hop': ['Hip Hop & R&B'],
  'jazz': ['Jazz & Blues'], 'classical': ['Jazz & Blues'], 'indie': ['Music'], 'rock': ['Music'],
  'r&b': ['Hip Hop & R&B'], 'pop': ['Music'], 'rap': ['Hip Hop & R&B'], 'karaoke': ['Music', 'Social & Parties'],
  'film': ['Photography & Film'], 'movies': ['Photography & Film'], 'theatre': ['Theatre & Comedy'],
  'comedy': ['Theatre & Comedy'], 'stand-up': ['Theatre & Comedy'], 'podcasts': ['Tech & Coding', 'Social & Parties'],
  'art': ['Arts & Culture'], 'photography': ['Photography & Film'],
  'painting': ['Arts & Culture'], 'drawing': ['Arts & Culture'], 'ceramics': ['Arts & Culture'],
  'fashion': ['Fashion & Style'], 'design': ['Arts & Culture'], 'architecture': ['Arts & Culture'],
  'writing': ['Literature & Writing'], 'poetry': ['Literature & Writing'], 'books': ['Literature & Writing'],
  'reading': ['Literature & Writing'], 'history': ['Arts & Culture'], 'museums': ['Arts & Culture'],
  'food': ['Food & Drink', 'Street Food & Markets'], 'coffee': ['Coffee & Brunch'],
  'wine': ['Wine & Cocktails'], 'beer': ['Food & Drink', 'Wine & Cocktails'],
  'cocktails': ['Wine & Cocktails'], 'cooking': ['Cooking & Culinary'], 'baking': ['Cooking & Culinary'],
  'brunch': ['Coffee & Brunch'], 'restaurants': ['Food & Drink'], 'street food': ['Street Food & Markets'],
  'vegan': ['Cooking & Culinary'], 'vegetarian': ['Cooking & Culinary'],
  'craft beer': ['Wine & Cocktails'], 'whiskey': ['Wine & Cocktails'], 'tea': ['Coffee & Brunch'],
  'fitness': ['Fitness'], 'running': ['Running & Cycling'], 'gym': ['Fitness'],
  'yoga': ['Yoga & Pilates'], 'pilates': ['Yoga & Pilates'], 'cycling': ['Running & Cycling'],
  'swimming': ['Water Sports'], 'rock climbing': ['Climbing & Hiking'], 'martial arts': ['Combat Sports & CrossFit'],
  'boxing': ['Combat Sports & CrossFit'], 'crossfit': ['Combat Sports & CrossFit'],
  'wellness': ['Wellness & Mindfulness'], 'meditation': ['Wellness & Mindfulness'],
  'mental health': ['Wellness & Mindfulness'], 'nutrition': ['Cooking & Culinary'],
  'dancing': ['Dance & Movement'], 'salsa': ['Dance & Movement'], 'bachata': ['Dance & Movement'],
  'outdoors': ['Outdoors & Adventure'], 'hiking': ['Climbing & Hiking', 'Hiking & Camping'],
  'camping': ['Hiking & Camping'], 'surfing': ['Water Sports'], 'skiing': ['Snow Sports'],
  'snowboarding': ['Snow Sports'], 'kayaking': ['Water Sports'], 'travel': ['Outdoors & Adventure'],
  'adventure': ['Outdoors & Adventure'], 'nature': ['Outdoors & Adventure', 'Hiking & Camping'],
  'gardening': ['Volunteering & Activism'], 'birdwatching': ['Outdoors & Adventure'],
  'tech': ['Tech & Coding'], 'startups': ['Startups & Entrepreneurship'], 'ai': ['AI & Innovation'],
  'crypto': ['Web3 & Crypto'], 'coding': ['Tech & Coding'], 'ux': ['Tech & Coding'],
  'product': ['Startups & Entrepreneurship'], 'entrepreneurship': ['Startups & Entrepreneurship'],
  'investing': ['Business & Finance'], 'business': ['Business & Finance'], 'marketing': ['Business & Finance'],
  'web3': ['Web3 & Crypto'], 'gaming': ['Gaming & Esports'], 'esports': ['Gaming & Esports'],
  'sports': ['Sports & Recreation'], 'football': ['Sports & Recreation'], 'basketball': ['Sports & Recreation'],
  'soccer': ['Sports & Recreation'], 'tennis': ['Sports & Recreation'], 'golf': ['Sports & Recreation'],
  'baseball': ['Sports & Recreation'], 'hockey': ['Sports & Recreation'], 'volleyball': ['Sports & Recreation'],
  'f1': ['Sports & Recreation'], 'motorsports': ['Sports & Recreation'], 'mma': ['Combat Sports & CrossFit'],
  'networking': ['Networking'], 'volunteering': ['Volunteering & Activism'],
  'activism': ['Volunteering & Activism'], 'sustainability': ['Volunteering & Activism'],
  'community': ['Social & Parties', 'Volunteering & Activism'], 'nightlife': ['Nightlife'],
  'parties': ['Social & Parties'], 'mindfulness': ['Wellness & Mindfulness'],
  'self-improvement': ['Wellness & Mindfulness', 'Education & Workshops'],
  'astrology': ['Spirituality'], 'spirituality': ['Spirituality'], 'science': ['Science & Innovation'],
  'languages': ['Education & Workshops'], 'pets': ['Pets & Animals'], 'dogs': ['Pets & Animals'],
}

function isToday(dt: string) {
  const d = new Date(dt), now = new Date()
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}
function isTomorrow(dt: string) {
  const d = new Date(dt), tom = new Date(); tom.setDate(tom.getDate() + 1)
  return d.getDate() === tom.getDate() && d.getMonth() === tom.getMonth() && d.getFullYear() === tom.getFullYear()
}
function formatTime(dt: string) { return new Date(dt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) }
function formatDate(dt: string) {
  const d = new Date(dt)
  if (isToday(dt)) return 'Today · ' + formatTime(dt)
  if (isTomorrow(dt)) return 'Tomorrow · ' + formatTime(dt)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + formatTime(dt)
}

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  usePushNotifications(user?.id ?? null)
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
  const [unreadCount, setUnreadCount] = useState(0)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [geoGranted, setGeoGranted] = useState(false)
  const [bookmarkedEventIds, setBookmarkedEventIds] = useState<string[]>([])
  const router = useRouter()

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUser(session.user)
      fetchAll(session.user.id)
      channel = supabase
        .channel('home-events')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, () => fetchAll(session.user.id))
        .subscribe()
    })
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])

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
    const [profileRes, eventsRes, rsvpRes, connRes, notifRes, bookmarkRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('events').select('*').eq('visibility', 'public').gte('start_datetime', new Date().toISOString()).order('start_datetime', { ascending: true }).limit(100),
      supabase.from('rsvps').select('event_id').eq('user_id', userId),
      supabase.from('connections').select('requester_id, addressee_id').or('requester_id.eq.' + userId + ',addressee_id.eq.' + userId).eq('status', 'accepted'),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('read', false),
      supabase.from('event_bookmarks').select('event_id').eq('user_id', userId),
    ])
    if (profileRes.data) setProfile(profileRes.data)
    if (rsvpRes.data) setRsvpEventIds(rsvpRes.data.map((r: any) => r.event_id))
    if (connRes.data) setConnectionIds(connRes.data.map((c: any) => c.requester_id === userId ? c.addressee_id : c.requester_id))
    if (notifRes.count) setUnreadCount(notifRes.count)
    if (bookmarkRes.data) setBookmarkedEventIds(bookmarkRes.data.map((b: any) => b.event_id))
    const allEvents: Event[] = eventsRes.data || []
    setEvents(allEvents)
    setSoonEvents(allEvents.filter(e => isToday(e.start_datetime) || isTomorrow(e.start_datetime)))
    setFeaturedEvent(allEvents.find(e => e.is_featured) || null)
    setLoading(false)
    checkAfterEventMatches(userId)
  }

  const checkAfterEventMatches = async (userId: string) => {
    const now = new Date().toISOString()
    const cutoff = new Date(Date.now() - 48 * 3600000).toISOString()

    const { data: rsvpData } = await supabase.from('rsvps').select('event_id').eq('user_id', userId)
    if (!rsvpData?.length) return
    const eventIds = rsvpData.map((r: any) => r.event_id)

    const [eventsRes, existingNotifsRes] = await Promise.all([
      supabase.from('events').select('id, title').in('id', eventIds).gte('end_datetime', cutoff).lte('end_datetime', now),
      supabase.from('notifications').select('link').eq('user_id', userId).eq('type', 'after_event_match'),
    ])

    const recentEvents = eventsRes.data || []
    if (!recentEvents.length) return

    const notifiedLinks = new Set((existingNotifsRes.data || []).map((n: any) => n.link))

    for (const evt of recentEvents) {
      const link = '/events/' + evt.id
      if (notifiedLinks.has(link)) continue

      const { data: otherAttendees } = await supabase
        .from('rsvps').select('user_id').eq('event_id', evt.id).neq('user_id', userId)
      if (!otherAttendees?.length) continue

      const otherIds = otherAttendees.map((a: any) => a.user_id)
      const [matchingRes, connectionsRes] = await Promise.all([
        supabase.from('profiles').select('id').in('id', otherIds).eq('matching_enabled', true),
        supabase.from('connections').select('requester_id, addressee_id').or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
      ])

      const connectedIds = new Set(
        (connectionsRes.data || []).map((c: any) => c.requester_id === userId ? c.addressee_id : c.requester_id)
      )
      const unconnected = (matchingRes.data || []).filter((p: any) => !connectedIds.has(p.id))
      if (!unconnected.length) continue

      await supabase.from('notifications').insert({
        user_id: userId,
        actor_id: null,
        type: 'after_event_match',
        title: `You were at ${evt.title}`,
        body: `${unconnected.length} ${unconnected.length === 1 ? 'person' : 'people'} you crossed paths with ${unconnected.length === 1 ? 'is' : 'are'} open to connecting`,
        link,
        read: false,
      })
    }
  }

  const handleBookmark = async (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation()
    if (!user) return
    if (bookmarkedEventIds.includes(eventId)) {
      await supabase.from('event_bookmarks').delete().eq('event_id', eventId).eq('user_id', user.id)
      setBookmarkedEventIds(prev => prev.filter(id => id !== eventId))
    } else {
      await supabase.from('event_bookmarks').insert({ event_id: eventId, user_id: user.id })
      setBookmarkedEventIds(prev => [...prev, eventId])
    }
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
        setFilteredEvents(connectionIds.length > 0 ? events.filter(e => connectionIds.includes(e.host_id)) : [])
        break
      case 4:
        setFilteredEvents(events.filter(e => e.host_id === user?.id || rsvpEventIds.includes(e.id)))
        break
      default:
        setFilteredEvents(events)
    }
  }, [activeTab, events, profile, rsvpEventIds, connectionIds, user, userLocation])

  const getEmptyMessage = () => {
    switch (activeTab) {
      case 1: return profile?.interests?.length > 0 ? 'No events match your interests yet' : 'Add interests to get personalized picks'
      case 2: return geoGranted ? 'No events within 80km of you' : 'No events in ' + (profile?.city || 'your city') + ' yet'
      case 3: return connectionIds.length > 0 ? 'No friends are hosting right now' : 'Connect with people to see their events here'
      case 4: return 'No events yet — create or RSVP to one!'
      default: return 'No events yet — be the first!'
    }
  }

  const filteredCities = ALL_CITIES.filter(c => !citySearch || c.toLowerCase().includes(citySearch.toLowerCase()))

  if (loading) return (
    <div className="min-h-screen bg-[#0D110D] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-5xl font-extrabold text-[#F0EDE6] tracking-tight leading-none font-display">Gathr<span className="text-[#E8B84B]">.</span></h1>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#E8B84B] animate-pulse" style={{ animationDelay: `${i * 180}ms` }} />
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0D110D] pb-24">
      <div className="px-4 pt-14 pb-0 bg-[#0D110D]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-extrabold text-[#F0EDE6] text-2xl tracking-tight leading-none font-display">Gathr<span className="text-[#E8B84B]">.</span></h1>
            {profile?.name && <p className="text-xs text-white/30 mt-0.5">Hey {profile.name.split(' ')[0]} 👋</p>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/notifications')}
              className="w-9 h-9 bg-[#1C241C] border border-white/10 rounded-xl flex items-center justify-center relative">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F0EDE6" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-[#E85B5B] rounded-full flex items-center justify-center border-2 border-[#0D110D]">
                  <span className="text-[9px] font-bold text-white px-0.5">{unreadCount > 9 ? '9+' : unreadCount}</span>
                </div>
              )}
            </button>
            <button onClick={() => setShowCityPicker(true)}
              className="flex items-center gap-1.5 bg-[#1C241C] border border-white/10 rounded-full px-3 py-1.5">
              <div className="w-1.5 h-1.5 rounded-sm bg-[#5BCC7A]"></div>
              <span className="text-[#F0EDE6] text-xs">{profile?.city || 'Bellingham'} ↓</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-2.5 mb-4 cursor-pointer active:opacity-80"
          onClick={() => router.push('/search')}>
          <span className="text-white/30 text-sm">🔍</span>
          <span className="text-white/30 text-sm flex-1">Search events, people, vibes...</span>
          <span className="bg-[#1E3A1E] border border-[#E8B84B]/15 rounded-lg px-2 py-0.5 text-[10px] text-[#E8B84B]">✨ AI</span>
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={() => router.push('/communities')}
            className="flex items-center gap-1.5 bg-[#1C241C] border border-[#E8B84B]/20 rounded-full px-3 py-1.5 active:opacity-70 transition-opacity">
            <span className="text-xs">👥</span>
            <span className="text-xs text-[#F0EDE6]/65 font-medium">Communities</span>
          </button>
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
                    <div className="h-20 flex items-center justify-center text-3xl relative"
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
            <div className="h-36 flex items-center justify-center text-5xl relative"
              style={{ background: CAT_GRADIENT[featuredEvent.category] || CAT_GRADIENT['Social'] }}>
              {(featuredEvent as any).cover_url && <img src={(featuredEvent as any).cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
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
            <button key={tab} onClick={() => setActiveTab(i)}
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
                  <div className="h-28 flex items-center justify-center text-4xl relative"
                    style={{ background: CAT_GRADIENT[event.category] || CAT_GRADIENT['Social'] }}>
                    {(event as any).cover_url && <img src={(event as any).cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
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
