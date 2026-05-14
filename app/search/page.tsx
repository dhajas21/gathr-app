'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { optimizedImgSrc, formatDate } from '@/lib/utils'
import { cityToTimezone, CAT_GRADIENT } from '@/lib/constants'
import PageTransition from '@/components/PageTransition'

const CATEGORIES = ['All', 'Music', 'Fitness', 'Food & Drink', 'Tech & Coding', 'Outdoors & Adventure', 'Arts & Culture', 'Social & Parties', 'Wellness & Mindfulness', 'Networking']
const RECENT_SEARCHES_KEY = 'gathr_recent_searches'
const RECENTLY_VIEWED_KEY = 'gathr_recently_viewed'

const BROWSE_CAT_EMOJI: Record<string, string> = {
  'Music':'🎸','DJ & Electronic':'🎧','Hip Hop & R&B':'🎤','Jazz & Blues':'🎷','Live Concerts & Festivals':'🎪',
  'Fitness':'🏃','Yoga & Pilates':'🧘','Running & Cycling':'🚴','Climbing & Hiking':'🧗','Combat Sports & CrossFit':'🥊',
  'Food & Drink':'🍺','Coffee & Brunch':'☕','Wine & Cocktails':'🍷','Cooking & Culinary':'👨‍🍳','Street Food & Markets':'🌮',
  'Tech & Coding':'💻','Startups & Entrepreneurship':'🚀','AI & Innovation':'🤖','Gaming & Esports':'🎮','Web3 & Crypto':'⛓',
  'Outdoors & Adventure':'🥾','Hiking & Camping':'⛺','Water Sports':'🏄','Snow Sports':'🎿',
  'Arts & Culture':'🎨','Photography & Film':'📷','Theatre & Comedy':'🎭','Fashion & Style':'👗','Literature & Writing':'📚',
  'Social & Parties':'🎉','Nightlife':'🌙','Networking':'💼','Business & Finance':'📈',
  'Wellness & Mindfulness':'🌿','Dance & Movement':'💃','Spirituality':'✨','Volunteering & Activism':'🌱',
  'Education & Workshops':'🎓','Sports & Recreation':'⚽','Pets & Animals':'🐾','Science & Innovation':'🔬','Markets & Pop-ups':'🏪',
}

const DAY_KEYWORDS: Record<string, number> = {
  'today': 0, 'tonight': 0, 'tomorrow': 1,
  'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
  'friday': 5, 'saturday': 6, 'sunday': 0,
  'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6, 'sun': 0,
}
const TIME_KEYWORDS = ['morning', 'afternoon', 'evening', 'night', 'tonight', 'late']
const CATEGORY_SYNONYMS: Record<string, string> = {
  // Music — phrases first (longer matches take priority)
  'live music': 'Music', 'open mic': 'Music', 'hip hop': 'Music',
  'music': 'Music', 'concert': 'Music', 'gig': 'Music', 'show': 'Music', 'band': 'Music',
  'dj': 'Music', 'electronic': 'Music', 'jazz': 'Music', 'blues': 'Music',
  'festival': 'Music', 'karaoke': 'Music', 'acoustic': 'Music', 'rapper': 'Music',
  // Fitness
  'fitness': 'Fitness', 'run': 'Fitness', 'running': 'Fitness', 'workout': 'Fitness',
  'gym': 'Fitness', 'exercise': 'Fitness', 'crossfit': 'Fitness', 'cycling': 'Fitness',
  'spin': 'Fitness', 'bootcamp': 'Fitness', 'training': 'Fitness', 'cardio': 'Fitness',
  'climbing': 'Fitness', 'weightlifting': 'Fitness',
  // Food & Drink
  'coffee': 'Food & Drink', 'food': 'Food & Drink', 'drinks': 'Food & Drink',
  'brunch': 'Food & Drink', 'dinner': 'Food & Drink', 'bar': 'Food & Drink',
  'restaurant': 'Food & Drink', 'lunch': 'Food & Drink', 'beer': 'Food & Drink',
  'wine': 'Food & Drink', 'cocktail': 'Food & Drink', 'tasting': 'Food & Drink',
  'cooking': 'Food & Drink', 'foodie': 'Food & Drink', 'market': 'Food & Drink', 'pub': 'Food & Drink',
  // Tech & Coding
  'tech': 'Tech & Coding', 'coding': 'Tech & Coding', 'startup': 'Tech & Coding',
  'hackathon': 'Tech & Coding', 'ai': 'Tech & Coding', 'developer': 'Tech & Coding',
  'programming': 'Tech & Coding', 'crypto': 'Tech & Coding', 'web3': 'Tech & Coding',
  'gaming': 'Tech & Coding', 'esports': 'Tech & Coding', 'data': 'Tech & Coding',
  // Outdoors & Adventure
  'hike': 'Outdoors & Adventure', 'hiking': 'Outdoors & Adventure', 'outdoor': 'Outdoors & Adventure',
  'nature': 'Outdoors & Adventure', 'camping': 'Outdoors & Adventure', 'trail': 'Outdoors & Adventure',
  'kayak': 'Outdoors & Adventure', 'kayaking': 'Outdoors & Adventure', 'skiing': 'Outdoors & Adventure',
  'snowboard': 'Outdoors & Adventure', 'paddling': 'Outdoors & Adventure', 'surfing': 'Outdoors & Adventure',
  // Arts & Culture
  'art': 'Arts & Culture', 'gallery': 'Arts & Culture', 'painting': 'Arts & Culture',
  'design': 'Arts & Culture', 'theatre': 'Arts & Culture', 'theater': 'Arts & Culture',
  'film': 'Arts & Culture', 'photography': 'Arts & Culture', 'comedy': 'Arts & Culture',
  'improv': 'Arts & Culture', 'performance': 'Arts & Culture', 'exhibition': 'Arts & Culture',
  'crafts': 'Arts & Culture', 'ceramics': 'Arts & Culture',
  // Social & Parties — phrases first
  'game night': 'Social & Parties', 'board games': 'Social & Parties',
  'pub quiz': 'Social & Parties', 'speed dating': 'Social & Parties',
  'meetup': 'Social & Parties', 'hangout': 'Social & Parties', 'social': 'Social & Parties',
  'party': 'Social & Parties', 'trivia': 'Social & Parties', 'singles': 'Social & Parties',
  'nightlife': 'Social & Parties',
  // Wellness & Mindfulness
  'yoga': 'Wellness & Mindfulness', 'wellness': 'Wellness & Mindfulness',
  'meditation': 'Wellness & Mindfulness', 'mindfulness': 'Wellness & Mindfulness',
  'pilates': 'Wellness & Mindfulness', 'breathwork': 'Wellness & Mindfulness',
  'sound bath': 'Wellness & Mindfulness', 'retreat': 'Wellness & Mindfulness',
  'spiritual': 'Wellness & Mindfulness', 'healing': 'Wellness & Mindfulness',
  // Networking
  'networking': 'Networking', 'professional': 'Networking', 'founders': 'Networking',
  'business': 'Networking', 'career': 'Networking', 'entrepreneurs': 'Networking',
  'industry': 'Networking', 'conference': 'Networking', 'summit': 'Networking',
}

const formatCount = (n: number) => {
  if (n >= 10000) return `${Math.round(n / 1000)}k`
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(n)
}

function parseVibeQuery(query: string) {
  const lower = query.toLowerCase()
  const words = lower.split(/\s+/).map(w => w.replace(/^#/, ''))
  let targetDay: number | null = null
  let dayLabel = ''
  for (const word of words) {
    if (DAY_KEYWORDS[word] !== undefined) {
      if (word === 'today' || word === 'tonight') { targetDay = new Date().getDay(); dayLabel = 'today' }
      else if (word === 'tomorrow') { targetDay = (new Date().getDay() + 1) % 7; dayLabel = 'tomorrow' }
      else { targetDay = DAY_KEYWORDS[word]; dayLabel = word.charAt(0).toUpperCase() + word.slice(1) }
      break
    }
  }
  if (lower.includes('this weekend') || lower.includes('weekend')) { targetDay = -1; dayLabel = 'this weekend' }
  let timeFilter: string | null = null
  for (const t of TIME_KEYWORDS) {
    if (lower.includes(t)) { timeFilter = t === 'morning' ? 'morning' : t === 'afternoon' ? 'afternoon' : 'evening'; break }
  }
  let detectedCategory: string | null = null
  for (const [phrase, cat] of Object.entries(CATEGORY_SYNONYMS)) {
    if (lower.includes(phrase)) { detectedCategory = cat; break }
  }
  if (!detectedCategory) {
    for (const word of words) {
      if (CATEGORY_SYNONYMS[word]) { detectedCategory = CATEGORY_SYNONYMS[word]; break }
    }
  }
  const stopWords = [...Object.keys(DAY_KEYWORDS), ...TIME_KEYWORDS, 'this', 'next', 'weekend', 'near', 'me', 'in', 'at', 'the', 'a', 'an', 'for', 'on', 'with']
  const searchTerms = words.filter(w => !stopWords.includes(w) && w.length > 1).join(' ')
  return { targetDay, dayLabel, timeFilter, detectedCategory, searchTerms }
}

function matchesDay(eventDate: Date, targetDay: number): boolean {
  if (targetDay === -1) { const day = eventDate.getDay(); return day === 0 || day === 6 }
  return eventDate.getDay() === targetDay
}

function matchesTime(eventDate: Date, timeFilter: string): boolean {
  const hour = eventDate.getHours()
  if (timeFilter === 'morning') return hour >= 5 && hour < 12
  if (timeFilter === 'afternoon') return hour >= 12 && hour < 17
  return hour >= 17 || hour < 2
}

export default function SearchPage() {
  const [user, setUser] = useState<any>(null)
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeTab, setActiveTab] = useState('All')
  const [events, setEvents] = useState<any[]>([])
  const [people, setPeople] = useState<any[]>([])
  const [communities, setCommunities] = useState<any[]>([])
  const [tagResults, setTagResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [vibeResult, setVibeResult] = useState<any>(null)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([])
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, string>>({})
  const [showAllCats, setShowAllCats] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUser(session.user)
      fetchRecommendations(session.user.id)
    })
    // Load from localStorage
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY)
      if (saved) setRecentSearches(JSON.parse(saved))
      const viewed = localStorage.getItem(RECENTLY_VIEWED_KEY)
      if (viewed) setRecentlyViewed(JSON.parse(viewed))
    } catch {}
  }, [router])

  const saveRecentSearch = (term: string) => {
    if (!term.trim()) return
    setRecentSearches(prev => {
      const updated = [term, ...prev.filter(s => s !== term)].slice(0, 8)
      try { localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated)) } catch {}
      return updated
    })
  }

  const removeRecentSearch = (term: string) => {
    setRecentSearches(prev => {
      const updated = prev.filter(s => s !== term)
      try { localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated)) } catch {}
      return updated
    })
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    try { localStorage.removeItem(RECENT_SEARCHES_KEY) } catch {}
  }

  const fetchRecommendations = async (userId: string) => {
    const { data: profileData } = await supabase.from('profiles').select('interests, city').eq('id', userId).single()
    if (!profileData) return
    const { data: allEvents } = await supabase
      .from('events').select('id, title, category, start_datetime, location_name, city, cover_url, spots_left, capacity, tags').eq('visibility', 'public')
      .gte('start_datetime', new Date().toISOString())
      .order('start_datetime', { ascending: true }).limit(50)
    if (!allEvents) return
    const scored = allEvents.map(event => {
      let score = 0
      const userInterests = (profileData.interests || []).map((i: string) => i.toLowerCase())
      const eventTags = (event.tags || []).map((t: string) => t.toLowerCase())
      const eventCat = event.category?.toLowerCase() || ''
      userInterests.forEach((interest: string) => {
        if (eventTags.includes(interest)) score += 3
        if (eventCat.includes(interest)) score += 2
      })
      if (event.city?.toLowerCase() === profileData.city?.toLowerCase()) score += 2
      if (event.capacity > 0) score += Math.floor(((event.capacity - event.spots_left) / event.capacity) * 10)
      if (event.spots_left > 0 && event.spots_left < 10) score += 2
      if ((new Date(event.start_datetime).getTime() - Date.now()) / 86400000 < 3) score += 1
      return { ...event, score }
    })
    scored.sort((a, b) => b.score - a.score)
    setRecommendations(scored.slice(0, 5))
  }

  const handleSearch = async (searchQuery?: string) => {
    const q = searchQuery ?? query
    if (!q.trim() && activeCategory === 'All') return
    setActiveTab('All')
    setLoading(true)
    setSearched(true)
    if (q.trim()) saveRecentSearch(q.trim())
    try {

    const vibe = parseVibeQuery(q)
    setVibeResult(vibe.searchTerms || vibe.detectedCategory || vibe.dayLabel ? vibe : null)

    const categoryToUse = activeCategory !== 'All' ? activeCategory : vibe.detectedCategory

    // Strip PostgREST filter syntax characters from user input to prevent filter injection
    const sanitize = (s: string) => s.replace(/[(),%_\\.:'"`]/g, '').trim()

    // Search events
    let eventQuery = supabase.from('events').select('id, title, category, start_datetime, location_name, cover_url, spots_left, capacity, tags, city').eq('visibility', 'public')
      .gte('start_datetime', new Date().toISOString())
      .order('start_datetime', { ascending: true }).limit(30)
    if (categoryToUse) eventQuery = eventQuery.eq('category', categoryToUse)
    if (vibe.searchTerms) { const t = sanitize(vibe.searchTerms); if (t) eventQuery = eventQuery.or('title.ilike.%' + t + '%,description.ilike.%' + t + '%,location_name.ilike.%' + t + '%') }
    const { data: eventData } = await eventQuery
    let filteredEvents = eventData || []
    if (vibe.targetDay !== null) filteredEvents = filteredEvents.filter(e => matchesDay(new Date(e.start_datetime), vibe.targetDay!))
    if (vibe.timeFilter) filteredEvents = filteredEvents.filter(e => matchesTime(new Date(e.start_datetime), vibe.timeFilter!))
    setEvents(filteredEvents)

    // Search by tag
    if (q.trim()) {
      const hashMatch = q.trim().match(/#(\w+)/)
      const tag = hashMatch ? hashMatch[1].toLowerCase() : q.trim().replace(/^#/, '').toLowerCase()
      const { data: tagData } = await supabase.from('events').select('id, title, category, start_datetime, location_name, cover_url, spots_left, capacity, tags, city').eq('visibility', 'public')
        .gte('start_datetime', new Date().toISOString())
        .contains('tags', [tag]).order('start_datetime', { ascending: true }).limit(20)
      setTagResults(tagData || [])
    } else {
      setTagResults([])
    }

    // Search people
    if (q.trim()) {
      const sq = sanitize(q.trim())
      const { data: peopleData } = await supabase.from('profiles')
        .select('id, name, bio_social, city, avatar_url')
        .or('name.ilike.%' + sq + '%,bio_social.ilike.%' + sq + '%,city.ilike.%' + sq + '%')
        .neq('id', user?.id)
        .eq('is_discoverable', true)
        .limit(10)
      if (peopleData) {
        setPeople(peopleData)
        if (peopleData.length > 0 && user) {
          const ids = peopleData.map((p: any) => p.id)
          const { data: connData } = await supabase.from('connections')
            .select('requester_id, addressee_id, status')
            .or(ids.map((id: string) => `and(requester_id.eq.${user.id},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${user.id})`).join(','))
          const statuses: Record<string, string> = {}
          for (const c of (connData || [])) {
            const otherId = c.requester_id === user.id ? c.addressee_id : c.requester_id
            statuses[otherId] = c.status
          }
          setConnectionStatuses(statuses)
        }
      }
    } else { setPeople([]); setConnectionStatuses({}) }

    // Search communities
    if (q.trim()) {
      const sq = sanitize(q.trim())
      let commQuery = supabase.from('communities').select('id, name, category, banner_gradient, icon, member_count')
        .or('name.ilike.%' + sq + '%,description.ilike.%' + sq + '%').limit(10)
      if (categoryToUse) commQuery = commQuery.ilike('category', '%' + sanitize(categoryToUse.split(' ')[0]) + '%')
      const { data: commData } = await commQuery
      if (commData) setCommunities(commData)
    } else if (categoryToUse) {
      const { data: commData } = await supabase.from('communities').select('id, name, category, banner_gradient, icon, member_count')
        .ilike('category', '%' + sanitize(categoryToUse.split(' ')[0]) + '%').limit(10)
      if (commData) setCommunities(commData)
    } else { setCommunities([]) }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2 || activeCategory !== 'All') {
        handleSearch()
      } else if (!query.trim()) {
        setSearched(false)
        setEvents([])
        setPeople([])
        setCommunities([])
        setTagResults([])
        setVibeResult(null)
      }
    }, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeCategory, user])

  const handleConnect = async (e: React.MouseEvent, personId: string) => {
    e.stopPropagation()
    if (!user || connectionStatuses[personId]) return
    const { data, error } = await supabase.from('connections').insert({
      requester_id: user.id, addressee_id: personId,
    }).select().single()
    if (!error && data) {
      setConnectionStatuses(prev => ({ ...prev, [personId]: 'pending' }))
    } else if (error) {
      setConnectError('Could not send request — try again')
      setTimeout(() => setConnectError(null), 3500)
    }
  }


  const totalResults = events.length + people.length + communities.length + tagResults.length
  const visibleEvents = activeTab === 'All' || activeTab === 'Events' ? events : []
  const visiblePeople = activeTab === 'All' || activeTab === 'People' ? people : []
  const visibleCommunities = activeTab === 'All' || activeTab === 'Communities' ? communities : []
  const visibleTags = activeTab === 'All' || activeTab === 'Tags' ? tagResults : []

  const EventCard = ({ event }: { event: any }) => (
    <div onClick={() => router.push('/events/' + event.id)}
      className="flex gap-3 bg-[#1C241C] border border-white/10 rounded-2xl p-2.5 cursor-pointer active:scale-[0.98] transition-transform">
      <div className="category-gradient-card w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 overflow-hidden relative" style={{ '--cat-bg': CAT_GRADIENT[event.category] || CAT_GRADIENT['Social'] } as React.CSSProperties}>
        {optimizedImgSrc(event.cover_url, 800) && (
          <img src={optimizedImgSrc(event.cover_url, 800)!} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-[#F0EDE6] leading-snug truncate">{event.title}</div>
        <div className="text-[10px] text-white/40 mt-0.5">{formatDate(event.start_datetime, cityToTimezone(event.city))} · {event.location_name}</div>
        {event.tags?.length > 0 && (
          <div className="flex gap-1 mt-1.5">
            {event.tags.slice(0, 3).map((tag: string) => (
              <button key={tag} onClick={e => { e.stopPropagation(); setQuery('#' + tag) }}
                className="bg-[#2A4A2A]/40 text-[#7EC87E] text-[10px] px-1.5 py-0.5 rounded border border-[#7EC87E]/20">#{tag}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <PageTransition>
    <div className="min-h-screen bg-[#0D110D] pb-24">

      {/* Header + Search bar */}
      <div className="px-4 pt-14 pb-2">
        {!searched && (
          <div className="mb-3">
            <h1 className="font-display font-bold text-[#F0EDE6] text-2xl leading-tight">Discover</h1>
            <p className="text-xs text-white/40 mt-0.5">Events, people &amp; communities near you</p>
          </div>
        )}
        <div className="flex items-center gap-2 bg-[#1C241C] border border-[#E8B84B]/30 rounded-2xl px-4 py-3 transition-all focus-within:border-[#E8B84B]/60 focus-within:shadow-[0_0_0_3px_rgba(232,184,75,0.1),0_4px_24px_rgba(232,184,75,0.08)]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/35 shrink-0"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Events, people, #tags, vibes..."
            autoFocus
            style={{ fontSize: '16px' }}
            className="flex-1 bg-transparent text-[#F0EDE6] placeholder-white/30 outline-none"
          />
          {query && (
            <button onClick={() => { setQuery(''); setSearched(false); setVibeResult(null) }}
              className="text-white/35 flex items-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Result tabs */}
      {searched && (
        <div className="border-b border-white/10 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          <div className="flex px-4 min-w-max">
            {(['All', 'Events', 'People', 'Communities', 'Tags'] as const).map(tab => {
              const count = tab === 'Events' ? events.length : tab === 'People' ? people.length : tab === 'Communities' ? communities.length : tab === 'Tags' ? tagResults.length : 0
              return (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={'px-3 py-2.5 text-xs text-center border-b-2 -mb-px whitespace-nowrap transition-colors ' + (activeTab === tab ? 'text-[#E8B84B] border-[#E8B84B]' : 'text-white/40 border-transparent')}>
                  {tab}{count > 0 ? <span className="ml-1 text-[10px] opacity-70">{count}</span> : ''}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Category chips */}
      <div className="relative">
        <div className="flex gap-2 overflow-x-auto px-4 pt-3 pb-2 [&::-webkit-scrollbar]:h-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-thumb]:rounded-full">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={'px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition-all flex-shrink-0 ' + (activeCategory === cat ? 'bg-[#E8B84B] text-[#0D110D] border-[#E8B84B] font-semibold shadow-[0_0_14px_rgba(232,184,75,0.45)]' : 'bg-[#1C241C] text-white/55 border-white/10')}>
              {cat}
            </button>
          ))}
          <div className="w-6 flex-shrink-0" />
        </div>
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-[#0D110D] to-transparent" />
      </div>

      <div className="px-4">

        {/* Not searched — discovery state */}
        {!searched && (
          <>
            {/* Recent searches */}
            {recentSearches.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium">Recent searches</div>
                  <button onClick={clearRecentSearches} className="text-[10px] text-white/35">Clear</button>
                </div>
                <div className="bg-[#1C241C] border border-white/10 rounded-2xl overflow-hidden">
                  {recentSearches.map((term, i) => (
                    <div key={term} className={'flex items-center gap-2 px-3 py-2.5 ' + (i < recentSearches.length - 1 ? 'border-b border-white/10' : '')}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      <button onClick={() => { setQuery(term); handleSearch(term) }}
                        className="flex-1 text-sm text-[#F0EDE6] text-left">{term}</button>
                      <button onClick={() => removeRecentSearch(term)} className="text-[10px] text-white/20 px-1">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recently viewed */}
            {recentlyViewed.length > 0 && (
              <div className="mb-4">
                <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium mb-2">Recently viewed</div>
                <div className="space-y-2">
                  {recentlyViewed.slice(0, 3).map(event => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </div>
            )}

            {/* Quick-filter hint — rules-based parser, not AI/LLM */}
            <div className="search-tip-card bg-gradient-to-r from-[#1C241C] to-[#181F18] border border-[#E8B84B]/20 rounded-2xl p-3.5 mb-4 flex items-start gap-3 shadow-[0_0_24px_rgba(232,184,75,0.05)]">
              <div className="w-7 h-7 bg-[#E8B84B]/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(232,184,75,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold text-[#E8B84B]/80 mb-1">Quick filters</div>
                <div className="text-xs text-white/40 leading-relaxed">Try <span className="text-white/60">&quot;live music thursday night&quot;</span> or <span className="text-white/60">&quot;#yoga this weekend&quot;</span></div>
              </div>
            </div>

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-[#E8B84B]/10 rounded-md flex items-center justify-center">
                      <span className="text-[10px] text-[#E8B84B]">✦</span>
                    </div>
                    <div className="text-[9px] uppercase tracking-widest text-[#E8B84B]/60 font-medium">Picked for you</div>
                  </div>
                </div>
                <div className="space-y-2 mb-5">
                  {recommendations.map(event => (
                    <div key={event.id} onClick={() => router.push('/events/' + event.id)}
                      className={'flex gap-3 bg-[#1C241C] border rounded-2xl p-2.5 cursor-pointer active:scale-[0.98] transition-transform ' + (event.score >= 5 ? 'border-[#E8B84B]/20 shadow-[0_2px_16px_rgba(232,184,75,0.07)]' : 'border-white/10')}>
                      <div className="category-gradient-card w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 overflow-hidden relative" style={{ '--cat-bg': CAT_GRADIENT[event.category] || CAT_GRADIENT['Social'] } as React.CSSProperties}>
                        {optimizedImgSrc(event.cover_url, 800) && (
                          <img src={optimizedImgSrc(event.cover_url, 800)!} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[#F0EDE6] leading-snug truncate">{event.title}</div>
                        <div className="text-[10px] text-white/40 mt-0.5">{formatDate(event.start_datetime, cityToTimezone(event.city))}</div>
                        {event.score >= 5 && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[8px] text-[#E8B84B]">✦</span>
                            <span className="text-[9px] text-[#E8B84B]/80">Strong match</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Browse by category */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium">Browse by category</div>
              <button onClick={() => setShowAllCats(v => !v)} className="text-[10px] text-[#E8B84B]">
                {showAllCats ? 'Less ↑' : 'See all →'}
              </button>
            </div>
            <div className={'grid gap-2 mb-4 ' + (showAllCats ? 'grid-cols-3' : 'grid-cols-2')}>
              {(showAllCats ? [
                'Music', 'DJ & Electronic', 'Hip Hop & R&B', 'Jazz & Blues', 'Live Concerts & Festivals',
                'Fitness', 'Yoga & Pilates', 'Running & Cycling', 'Climbing & Hiking', 'Combat Sports & CrossFit',
                'Food & Drink', 'Coffee & Brunch', 'Wine & Cocktails', 'Cooking & Culinary', 'Street Food & Markets',
                'Tech & Coding', 'Startups & Entrepreneurship', 'AI & Innovation', 'Gaming & Esports', 'Web3 & Crypto',
                'Outdoors & Adventure', 'Hiking & Camping', 'Water Sports', 'Snow Sports',
                'Arts & Culture', 'Photography & Film', 'Theatre & Comedy', 'Fashion & Style', 'Literature & Writing',
                'Social & Parties', 'Nightlife', 'Networking', 'Business & Finance',
                'Wellness & Mindfulness', 'Dance & Movement', 'Spirituality', 'Volunteering & Activism',
                'Education & Workshops', 'Sports & Recreation', 'Pets & Animals', 'Science & Innovation', 'Markets & Pop-ups',
              ] : [
                'Music', 'Fitness', 'Food & Drink', 'Tech & Coding',
                'Outdoors & Adventure', 'Arts & Culture', 'Social & Parties', 'Wellness & Mindfulness',
              ]).map(cat => {
                const isActive = activeCategory === cat
                return (
                  <button key={cat} onClick={() => setActiveCategory(cat)}
                    className={'flex items-center gap-2.5 rounded-2xl border transition-all active:scale-[0.97] ' + (showAllCats ? 'p-2' : 'p-2.5') + ' ' + (isActive ? 'border-[#E8B84B]/35 bg-[#E8B84B]/5 shadow-[0_0_16px_rgba(232,184,75,0.12)]' : 'border-white/8 bg-[#1C241C]')}>
                    <div className={'category-gradient-card rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ' + (showAllCats ? 'w-7 h-7' : 'w-9 h-9')} style={{ '--cat-bg': CAT_GRADIENT[cat] || CAT_GRADIENT['Social'] } as React.CSSProperties}>
                      <span className={showAllCats ? 'text-sm' : 'text-base'}>{BROWSE_CAT_EMOJI[cat] || '✦'}</span>
                    </div>
                    <span className={'font-medium text-left leading-tight ' + (showAllCats ? 'text-[9px]' : 'text-xs') + ' ' + (isActive ? 'text-[#F0EDE6]' : 'text-white/60')}>{cat}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Search results */}
        {searched && !loading && (
          <>
            {vibeResult && (vibeResult.detectedCategory || vibeResult.dayLabel || vibeResult.timeFilter) && (
              <div className="bg-gradient-to-r from-[#1A2A1A] to-[#0E1A0E] border border-[#E8B84B]/20 rounded-2xl p-3 mb-3">
                <div className="text-[9px] uppercase tracking-wider text-[#E8B84B]/60 mb-1">⚡ Quick filters detected</div>
                <div className="text-sm font-bold text-[#F0EDE6] mb-1">&quot;{query}&quot;</div>
                <div className="flex flex-wrap gap-1.5">
                  {vibeResult.detectedCategory && <span className="bg-[#2A4A2A]/40 text-[#7EC87E] text-[10px] px-2 py-0.5 rounded border border-[#7EC87E]/20">{vibeResult.detectedCategory}</span>}
                  {vibeResult.dayLabel && <span className="bg-[#2A4A2A]/40 text-[#7EC87E] text-[10px] px-2 py-0.5 rounded border border-[#7EC87E]/20">{vibeResult.dayLabel}</span>}
                  {vibeResult.timeFilter && <span className="bg-[#2A4A2A]/40 text-[#7EC87E] text-[10px] px-2 py-0.5 rounded border border-[#7EC87E]/20">{vibeResult.timeFilter}</span>}
                </div>
                <div className="text-[10px] text-[#7EC87E] mt-1.5">{events.length} matching event{events.length !== 1 ? 's' : ''} found</div>
              </div>
            )}

            {totalResults === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-14 h-14 bg-[#1C241C] border border-white/10 rounded-2xl flex items-center justify-center mb-1">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                </div>
                <p className="text-white/40 text-sm text-center">No results for &quot;{query}&quot;</p>
                <p className="text-white/35 text-xs text-center max-w-[220px]">Try different words or browse by category above</p>
              </div>
            )}

            {/* Events */}
            {visibleEvents.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-2 mt-2">
                  <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium">Events · {events.length}</div>
                  {activeTab === 'All' && events.length > 3 && (
                    <button onClick={() => setActiveTab('Events')} className="text-[10px] text-[#E8B84B]">See all →</button>
                  )}
                </div>
                <div className="space-y-2 mb-4">
                  {(activeTab === 'All' ? visibleEvents.slice(0, 4) : visibleEvents).map(event => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </>
            )}

            {/* Tags */}
            {visibleTags.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-2 mt-2">
                  <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium">Tag matches · {tagResults.length}</div>
                </div>
                <div className="space-y-2 mb-4">
                  {(activeTab === 'All' ? visibleTags.slice(0, 3) : visibleTags).map(event => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </>
            )}

            {/* People */}
            {visiblePeople.length > 0 && (
              <>
                <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium mb-2">People · {people.length}</div>
                <div className="space-y-2 mb-4">
                  {visiblePeople.map(person => (
                    <div key={person.id} onClick={() => router.push('/profile/' + person.id)}
                      className="flex items-center gap-3 bg-[#1C241C] border border-white/10 rounded-2xl p-2.5 cursor-pointer active:scale-[0.98] transition-transform">
                      {optimizedImgSrc(person.avatar_url, 96) ? (
                        <img src={optimizedImgSrc(person.avatar_url, 96)!} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0"  loading="lazy" />
                      ) : (
                        <div className="w-10 h-10 bg-[#2A4A2A] rounded-xl flex items-center justify-center text-sm font-semibold text-[#7EC87E] flex-shrink-0">
                          {person.name?.charAt(0) || '?'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[#F0EDE6]">{person.name}</div>
                        <div className="text-[10px] text-white/40 mt-0.5">{person.bio_social || person.city || ''}</div>
                      </div>
                      <button onClick={(e) => handleConnect(e, person.id)}
                        className={'text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border flex-shrink-0 transition-all active:scale-95 ' + (
                          connectionStatuses[person.id] === 'accepted' ? 'bg-[#2A4A2A]/40 border-[#7EC87E]/20 text-[#7EC87E]'
                          : connectionStatuses[person.id] === 'pending' ? 'bg-transparent border-[#E8B84B]/20 text-[#E8B84B]/60'
                          : 'bg-[#E8B84B]/10 border-[#E8B84B]/25 text-[#E8B84B] shadow-[0_0_10px_rgba(232,184,75,0.15)]'
                        )}>
                        {connectionStatuses[person.id] === 'accepted' ? '✓ Connected' : connectionStatuses[person.id] === 'pending' ? 'Sent' : '+ Connect'}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Communities */}
            {visibleCommunities.length > 0 && (
              <>
                <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium mb-2">Communities · {communities.length}</div>
                <div className="space-y-2 mb-4">
                  {visibleCommunities.map(comm => (
                    <div key={comm.id} onClick={() => router.push('/communities/' + comm.id)}
                      className="flex items-center gap-3 bg-[#1C241C] border border-white/10 rounded-2xl p-2.5 cursor-pointer active:scale-[0.98] transition-transform">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 relative overflow-hidden" style={{ background: comm.banner_gradient || 'var(--gradient-community-banner)' }}>
                        {comm.icon ? (
                          <span className="text-lg">{comm.icon}</span>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[#F0EDE6]">{comm.name}</div>
                        <div className="text-[10px] text-white/40 mt-0.5">{formatCount(comm.member_count || 0)} members · {comm.category}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-[#E8B84B] text-sm">Searching...</div>
          </div>
        )}
      </div>

      {connectError && (
        <div className="fixed left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 bg-[#2A1010] border border-[#E85B5B]/30 rounded-2xl px-4 py-2.5 shadow-2xl"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 92px)' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E85B5B" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span className="text-xs text-[#E85B5B]">{connectError}</span>
        </div>
      )}

      <BottomNav />
    </div>
    </PageTransition>
  )
}