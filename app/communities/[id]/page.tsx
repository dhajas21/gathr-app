'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'

export default function CommunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [user, setUser] = useState<any>(null)
  const [community, setCommunity] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [isMember, setIsMember] = useState(false)
  const [memberRole, setMemberRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [communityId, setCommunityId] = useState('')
  const router = useRouter()

  useEffect(() => {
    params.then(({ id }) => {
      setCommunityId(id)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) { router.push('/auth'); return }
        setUser(session.user)
        fetchCommunity(id, session.user.id)
      })
    })
  }, [])

  const fetchCommunity = async (id: string, userId: string) => {
    const { data: commData } = await supabase
      .from('communities')
      .select('*')
      .eq('id', id)
      .single()

    if (!commData) { router.push('/communities'); return }
    setCommunity(commData)

    const { data: memberCheck } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', id)
      .eq('user_id', userId)
      .single()

    if (memberCheck) {
      setIsMember(true)
      setMemberRole(memberCheck.role)
    }

    const { data: membersData } = await supabase
      .from('community_members')
      .select('*, profile:profiles!community_members_user_id_fkey(id, name, bio_social, avatar_url)')
      .eq('community_id', id)
      .order('joined_at', { ascending: true })
      .limit(20)

    if (membersData) setMembers(membersData)

    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .eq('community_id', id)
      .order('start_datetime', { ascending: true })
      .limit(10)

    if (eventsData) setEvents(eventsData)

    setLoading(false)
  }

  const handleJoin = async () => {
    if (!user || actionLoading) return
    setActionLoading(true)

    const { error } = await supabase.from('community_members').insert({
      community_id: communityId,
      user_id: user.id,
      role: 'member',
    })

    if (!error) {
      setIsMember(true)
      setMemberRole('member')
      await supabase.from('communities').update({
        member_count: (community?.member_count || 0) + 1
      }).eq('id', communityId)
      setCommunity((prev: any) => prev ? { ...prev, member_count: (prev.member_count || 0) + 1 } : prev)
      fetchCommunity(communityId, user.id)
    }
    setActionLoading(false)
  }

  const handleLeave = async () => {
    if (!user || actionLoading || memberRole === 'owner') return
    setActionLoading(true)

    await supabase.from('community_members')
      .delete()
      .eq('community_id', communityId)
      .eq('user_id', user.id)

    setIsMember(false)
    setMemberRole(null)
    await supabase.from('communities').update({
      member_count: Math.max(0, (community?.member_count || 1) - 1)
    }).eq('id', communityId)
    setCommunity((prev: any) => prev ? { ...prev, member_count: Math.max(0, (prev.member_count || 1) - 1) } : prev)

    setActionLoading(false)
  }

  const formatDate = (dt: string) => {
    const d = new Date(dt)
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0D110D] flex items-center justify-center">
      <div className="text-[#E8B84B] text-2xl font-bold">Gathr.</div>
    </div>
  )

  if (!community) return null

  return (
    <div className="min-h-screen bg-[#0D110D] pb-32">

      {/* Banner */}
      <div className="relative h-44 flex items-center justify-center text-5xl"
        style={{ background: community.banner_gradient || 'linear-gradient(135deg,#1E2E1E,#0E1A0E)' }}>
        {community.banner_url ? (
          <img src={community.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <span className="relative z-10">{community.icon || '👥'}</span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D110D] via-transparent to-transparent"></div>
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 z-10">
          <button onClick={() => router.push('/communities')}
            className="w-9 h-9 bg-[#0D110D]/70 border border-white/15 rounded-xl flex items-center justify-center text-[#F0EDE6]">
            ←
          </button>
          <div className="flex gap-2">
            <button className="w-9 h-9 bg-[#0D110D]/70 border border-white/15 rounded-xl flex items-center justify-center text-base">↑</button>
            {memberRole === 'owner' && (
              <button className="w-9 h-9 bg-[#0D110D]/70 border border-white/15 rounded-xl flex items-center justify-center text-base">⚙️</button>
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="px-4 pt-3 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: community.banner_gradient || '#1E2E1E' }}>
            {community.icon || '👥'}
          </div>
          <div>
            <h1 className="font-bold text-[#F0EDE6] text-lg leading-tight">{community.name}</h1>
            <div className="text-xs text-white/40 mt-0.5">{community.member_count} members · {community.category}</div>
          </div>
        </div>
        {community.description && (
          <p className="text-sm text-white/55 leading-relaxed font-light mt-2">{community.description}</p>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex border-t border-b border-white/10">
        <div className="flex-1 text-center py-3 border-r border-white/10">
          <div className="font-bold text-[#E8B84B] text-base">{community.member_count}</div>
          <div className="text-[9px] text-white/40 mt-0.5 uppercase tracking-wide">Members</div>
        </div>
        <div className="flex-1 text-center py-3 border-r border-white/10">
          <div className="font-bold text-[#E8B84B] text-base">{events.length}</div>
          <div className="text-[9px] text-white/40 mt-0.5 uppercase tracking-wide">Events</div>
        </div>
        <div className="flex-1 text-center py-3">
          <div className="font-bold text-[#E8B84B] text-base">{community.category}</div>
          <div className="text-[9px] text-white/40 mt-0.5 uppercase tracking-wide">Category</div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">

        {/* Upcoming events */}
        <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium">Upcoming Events</div>
            {isMember && (
              <button onClick={() => router.push('/create?community=' + communityId)}
                className="bg-[#1E3A1E] border border-[#E8B84B]/20 text-[#E8B84B] text-[10px] font-semibold px-2.5 py-1 rounded-lg">
                + Event
              </button>
            )}
          </div>
          {events.length === 0 ? (
            <p className="text-xs text-white/30 text-center py-4">No events yet</p>
          ) : (
            <div className="space-y-2">
              {events.map(event => (
                <div key={event.id} onClick={() => router.push('/events/' + event.id)}
                  className="flex items-center gap-3 py-2 border-b border-white/10 last:border-0 cursor-pointer">
                  <div className="w-9 h-9 bg-[#1E3A1E] rounded-xl flex items-center justify-center text-base flex-shrink-0">🎉</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#F0EDE6] truncate">{event.title}</div>
                    <div className="text-xs text-white/40 mt-0.5">{formatDate(event.start_datetime)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Members */}
        <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5">
          <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium mb-3">
            Members · {members.length}
          </div>
          <div className="space-y-2">
            {members.map(member => (
              <div key={member.id}
                onClick={() => member.user_id !== user?.id && router.push('/profile/' + member.user_id)}
                className="flex items-center gap-3 py-2 border-b border-white/10 last:border-0 cursor-pointer">
                {member.profile?.avatar_url ? (
                  <img src={member.profile.avatar_url} alt="" className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-9 h-9 bg-[#2A4A2A] rounded-xl flex items-center justify-center text-base flex-shrink-0">
                    {member.profile?.name?.charAt(0) || '🧑'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#F0EDE6]">
                    {member.profile?.name || 'Unknown'}
                    {member.user_id === user?.id && <span className="text-white/30 text-xs ml-1.5">you</span>}
                  </div>
                  <div className="text-xs text-white/40 mt-0.5">{member.profile?.bio_social || member.role}</div>
                </div>
                {(member.role === 'owner' || member.role === 'admin') && (
                  <span className="bg-[#E8B84B]/10 border border-[#E8B84B]/20 text-[#E8B84B] text-[9px] px-2 py-0.5 rounded-md">
                    {member.role}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA bar */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-4 bg-gradient-to-t from-[#0D110D] via-[#0D110D]/95 to-transparent">
        {isMember ? (
          <div className="flex gap-3">
            <button onClick={handleLeave}
              disabled={memberRole === 'owner' || actionLoading}
              className="flex-1 py-3.5 rounded-2xl bg-[#1C241C] border border-white/10 text-white/50 text-sm font-medium text-center disabled:opacity-30">
              {memberRole === 'owner' ? 'Owner' : 'Leave'}
            </button>
            <button onClick={() => router.push('/create?community=' + communityId)}
              className="flex-[2] py-3.5 rounded-2xl bg-[#E8B84B] text-[#0D110D] text-sm font-bold text-center active:scale-95 transition-transform"
              style={{ boxShadow: '0 4px 18px rgba(232,184,75,0.28)' }}>
              Create Event in Community
            </button>
          </div>
        ) : (
          <button onClick={handleJoin} disabled={actionLoading}
            className="w-full py-4 rounded-2xl bg-[#E8B84B] text-[#0D110D] text-sm font-bold active:scale-95 transition-transform disabled:opacity-50"
            style={{ boxShadow: '0 5px 22px rgba(232,184,75,0.3)' }}>
            {actionLoading ? 'Joining...' : '+ Join Community'}
          </button>
        )}
      </div>
    </div>
  )
}