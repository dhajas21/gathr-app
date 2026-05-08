'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'

const CATEGORIES = ['All', 'Fitness', 'Wellness', 'Startups', 'Arts', 'Music', 'Tech', 'Food & Drink', 'Outdoors', 'Nightlife', 'Social']

const INTEREST_TO_COMMUNITY_CAT: Record<string, string> = {
  'fitness': 'Fitness', 'running': 'Fitness', 'gym': 'Fitness', 'yoga': 'Fitness',
  'pilates': 'Fitness', 'cycling': 'Fitness', 'swimming': 'Fitness', 'hiking': 'Outdoors',
  'rock climbing': 'Fitness', 'martial arts': 'Fitness', 'boxing': 'Fitness',
  'crossfit': 'Fitness', 'dancing': 'Fitness', 'sports': 'Fitness', 'football': 'Fitness',
  'basketball': 'Fitness', 'soccer': 'Fitness', 'tennis': 'Fitness', 'golf': 'Fitness',
  'volleyball': 'Fitness', 'skiing': 'Outdoors', 'snowboarding': 'Outdoors',
  'surfing': 'Outdoors', 'kayaking': 'Outdoors',
  'startups': 'Startups', 'entrepreneurship': 'Startups', 'product': 'Startups',
  'investing': 'Startups', 'business': 'Startups', 'marketing': 'Startups',
  'venture capital': 'Startups', 'founder': 'Startups',
  'art': 'Arts', 'painting': 'Arts', 'drawing': 'Arts', 'ceramics': 'Arts',
  'fashion': 'Arts', 'design': 'Arts', 'photography': 'Arts', 'film': 'Arts',
  'theatre': 'Arts', 'comedy': 'Arts', 'writing': 'Arts', 'poetry': 'Arts',
  'books': 'Arts', 'literature': 'Arts', 'architecture': 'Arts',
  'music': 'Music', 'concerts': 'Music', 'dj': 'Music', 'electronic': 'Music',
  'hip hop': 'Music', 'jazz': 'Music', 'classical': 'Music', 'indie': 'Music',
  'rock': 'Music', 'r&b': 'Music', 'pop': 'Music', 'rap': 'Music', 'karaoke': 'Music',
  'tech': 'Tech', 'coding': 'Tech', 'ai': 'Tech', 'crypto': 'Tech',
  'web3': 'Tech', 'gaming': 'Tech', 'ux': 'Tech', 'science': 'Tech',
  'food': 'Food & Drink', 'coffee': 'Food & Drink', 'wine': 'Food & Drink',
  'beer': 'Food & Drink', 'cocktails': 'Food & Drink', 'cooking': 'Food & Drink',
  'baking': 'Food & Drink', 'brunch': 'Food & Drink', 'restaurants': 'Food & Drink',
  'vegan': 'Food & Drink', 'tea': 'Food & Drink', 'whiskey': 'Food & Drink',
  'outdoors': 'Outdoors', 'camping': 'Outdoors', 'travel': 'Outdoors',
  'adventure': 'Outdoors', 'nature': 'Outdoors', 'birdwatching': 'Outdoors',
  'gardening': 'Outdoors',
}

export default function CommunitiesPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [joined, setJoined] = useState<any[]>([])
  const [discover, setDiscover] = useState<any[]>([])
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

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

  const handleJoin = async (communityId: string) => {
    if (!user) return
    const { error } = await supabase.from('community_members').insert({
      community_id: communityId,
      user_id: user.id,
      role: 'member',
    })
    if (!error) {
      const comm = discover.find(c => c.id === communityId)
      await supabase.from('communities').update({
        member_count: (comm?.member_count || 0) + 1
      }).eq('id', communityId)
      fetchCommunities(user.id)
    }
  }

  const suggestedCats = new Set<string>(
    (profile?.interests || []).flatMap((i: string) => {
      const cat = INTEREST_TO_COMMUNITY_CAT[i.toLowerCase()]
      return cat ? [cat] : []
    })
  )

  const suggestedDiscover = discover.filter(c =>
    suggestedCats.has(c.category) &&
    (!search || c.name.toLowerCase().includes(search.toLowerCase()))
  )

  const filteredDiscover = discover.filter(c => {
    const matchesCategory = activeCategory === 'All' || c.category === activeCategory
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase())
    const notSuggested = activeCategory !== 'All' || !suggestedCats.has(c.category)
    return matchesCategory && matchesSearch && (activeCategory !== 'All' || notSuggested)
  })

  if (loading) return (
    <div className="min-h-screen bg-[#0D110D] flex items-center justify-center">
      <div className="text-[#E8B84B] text-2xl font-bold">Gathr.</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0D110D] pb-24">

      <div className="px-4 pt-14 pb-2">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-bold text-[#F0EDE6] text-xl" style={{ fontFamily: 'sans-serif' }}>Communities</h1>
          <button onClick={() => router.push('/communities/create')}
            className="bg-[#1E3A1E] border border-[#E8B84B]/20 rounded-xl px-3 py-1.5 text-xs text-[#E8B84B] font-semibold">
            + New
          </button>
        </div>
        <p className="text-xs text-white/40">Groups built around shared interests</p>

        <div className="flex items-center gap-2 bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-2.5 mt-3">
          <span className="text-sm text-white/30">🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search communities..."
            className="flex-1 bg-transparent text-sm text-[#F0EDE6] placeholder-white/30 outline-none"
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition-all ${
              activeCategory === cat
                ? 'bg-[#E8B84B] text-[#0D110D] border-[#E8B84B] font-semibold'
                : 'bg-[#1C241C] text-white/45 border-white/10'
            }`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="px-4">

        {joined.length > 0 && (
          <>
            <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2 font-medium mt-2">Your communities</div>
            <div className="space-y-2 mb-4">
              {joined.map(comm => (
                <div key={comm.id} onClick={() => router.push(`/communities/${comm.id}`)}
                  className="bg-[#1C241C] border border-white/10 rounded-2xl p-3 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: comm.banner_gradient || '#1E2E1E' }}>
                    {comm.icon || '👥'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[#F0EDE6]">{comm.name}</div>
                    <div className="text-[10px] text-white/40 mt-0.5">{comm.member_count} members</div>
                  </div>
                  <div className="text-xs text-white/20">›</div>
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
                  <div className="h-14 flex items-center justify-center text-2xl relative"
                    style={{ background: comm.banner_gradient || 'linear-gradient(135deg,#1E2E1E,#0E1A0E)' }}>
                    {comm.icon || '👥'}
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
                      <button onClick={(e) => { e.stopPropagation(); handleJoin(comm.id) }}
                        className="bg-[#E8B84B]/10 border border-[#E8B84B]/30 text-[#E8B84B] text-xs font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition-transform">
                        + Join
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
            <div className="text-4xl">🌱</div>
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
                <div className="h-14 flex items-center justify-center text-2xl"
                  style={{ background: comm.banner_gradient || 'linear-gradient(135deg,#1E2E1E,#0E1A0E)' }}>
                  {comm.icon || '👥'}
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
                    <button onClick={(e) => { e.stopPropagation(); handleJoin(comm.id) }}
                      className="bg-[#1E3A1E] border border-[#E8B84B]/20 text-[#E8B84B] text-xs font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition-transform">
                      + Join
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
