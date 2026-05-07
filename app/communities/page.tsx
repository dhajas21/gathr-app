'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'

const CATEGORIES = ['All', 'Fitness', 'Startups', 'Arts', 'Music', 'Tech', 'Food & Drink', 'Outdoors']

export default function CommunitiesPage() {
  const [user, setUser] = useState<any>(null)
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
    // Get communities user has joined
    const { data: memberData } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('user_id', userId)

    const joinedIds = memberData?.map(m => m.community_id) || []

    if (joinedIds.length > 0) {
      const { data: joinedData } = await supabase
        .from('communities')
        .select('*')
        .in('id', joinedIds)
      if (joinedData) setJoined(joinedData)
    }

    // Get communities user has NOT joined (discover)
    let discoverQuery = supabase
      .from('communities')
      .select('*')
      .order('member_count', { ascending: false })
      .limit(20)

    if (joinedIds.length > 0) {
      // Filter out joined communities manually after fetch
      const { data: allData } = await discoverQuery
      if (allData) setDiscover(allData.filter(c => !joinedIds.includes(c.id)))
    } else {
      const { data: allData } = await discoverQuery
      if (allData) setDiscover(allData)
    }

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
      // Update member count directly
      const comm = discover.find(c => c.id === communityId)
      await supabase.from('communities').update({
        member_count: (comm?.member_count || 0) + 1
      }).eq('id', communityId)
      fetchCommunities(user.id)
    }
  }

  const filteredDiscover = discover.filter(c => {
    const matchesCategory = activeCategory === 'All' || c.category === activeCategory
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase())
    return matchesCategory && matchesSearch
  })

  if (loading) return (
    <div className="min-h-screen bg-[#0D110D] flex items-center justify-center">
      <div className="text-[#E8B84B] text-2xl font-bold">Gathr.</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0D110D] pb-24">

      {/* Header */}
      <div className="px-4 pt-14 pb-2">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-bold text-[#F0EDE6] text-xl" style={{ fontFamily: 'sans-serif' }}>Communities</h1>
          <button onClick={() => router.push('/communities/create')}
            className="bg-[#1E3A1E] border border-[#E8B84B]/20 rounded-xl px-3 py-1.5 text-xs text-[#E8B84B] font-semibold">
            + New
          </button>
        </div>
        <p className="text-xs text-white/40">Groups built around shared interests</p>

        {/* Search */}
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

      {/* Category chips */}
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

        {/* Your communities */}
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

        {/* Discover */}
        <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2 font-medium">Discover</div>

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