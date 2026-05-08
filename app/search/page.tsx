'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'

const CATEGORIES = ['All', 'Music', 'Fitness', 'Food & Drink', 'Tech & Coding', 'Outdoors & Adventure', 'Arts & Culture', 'Social & Parties', 'Wellness & Mindfulness', 'Networking']
const RECENT_SEARCHES_KEY = 'gathr_recent_searches'
const RECENTLY_VIEWED_KEY = 'gathr_recently_viewed'

const DAY_KEYWORDS: Record<string, number> = {
  'today': 0, 'tonight': 0, 'tomorrow': 1,
  'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
  'friday': 5, 'saturday': 6, 'sunday': 0,
  'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6, 'sun': 0,
}
const TIME_KEYWORDS = ['morning', 'afternoon', 'evening', 'night', 'tonight', 'late']
const CATEGORY_SYNONYMS: Record<string, string> = {
  'live music': 'Music', 'concert': 'Music', 'gig': 'Music', 'show': 'Music', 'band': 'Music', 'open mic': 'Music',
  'run': 'Fitness', 'running': 'Fitness', 'workout': 'Fitness', 'gym': 'Fitness', 'yoga': 'Fitness', 'hike': 'Outdoors', 'hiking': 'Outdoors',
  'coffee': 'Food & Drink', 'food': 'Food & Drink', 'drinks': 'Food & Drink', 'brunch': 'Food & Drink', 'dinner': 'Food & Drink', 'bar': 'Food & Drink',
  'tech': 'Tech', 'coding': 'Tech', 'startup': 'Tech', 'hackathon': 'Tech', 'ai': 'Tech',
  'art': 'Arts & Culture', 'gallery': 'Arts & Culture', 'painting': 'Arts & Culture', 'design': 'Arts & Culture',
  'meetup': 'Social', 'hangout': 'Social', 'social': 'Social', 'party': 'Social',
  'networking': 'Networking', 'professional': 'Networking', 'founders': 'Networking',
  'outdoor': 'Outdoors', 'nature': 'Outdoors', 'camping': 'Outdoors', 'trail': 'Outdoors',
}

function parseVibeQuery(query: string) {
  const lower = query.toLowerCase()
  const words = lower.split(/\s+/)
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
  }, [])

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
      .from('events').select('*').eq('visibility', 'public')
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
    setLoading(true)
    setSearched(true)
    if (q.trim()) saveRecentSearch(q.trim())

    const vibe = parseVibeQuery(q)
    setVibeResult(vibe.searchTerms || vibe.detectedCategory || vibe.dayLabel ? vibe : null)

    const categoryToUse = activeCategory !== 'All' ? activeCategory : vibe.detectedCategory

    // Search events
    let eventQuery = supabase.from('events').select('*').eq('visibility', 'public')
      .order('start_datetime', { ascending: true }).limit(30)
    if (categoryToUse) eventQuery = eventQuery.eq('category', categoryToUse)
    if (vibe.searchTerms) eventQuery = eventQuery.or('title.ilike.%' + vibe.searchTerms + '%,description.ilike.%' + vibe.searchTerms + '%,location_name.ilike.%' + vibe.searchTerms + '%')
    const { data: eventData } = await eventQuery
    let filteredEvents = eventData || []
    if (vibe.targetDay !== null) filteredEvents = filteredEvents.filter(e => matchesDay(new Date(e.start_datetime), vibe.targetDay!))
    if (vibe.timeFilter) filteredEvents = filteredEvents.filter(e => matchesTime(new Date(e.start_datetime), vibe.timeFilter!))
    setEvents(filteredEvents)

    // Search by tag
    if (q.trim()) {
      const tag = q.trim().replace(/^#/, '').toLowerCase()
      const { data: tagData } = await supabase.from('events').select('*').eq('visibility', 'public')
        .contains('tags', [tag]).order('start_datetime', { ascending: true }).limit(20)
      setTagResults(tagData || [])
    } else {
      setTagResults([])
    }

    // Search people
    if (q.trim()) {
      const { data: peopleData } = await supabase.from('profiles')
        .select('id, name, bio_social, city, avatar_url')
        .or('name.ilike.%' + q.trim() + '%,bio_social.ilike.%' + q.trim() + '%,city.ilike.%' + q.trim() + '%')
        .neq('id', user?.id).limit(10)
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
      const { data: commData } = await supabase.from('communities').select('*')
        .or('name.ilike.%' + q.trim() + '%,description.ilike.%' + q.trim() + '%').limit(10)
      if (commData) setCommunities(commData)
    } else { setCommunities([]) }

    setLoading(false)
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
  }, [query, activeCategory])

  const handleConnect = async (e: React.MouseEvent, personId: string) => {
    e.stopPropagation()
    if (!user || connectionStatuses[personId]) return
    const { data } = await supabase.from('connections').insert({
      requester_id: user.id, addressee_id: personId, user_id: user.id, friend_id: personId,
    }).select().single()
    if (data) {
      setConnectionStatuses(prev => ({ ...prev, [personId]: 'pending' }))
      await supabase.from('notifications').insert({
        user_id: personId, actor_id: user.id, type: 'connection_request',
        title: 'wants to connect with you', body: 'Tap to view their profile.',
        link: '/profile/' + user.id, read: false,
      })
    }
  }

  const formatDate = (dt: string) => {
    const d = new Date(dt)
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const totalResults = events.length + people.length + communities.length + tagResults.length
  const visibleEvents = activeTab === 'All' || activeTab === 'Events' ? events : []
  const visiblePeople = activeTab === 'All' || activeTab === 'People' ? people : []
  const visibleCommunities = activeTab === 'All' || activeTab === 'Communities' ? communities : []
  const visibleTags = activeTab === 'All' || activeTab === 'Tags' ? tagResults : []

  const EventCard = ({ event }: { event: any }) => (
    <div onClick={() => router.push('/events/' + event.id)}
      className="flex gap-3 bg-[#1C241C] border border-white/10 rounded-2xl p-2.5 cursor-pointer active:scale-[0.98] transition-transform">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 overflow-hidden relative" style={{ background: '#1E2E1E' }}>
        {event.cover_url
          ? <img src={event.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          : (event.category === 'Music' ? '🎸' : event.category === 'Fitness' ? '🏃' : event.category === 'Food & Drink' ? '🍺' : event.category === 'Tech' ? '💻' : event.category === 'Outdoors' ? '🥾' : '🎉')
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-[#F0EDE6] leading-snug truncate">{event.title}</div>
        <div className="text-[10px] text-white/40 mt-0.5">{formatDate(event.start_datetime)} · {event.location_name}</div>
        {event.tags?.length > 0 && (
          <div className="flex gap-1 mt-1.5">
            {event.tags.slice(0, 3).map((tag: string) => (
              <button key={tag} onClick={e => { e.stopPropagation(); setQuery('#' + tag) }}
                className="bg-[#2A4A2A]/40 text-[#7EC87E] text-[9px] px-1.5 py-0.5 rounded border border-[#7EC87E]/10">#{tag}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0D110D] pb-24">

      {/* Search bar */}
      <div className="px-4 pt-14 pb-2">
        <div className="flex items-center gap-2 bg-[#1C241C] border border-[#E8B84B]/35 rounded-2xl px-4 py-2.5">
          <span className="text-sm text-white/30">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Events, people, #tags, vibes..."
            autoFocus
            className="flex-1 bg-transparent text-sm text-[#F0EDE6] placeholder-white/30 outline-none"
          />
          {query && (
            <button onClick={() => { setQuery(''); setSearched(false); setVibeResult(null) }}
              className="text-xs text-white/30">✕</button>
          )}
        </div>
      </div>

      {/* Result tabs */}
      {searched && (
        <div className="flex border-b border-white/10 px-4 overflow-x-auto">
          {['All', 'Events', 'People', 'Tags'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={'flex-1 py-2.5 text-xs text-center border-b-2 -mb-px whitespace-nowrap ' + (activeTab === tab ? 'text-[#E8B84B] border-[#E8B84B]' : 'text-white/40 border-transparent')}>
              {tab}{tab === 'Tags' && tagResults.length > 0 ? ' · ' + tagResults.length : ''}
            </button>
          ))}
        </div>
      )}

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={'px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition-all ' + (activeCategory === cat ? 'bg-[#E8B84B] text-[#0D110D] border-[#E8B84B] font-semibold' : 'bg-[#1C241C] text-white/45 border-white/10')}>
            {cat}
          </button>
        ))}
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
                  <button onClick={clearRecentSearches} className="text-[10px] text-white/25">Clear</button>
                </div>
                <div className="bg-[#1C241C] border border-white/10 rounded-2xl overflow-hidden">
                  {recentSearches.map((term, i) => (
                    <div key={term} className={'flex items-center gap-2 px-3 py-2.5 ' + (i < recentSearches.length - 1 ? 'border-b border-white/10' : '')}>
                      <span className="text-xs text-white/20">🕐</span>
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

            {/* AI hint */}
            <div className="bg-[#1C241C] border border-[#E8B84B]/20 rounded-2xl p-3 mb-4 flex items-center gap-2">
              <span className="text-base">✨</span>
              <span className="text-xs text-[#E8B84B]/70 flex-1">Try &quot;live music thursday night&quot; or &quot;#yoga this weekend&quot;</span>
              <span className="bg-[#E8B84B]/10 text-[#E8B84B] text-[9px] px-2 py-0.5 rounded">Smart</span>
            </div>

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">✦</span>
                  <div className="text-[9px] uppercase tracking-widest text-[#E8B84B]/60 font-medium">Recommended for you</div>
                </div>
                <div className="space-y-2 mb-5">
                  {recommendations.map(event => (
                    <div key={event.id} onClick={() => router.push('/events/' + event.id)}
                      className="flex gap-3 bg-[#1C241C] border border-white/10 rounded-2xl p-2.5 cursor-pointer active:scale-[0.98] transition-transform">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 overflow-hidden relative" style={{ background: '#1E2E1E' }}>
                        {event.cover_url
                          ? <img src={event.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                          : (event.category === 'Music' ? '🎸' : event.category === 'Fitness' ? '🏃' : event.category === 'Food & Drink' ? '🍺' : event.category === 'Tech' ? '💻' : '🎉')
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[#F0EDE6] leading-snug truncate">{event.title}</div>
                        <div className="text-[10px] text-white/40 mt-0.5">{formatDate(event.start_datetime)}</div>
                        {event.score >= 5 && <div className="text-[9px] text-[#E8B84B] mt-1">✦ Great match</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Browse by category */}
            <div className="flex items-center justify-between mb-2">
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
                const emoji: Record<string,string> = {'Music':'🎸','DJ & Electronic':'🎧','Hip Hop & R&B':'🎤','Jazz & Blues':'🎷','Live Concerts & Festivals':'🎪','Fitness':'🏃','Yoga & Pilates':'🧘','Running & Cycling':'🚴','Climbing & Hiking':'🧗','Combat Sports & CrossFit':'🥊','Food & Drink':'🍺','Coffee & Brunch':'☕','Wine & Cocktails':'🍷','Cooking & Culinary':'👨‍🍳','Street Food & Markets':'🌮','Tech & Coding':'💻','Startups & Entrepreneurship':'🚀','AI & Innovation':'🤖','Gaming & Esports':'🎮','Web3 & Crypto':'⛓','Outdoors & Adventure':'🥾','Hiking & Camping':'⛺','Water Sports':'🏄','Snow Sports':'🎿','Arts & Culture':'🎨','Photography & Film':'📷','Theatre & Comedy':'🎭','Fashion & Style':'👗','Literature & Writing':'📚','Social & Parties':'🎉','Nightlife':'🌙','Networking':'💼','Business & Finance':'📈','Wellness & Mindfulness':'🌿','Dance & Movement':'💃','Spirituality':'✨','Volunteering & Activism':'🌱','Education & Workshops':'🎓','Sports & Recreation':'⚽','Pets & Animals':'🐾','Science & Innovation':'🔬','Markets & Pop-ups':'🏪'}
                return (
                  <button key={cat} onClick={() => setActiveCategory(cat)}
                    className={'flex items-center gap-2 p-3 rounded-2xl border transition-all active:scale-95 ' + (activeCategory === cat ? 'border-[#E8B84B]/30 bg-[#E8B84B]/5' : 'border-white/10 bg-[#1C241C]')}>
                    <span className={showAllCats ? 'text-base' : 'text-lg'}>{emoji[cat] || '🎉'}</span>
                    <span className={'font-medium text-[#F0EDE6] text-left leading-tight ' + (showAllCats ? 'text-[10px]' : 'text-sm')}>{cat}</span>
                  </button>
                )
              })}
            </div>

            {/* Trending */}
            <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2 font-medium">Trending searches</div>
            <div className="bg-[#1C241C] border border-white/10 rounded-2xl overflow-hidden">
              {['live music this weekend', 'coffee meetup tomorrow', 'running club', '#startups', 'outdoor adventure'].map((term, i) => (
                <button key={term} onClick={() => setQuery(term)}
                  className={'flex items-center gap-2 w-full px-3 py-2.5 text-left ' + (i < 4 ? 'border-b border-white/10' : '')}>
                  <span className="text-xs text-white/25 w-4">{i + 1}</span>
                  <span className="text-sm text-[#F0EDE6] flex-1">{term}</span>
                  <span className="text-[10px] text-white/20">→</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Search results */}
        {searched && !loading && (
          <>
            {vibeResult && (vibeResult.detectedCategory || vibeResult.dayLabel || vibeResult.timeFilter) && (
              <div className="bg-gradient-to-r from-[#1A2A1A] to-[#0E1A0E] border border-[#E8B84B]/20 rounded-2xl p-3 mb-3">
                <div className="text-[9px] uppercase tracking-wider text-[#E8B84B]/60 mb-1">✨ Smart Search</div>
                <div className="text-sm font-bold text-[#F0EDE6] mb-1">&quot;{query}&quot;</div>
                <div className="flex flex-wrap gap-1.5">
                  {vibeResult.detectedCategory && <span className="bg-[#2A4A2A]/40 text-[#7EC87E] text-[9px] px-2 py-0.5 rounded border border-[#7EC87E]/10">{vibeResult.detectedCategory}</span>}
                  {vibeResult.dayLabel && <span className="bg-[#2A4A2A]/40 text-[#7EC87E] text-[9px] px-2 py-0.5 rounded border border-[#7EC87E]/10">{vibeResult.dayLabel}</span>}
                  {vibeResult.timeFilter && <span className="bg-[#2A4A2A]/40 text-[#7EC87E] text-[9px] px-2 py-0.5 rounded border border-[#7EC87E]/10">{vibeResult.timeFilter}</span>}
                </div>
                <div className="text-[10px] text-[#7EC87E] mt-1.5">{events.length} matching event{events.length !== 1 ? 's' : ''} found</div>
              </div>
            )}

            {totalResults === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="text-4xl">🔍</div>
                <p className="text-white/40 text-sm text-center">No results for &quot;{query}&quot;</p>
                <p className="text-white/25 text-xs text-center max-w-[220px]">Try different words or browse by category above</p>
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
                      {person.avatar_url ? (
                        <img src={person.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 bg-[#2A4A2A] rounded-xl flex items-center justify-center text-base flex-shrink-0">
                          {person.name?.charAt(0) || '🧑'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[#F0EDE6]">{person.name}</div>
                        <div className="text-[10px] text-white/40 mt-0.5">{person.bio_social || person.city || ''}</div>
                      </div>
                      <button onClick={(e) => handleConnect(e, person.id)}
                        className={'text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border flex-shrink-0 transition-all ' + (
                          connectionStatuses[person.id] === 'accepted' ? 'bg-[#2A4A2A]/40 border-[#7EC87E]/20 text-[#7EC87E]'
                          : connectionStatuses[person.id] === 'pending' ? 'bg-transparent border-[#E8B84B]/20 text-[#E8B84B]/60'
                          : 'bg-[#E8B84B]/10 border-[#E8B84B]/20 text-[#E8B84B]'
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
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: comm.banner_gradient || '#1E2E1E' }}>
                        {comm.icon || '👥'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[#F0EDE6]">{comm.name}</div>
                        <div className="text-[10px] text-white/40 mt-0.5">{comm.member_count} members · {comm.category}</div>
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

      <BottomNav />
    </div>
  )
}