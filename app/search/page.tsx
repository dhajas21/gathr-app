'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'

const CATEGORIES = ['All', 'Music', 'Fitness', 'Food & Drink', 'Tech', 'Outdoors', 'Arts & Culture', 'Social', 'Networking']

export default function SearchPage() {
  const [user, setUser] = useState<any>(null)
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeTab, setActiveTab] = useState('All')
  const [events, setEvents] = useState<any[]>([])
  const [people, setPeople] = useState<any[]>([])
  const [communities, setCommunities] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUser(session.user)
    })
  }, [])

  const handleSearch = async () => {
    if (!query.trim() && activeCategory === 'All') return
    setLoading(true)
    setSearched(true)

    // Search events
    let eventQuery = supabase
      .from('events')
      .select('*')
      .eq('visibility', 'public')
      .order('start_datetime', { ascending: true })
      .limit(20)

    if (activeCategory !== 'All') {
      eventQuery = eventQuery.eq('category', activeCategory)
    }

    if (query.trim()) {
      eventQuery = eventQuery.or('title.ilike.%' + query.trim() + '%,description.ilike.%' + query.trim() + '%,location_name.ilike.%' + query.trim() + '%')
    }

    const { data: eventData } = await eventQuery
    if (eventData) setEvents(eventData)

    // Search people
    if (query.trim()) {
      const { data: peopleData } = await supabase
        .from('profiles')
        .select('id, name, bio_social, city, interests, profile_mode')
        .ilike('name', '%' + query.trim() + '%')
        .neq('id', user?.id)
        .limit(10)
      if (peopleData) setPeople(peopleData)
    } else {
      setPeople([])
    }

    // Search communities
    if (query.trim()) {
      const { data: commData } = await supabase
        .from('communities')
        .select('*')
        .ilike('name', '%' + query.trim() + '%')
        .limit(10)
      if (commData) setCommunities(commData)
    } else {
      setCommunities([])
    }

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
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [query, activeCategory])

  const formatDate = (dt: string) => {
    const d = new Date(dt)
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const totalResults = events.length + people.length + communities.length

  const visibleEvents = activeTab === 'All' || activeTab === 'Events' ? events : []
  const visiblePeople = activeTab === 'All' || activeTab === 'People' ? people : []
  const visibleCommunities = activeTab === 'All' || activeTab === 'Communities' ? communities : []

  return (
    <div className="min-h-screen bg-[#0D110D] pb-24">

      {/* Search bar */}
      <div className="px-4 pt-14 pb-2">
        <div className="flex items-center gap-2 bg-[#1C241C] border border-[#E8B84B]/35 rounded-2xl px-4 py-2.5">
          <span className="text-sm text-white/30">🔍</span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Events, people, vibes..."
            autoFocus
            className="flex-1 bg-transparent text-sm text-[#F0EDE6] placeholder-white/30 outline-none"
          />
          {query && (
            <button onClick={() => { setQuery(''); setSearched(false) }}
              className="text-xs text-white/30">✕</button>
          )}
        </div>
      </div>

      {/* Result tabs */}
      {searched && (
        <div className="flex border-b border-white/10 px-4 overflow-x-auto">
          {['All', 'Events', 'People', 'Communities', 'Tags'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={'flex-1 py-2.5 text-xs text-center border-b-2 -mb-px whitespace-nowrap ' + (activeTab === tab ? 'text-[#E8B84B] border-[#E8B84B]' : 'text-white/40 border-transparent')}>
              {tab}
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

        {/* Empty / Not searched */}
        {!searched && (
          <>
            {/* AI hint */}
            <div className="bg-[#1C241C] border border-[#E8B84B]/20 rounded-2xl p-3 mb-4 flex items-center gap-2">
              <span className="text-base">✨</span>
              <span className="text-xs text-[#E8B84B]/70 flex-1">Try &quot;live music thursday night&quot;</span>
              <span className="bg-[#E8B84B]/10 text-[#E8B84B] text-[9px] px-2 py-0.5 rounded">AI</span>
            </div>

            {/* Browse by category */}
            <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2 font-medium">Browse by category</div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { emoji: '🎸', label: 'Music', bg: '#1E2E1E' },
                { emoji: '🏃', label: 'Fitness', bg: '#2A1E0E' },
                { emoji: '💻', label: 'Tech', bg: '#1A1E2A' },
                { emoji: '🥾', label: 'Outdoors', bg: '#1A2A1A' },
                { emoji: '🎨', label: 'Arts', bg: '#2A1A1A' },
                { emoji: '☕', label: 'Food & Drink', bg: '#2A2A1A' },
              ].map(cat => (
                <button key={cat.label} onClick={() => { setActiveCategory(cat.label === 'Arts' ? 'Arts & Culture' : cat.label); }}
                  className="flex items-center gap-2 p-3 rounded-2xl border border-white/10"
                  style={{ background: cat.bg }}>
                  <span className="text-lg">{cat.emoji}</span>
                  <span className="text-sm font-medium text-[#F0EDE6]">{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Trending searches */}
            <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2 font-medium">Trending searches</div>
            <div className="bg-[#1C241C] border border-white/10 rounded-2xl overflow-hidden">
              {['live music bellingham', '#startups', 'coffee meetup'].map((term, i) => (
                <button key={term} onClick={() => setQuery(term)}
                  className={'flex items-center gap-2 w-full px-3 py-2.5 text-left ' + (i < 2 ? 'border-b border-white/10' : '')}>
                  <span className="text-xs text-white/25 w-4">{i + 1}</span>
                  <span className="text-sm text-[#F0EDE6] flex-1">{term}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Search results */}
        {searched && !loading && (
          <>
            {totalResults === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="text-4xl">🔍</div>
                <p className="text-white/40 text-sm text-center">No results found</p>
              </div>
            )}

            {/* Events */}
            {visibleEvents.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-2 mt-2">
                  <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium">Events</div>
                  {activeTab === 'All' && events.length > 3 && (
                    <button onClick={() => setActiveTab('Events')} className="text-[10px] text-[#E8B84B]">See all {events.length} →</button>
                  )}
                </div>
                <div className="space-y-2 mb-4">
                  {(activeTab === 'All' ? visibleEvents.slice(0, 3) : visibleEvents).map(event => (
                    <div key={event.id} onClick={() => router.push('/events/' + event.id)}
                      className="flex gap-3 bg-[#1C241C] border border-white/10 rounded-2xl p-2.5 cursor-pointer active:scale-[0.98] transition-transform">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: '#1E2E1E' }}>
                        {event.category === 'Music' ? '🎸' : event.category === 'Fitness' ? '🏃' : '🎉'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[#F0EDE6] leading-snug truncate">{event.title}</div>
                        <div className="text-[10px] text-white/40 mt-0.5">{formatDate(event.start_datetime)} · {event.location_name}</div>
                        {event.tags?.length > 0 && (
                          <div className="flex gap-1 mt-1.5">
                            {event.tags.slice(0, 2).map((tag: string) => (
                              <span key={tag} className="bg-[#2A4A2A]/40 text-[#7EC87E] text-[9px] px-1.5 py-0.5 rounded border border-[#7EC87E]/10">#{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* People */}
            {visiblePeople.length > 0 && (
              <>
                <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium mb-2">People</div>
                <div className="space-y-2 mb-4">
                  {visiblePeople.map(person => (
                    <div key={person.id} onClick={() => router.push('/profile/' + person.id)}
                      className="flex items-center gap-3 bg-[#1C241C] border border-white/10 rounded-2xl p-2.5 cursor-pointer active:scale-[0.98] transition-transform">
                      <div className="w-10 h-10 bg-[#2A4A2A] rounded-xl flex items-center justify-center text-base flex-shrink-0">
                        {person.name?.charAt(0) || '🧑'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[#F0EDE6]">{person.name}</div>
                        <div className="text-[10px] text-white/40 mt-0.5">{person.bio_social || person.city || ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Communities */}
            {visibleCommunities.length > 0 && (
              <>
                <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium mb-2">Communities</div>
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