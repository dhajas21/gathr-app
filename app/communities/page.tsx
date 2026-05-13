'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { CommunitiesPageSkeleton } from '@/components/Skeleton'

const CATEGORIES = ['All', 'Social', 'Music', 'Fitness & Running', 'Food & Drink', 'Tech & Startups', 'Arts & Creativity', 'Outdoors & Adventure', 'Wellness', 'Gaming', 'Nightlife']

const INTEREST_TO_COMMUNITY_CAT: Record<string, string> = {
  'fitness': 'Fitness & Running', 'running': 'Fitness & Running', 'gym': 'Fitness & Running',
  'yoga': 'Wellness', 'pilates': 'Wellness', 'cycling': 'Fitness & Running', 'swimming': 'Fitness & Running',
  'hiking': 'Outdoors & Adventure', 'rock climbing': 'Fitness & Running', 'martial arts': 'Fitness & Running',
  'boxing': 'Fitness & Running', 'crossfit': 'Fitness & Running', 'dancing': 'Arts & Creativity',
  'sports': 'Fitness & Running', 'football': 'Fitness & Running', 'basketball': 'Fitness & Running',
  'soccer': 'Fitness & Running', 'tennis': 'Fitness & Running', 'golf': 'Fitness & Running',
  'volleyball': 'Fitness & Running', 'skiing': 'Outdoors & Adventure', 'snowboarding': 'Outdoors & Adventure',
  'surfing': 'Outdoors & Adventure', 'kayaking': 'Outdoors & Adventure',
  'startups': 'Tech & Startups', 'entrepreneurship': 'Tech & Startups', 'product': 'Tech & Startups',
  'investing': 'Tech & Startups', 'business': 'Tech & Startups', 'marketing': 'Tech & Startups',
  'venture capital': 'Tech & Startups', 'founder': 'Tech & Startups',
  'art': 'Arts & Creativity', 'painting': 'Arts & Creativity', 'drawing': 'Arts & Creativity',
  'ceramics': 'Arts & Creativity', 'fashion': 'Arts & Creativity', 'design': 'Arts & Creativity',
  'photography': 'Arts & Creativity', 'film': 'Arts & Creativity', 'theatre': 'Arts & Creativity',
  'comedy': 'Arts & Creativity', 'writing': 'Arts & Creativity', 'poetry': 'Arts & Creativity',
  'books': 'Arts & Creativity', 'literature': 'Arts & Creativity', 'architecture': 'Arts & Creativity',
  'music': 'Music', 'concerts': 'Music', 'dj': 'Music', 'electronic': 'Music',
  'hip hop': 'Music', 'jazz': 'Music', 'classical': 'Music', 'indie': 'Music',
  'rock': 'Music', 'r&b': 'Music', 'pop': 'Music', 'rap': 'Music', 'karaoke': 'Music',
  'tech': 'Tech & Startups', 'coding': 'Tech & Startups', 'ai': 'Tech & Startups', 'crypto': 'Tech & Startups',
  'web3': 'Tech & Startups', 'gaming': 'Gaming', 'ux': 'Tech & Startups', 'science': 'Tech & Startups',
  'food': 'Food & Drink', 'coffee': 'Food & Drink', 'wine': 'Food & Drink',
  'beer': 'Food & Drink', 'cocktails': 'Food & Drink', 'cooking': 'Food & Drink',
  'baking': 'Food & Drink', 'brunch': 'Food & Drink', 'restaurants': 'Food & Drink',
  'vegan': 'Food & Drink', 'tea': 'Food & Drink', 'whiskey': 'Food & Drink',
  'outdoors': 'Outdoors & Adventure', 'camping': 'Outdoors & Adventure', 'travel': 'Outdoors & Adventure',
  'adventure': 'Outdoors & Adventure', 'nature': 'Outdoors & Adventure', 'birdwatching': 'Outdoors & Adventure',
  'gardening': 'Outdoors & Adventure',
}

export default function CommunitiesPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [joined, setJoined] = useState<any[]>([])
  const [discover, setDiscover] = useState<any[]>([])
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const { refreshing, pullProgress, handleTouchStart, handleTouchMove, handleTouchEnd } = usePullToRefresh(
    async () => { if (user) await fetchCommunities(user.id) }
  )

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUser(session.user)
      fetchCommunities(session.user.id)
    })
  }, [])

  const fetchCommunities = async (userId: string) => {
    const [memberData, profileData, allCommData] = await Promise.all([
      supabase.from('community_members').select('community_id').eq('user_id', userId),
      supabase.from('profiles').select('interests, city').eq('id', userId).single(),
      supabase.from('communities').select('*').order('member_count', { ascending: false }).limit(50),
    ])

    if (profileData.data) setProfile(profileData.data)

    const joinedIds = memberData.data?.map((m: any) => m.community_id) || []
    const allComms: any[] = allCommData.data || []

    setJoined(allComms.filter(c => joinedIds.includes(c.id)))
    setDiscover(allComms.filter(c => !joinedIds.includes(c.id)))
    setLoading(false)
  }

  const handleJoin = async (communityId: string, isPrivate: boolean) => {
    if (!user || joiningId) return
    setJoiningId(communityId)
    const role = isPrivate ? 'pending' : 'member'
    const { error } = await supabase.from('community_members').insert({
      community_id: communityId,
      user_id: user.id,
      role,
    })
    if (!error) {
      await fetchCommunities(user.id)
    }
    setJoiningId(null)
  }

  const suggestedCats = new Set<string>(
    (profile?.interests || []).flatMap((i: string) => {
      const cat = INTEREST_TO_COMMUNITY_CAT[i.toLowerCase()]
      return cat ? [cat] : []
    })
  )

  const catMatches = (commCat: string, filterCat: string) =>
    commCat === filterCat || commCat?.toLowerCase().includes(filterCat.toLowerCase()) || filterCat.toLowerCase().includes(commCat?.toLowerCase())

  const suggestedDiscover = discover.filter(c =>
    [...suggestedCats].some(cat => catMatches(c.category, cat)) &&
    (!search || c.name.toLowerCase().includes(search.toLowerCase()))
  )

  const filteredDiscover = discover.filter(c => {
    const matchesCategory = activeCategory === 'All' || catMatches(c.category, activeCategory)
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase())
    const notSuggested = activeCategory !== 'All' || ![...suggestedCats].some(cat => catMatches(c.category, cat))
    return matchesCategory && matchesSearch && (activeCategory !== 'All' || notSuggested)
  })

  if (loading) return <CommunitiesPageSkeleton />

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

      <div className="px-4 pt-14 pb-2">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-display font-bold text-[#F0EDE6] text-xl">Communities</h1>
          <button onClick={() => router.push('/communities/create')}
            className="bg-[#1E3A1E] border border-[#E8B84B]/20 rounded-xl px-3 py-1.5 text-xs text-[#E8B84B] font-semibold">
            + New
          </button>
        </div>
        <p className="text-xs text-white/40">Groups built around shared interests</p>

        <div className={`flex items-center gap-2 bg-[#1C241C] border rounded-2xl px-4 py-2.5 mt-3 transition-all ${searchFocused ? 'border-[#E8B84B]/35' : 'border-white/10'}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0 text-white/35">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search communities..."
            style={{ fontSize: '16px' }}
            className="flex-1 bg-transparent text-[#F0EDE6] placeholder-white/30 outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-white/35 flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <div className="flex gap-2 overflow-x-auto px-4 py-3 [&::-webkit-scrollbar]:h-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-thumb]:rounded-full">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition-all flex-shrink-0 ${
                activeCategory === cat
                  ? 'bg-[#E8B84B] text-[#0D110D] border-[#E8B84B] font-semibold shadow-[0_0_14px_rgba(232,184,75,0.45)]'
                  : 'bg-[#1C241C] text-white/45 border-white/10'
              }`}>
              {cat}
            </button>
          ))}
          <div className="w-6 flex-shrink-0" />
        </div>
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-[#0D110D] to-transparent" />
      </div>

      <div className="px-4">

        {joined.length > 0 && (
          <>
            <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2 font-medium mt-2">Your communities</div>
            <div className="space-y-2 mb-4">
              {joined.map(comm => (
                <div key={comm.id} onClick={() => router.push(`/communities/${comm.id}`)}
                  className="bg-[#1C241C] border border-white/10 rounded-2xl p-3 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform">
                  <div className="comm-banner w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={comm.banner_gradient ? { '--comm-bg': comm.banner_gradient } as React.CSSProperties : {}}>
                    {comm.icon
                      ? <span className="text-lg">{comm.icon}</span>
                      : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-white/40"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[#F0EDE6]">{comm.name}</div>
                    <div className="text-[10px] text-white/40 mt-0.5">{comm.member_count} members</div>
                  </div>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/25 flex-shrink-0"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              ))}
            </div>
          </>
        )}

        {suggestedCats.size === 0 && activeCategory === 'All' && !search && discover.length > 0 && (
          <div className="flex items-center gap-3 bg-[#1C241C] border border-dashed border-[#E8B84B]/20 rounded-2xl p-3.5 mb-4 mt-2">
            <span className="text-xl flex-shrink-0">✦</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-[#F0EDE6]">Get personalized suggestions</div>
              <div className="text-[10px] text-white/40 mt-0.5">Add interests to your profile to see communities picked for you</div>
            </div>
            <button onClick={() => router.push('/profile/edit')}
              className="text-[10px] font-semibold text-[#E8B84B] bg-[#E8B84B]/10 border border-[#E8B84B]/20 px-2.5 py-1.5 rounded-lg flex-shrink-0">
              Add →
            </button>
          </div>
        )}

        {suggestedDiscover.length > 0 && activeCategory === 'All' && !search && (
          <>
            <div className="flex items-center gap-2 mb-2 mt-2">
              <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium">Suggested for you</div>
              <div className="flex-1 h-px bg-white/5"></div>
              <span className="text-[9px] text-[#E8B84B]/60">✦ Based on your interests</span>
            </div>
            <div className="space-y-3 mb-5">
              {suggestedDiscover.map(comm => (
                <div key={comm.id} className="bg-[#1C241C] border border-[#E8B84B]/15 rounded-2xl overflow-hidden">
                  <div className="comm-banner h-16 flex items-center justify-center relative"
                    style={comm.banner_gradient ? { '--comm-bg': comm.banner_gradient } as React.CSSProperties : {}}>
                    {comm.icon
                      ? <span className="text-2xl">{comm.icon}</span>
                      : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-white/45"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    }
                    <div className="absolute top-1.5 right-2">
                      <span className="text-[8px] bg-[#E8B84B]/20 text-[#E8B84B] px-2 py-0.5 rounded-full border border-[#E8B84B]/20 font-medium">✦ For you</span>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="font-bold text-sm text-[#F0EDE6] mb-1">{comm.name}</div>
                    <div className="text-[10px] text-white/40">{comm.member_count} members · {comm.description || comm.category}</div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex gap-1.5">
                        {comm.category && (
                          <span className="bg-[#2A4A2A]/40 text-[#7EC87E] text-[9px] px-2 py-0.5 rounded border border-[#7EC87E]/10">
                            #{comm.category.toLowerCase().replace(/\s/g, '')}
                          </span>
                        )}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleJoin(comm.id, comm.is_private) }}
                        disabled={joiningId === comm.id}
                        className="bg-[#E8B84B]/10 border border-[#E8B84B]/30 text-[#E8B84B] text-xs font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition-transform disabled:opacity-50">
                        {joiningId === comm.id ? '...' : '+ Join'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2 font-medium">
          {activeCategory === 'All' && suggestedDiscover.length > 0 ? 'More communities' : 'Discover'}
        </div>

        {filteredDiscover.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 bg-[#1C241C] border border-white/10 rounded-2xl flex items-center justify-center mx-auto">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/30">
                <path d="M12 22v-8M12 14c-2 0-5-2-5-6a5 5 0 0 1 10 0c0 4-3 6-5 6z"/>
              </svg>
            </div>
            <p className="text-white/40 text-sm text-center">No communities yet — be the first to create one!</p>
            <button onClick={() => router.push('/communities/create')}
              className="mt-2 bg-[#E8B84B] text-[#0D110D] px-5 py-2.5 rounded-2xl font-semibold text-sm">
              Create Community
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDiscover.map(comm => (
              <div key={comm.id} className="bg-[#1C241C] border border-white/10 rounded-2xl overflow-hidden">
                <div className="comm-banner h-14 flex items-center justify-center"
                  style={comm.banner_gradient ? { '--comm-bg': comm.banner_gradient } as React.CSSProperties : {}}>
                  {comm.icon
                    ? <span className="text-2xl">{comm.icon}</span>
                    : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-white/40"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  }
                </div>
                <div className="p-3">
                  <div className="font-bold text-sm text-[#F0EDE6] mb-1">{comm.name}</div>
                  <div className="text-[10px] text-white/40">{comm.member_count} members · {comm.description || comm.category}</div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex gap-1.5">
                      {comm.category && (
                        <span className="bg-[#2A4A2A]/40 text-[#7EC87E] text-[9px] px-2 py-0.5 rounded border border-[#7EC87E]/10">
                          #{comm.category.toLowerCase().replace(/\s/g, '')}
                        </span>
                      )}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleJoin(comm.id, comm.is_private) }}
                      disabled={joiningId === comm.id}
                      className="bg-[#1E3A1E] border border-[#E8B84B]/20 text-[#E8B84B] text-xs font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition-transform disabled:opacity-50">
                      {joiningId === comm.id ? '...' : '+ Join'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
