'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'

interface Post {
  id: string
  user_id: string
  text: string
  like_count: number
  created_at: string
  profiles: { id: string; name: string; avatar_url: string | null }
  liked?: boolean
}

export default function CommunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [user, setUser] = useState<any>(null)
  const [community, setCommunity] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [isMember, setIsMember] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [memberRole, setMemberRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [communityId, setCommunityId] = useState('')
  const [activeTab, setActiveTab] = useState<'feed' | 'events' | 'members'>('feed')
  const [postText, setPostText] = useState('')
  const [posting, setPosting] = useState(false)
  const postInputRef = useRef<HTMLTextAreaElement>(null)
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

  useEffect(() => {
    if (!communityId) return
    const channel = supabase
      .channel('community-posts-' + communityId)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'community_posts',
        filter: 'community_id=eq.' + communityId,
      }, async (payload) => {
        const { data } = await supabase
          .from('community_posts')
          .select('id, user_id, text, like_count, created_at, profiles(id, name, avatar_url)')
          .eq('id', payload.new.id).single()
        if (data) setPosts(prev => [{ ...(data as any), liked: false }, ...prev])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [communityId])

  const fetchCommunity = async (id: string, userId: string) => {
    const { data: commData } = await supabase.from('communities').select('*').eq('id', id).single()
    if (!commData) { router.push('/communities'); return }
    setCommunity(commData)

    const [memberCheck, membersData, eventsData, postsData, likesData] = await Promise.all([
      supabase.from('community_members').select('role').eq('community_id', id).eq('user_id', userId).single(),
      supabase.from('community_members')
        .select('*, profile:profiles!community_members_user_id_fkey(id, name, bio_social, avatar_url)')
        .eq('community_id', id).neq('role', 'pending')
        .order('joined_at', { ascending: true }).limit(50),
      supabase.from('events').select('*').eq('community_id', id).order('start_datetime', { ascending: true }).limit(10),
      supabase.from('community_posts').select('id, user_id, text, like_count, created_at, profiles(id, name, avatar_url)').eq('community_id', id).order('created_at', { ascending: false }).limit(30),
      supabase.from('community_post_likes').select('post_id').eq('user_id', userId),
    ])

    const role = memberCheck.data?.role
    if (role === 'pending') {
      setIsPending(true)
      setIsMember(false)
      setMemberRole(null)
    } else if (role) {
      setIsMember(true)
      setMemberRole(role)

      // Fetch pending requests if owner/admin
      if (role === 'owner' || role === 'admin') {
        const { data: pending } = await supabase
          .from('community_members')
          .select('*, profile:profiles!community_members_user_id_fkey(id, name, bio_social, avatar_url)')
          .eq('community_id', id).eq('role', 'pending')
          .order('joined_at', { ascending: true })
        if (pending) setPendingRequests(pending)
      }
    }

    if (membersData.data) setMembers(membersData.data)
    if (eventsData.data) setEvents(eventsData.data)

    if (postsData.data) {
      const likedIds = new Set((likesData.data || []).map((l: any) => l.post_id))
      setPosts(postsData.data.map((p: any) => ({ ...p, liked: likedIds.has(p.id) })))
    }

    setLoading(false)
  }

  const handleJoin = async () => {
    if (!user || actionLoading) return
    setActionLoading(true)
    if (community?.is_private) {
      const { error } = await supabase.from('community_members').insert({
        community_id: communityId, user_id: user.id, role: 'pending',
      })
      if (!error) setIsPending(true)
    } else {
      const { error } = await supabase.from('community_members').insert({
        community_id: communityId, user_id: user.id, role: 'member',
      })
      if (!error) {
        setIsMember(true)
        setMemberRole('member')
        await supabase.from('communities').update({ member_count: (community?.member_count || 0) + 1 }).eq('id', communityId)
        setCommunity((prev: any) => prev ? { ...prev, member_count: (prev.member_count || 0) + 1 } : prev)
      }
    }
    setActionLoading(false)
  }

  const handleCancelRequest = async () => {
    if (!user || actionLoading) return
    setActionLoading(true)
    await supabase.from('community_members').delete().eq('community_id', communityId).eq('user_id', user.id)
    setIsPending(false)
    setActionLoading(false)
  }

  const handleLeave = async () => {
    if (!user || actionLoading || memberRole === 'owner') return
    setActionLoading(true)
    await supabase.from('community_members').delete().eq('community_id', communityId).eq('user_id', user.id)
    setIsMember(false)
    setMemberRole(null)
    await supabase.from('communities').update({ member_count: Math.max(0, (community?.member_count || 1) - 1) }).eq('id', communityId)
    setCommunity((prev: any) => prev ? { ...prev, member_count: Math.max(0, (prev.member_count || 1) - 1) } : prev)
    setActionLoading(false)
  }

  const handleAcceptMember = async (memberId: string, userId: string) => {
    await supabase.from('community_members').update({ role: 'member' })
      .eq('community_id', communityId).eq('user_id', userId)
    setPendingRequests(prev => prev.filter(r => r.user_id !== userId))
    const { data: newMember } = await supabase
      .from('community_members')
      .select('*, profile:profiles!community_members_user_id_fkey(id, name, bio_social, avatar_url)')
      .eq('community_id', communityId).eq('user_id', userId).single()
    if (newMember) setMembers(prev => [...prev, newMember])
    await supabase.from('communities').update({ member_count: (community?.member_count || 0) + 1 }).eq('id', communityId)
    setCommunity((prev: any) => prev ? { ...prev, member_count: (prev.member_count || 0) + 1 } : prev)
  }

  const handleDeclineMember = async (userId: string) => {
    await supabase.from('community_members').delete()
      .eq('community_id', communityId).eq('user_id', userId)
    setPendingRequests(prev => prev.filter(r => r.user_id !== userId))
  }

  const handlePost = async () => {
    const trimmed = postText.trim()
    if (!trimmed || !user || posting) return
    setPosting(true)
    setPostText('')
    await supabase.from('community_posts').insert({ community_id: communityId, user_id: user.id, text: trimmed })
    setPosting(false)
  }

  const handleLike = async (post: Post) => {
    if (!user) return
    const nowLiked = !post.liked
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, liked: nowLiked, like_count: p.like_count + (nowLiked ? 1 : -1) } : p))
    if (nowLiked) {
      await supabase.from('community_post_likes').insert({ post_id: post.id, user_id: user.id })
      await supabase.from('community_posts').update({ like_count: post.like_count + 1 }).eq('id', post.id)
    } else {
      await supabase.from('community_post_likes').delete().eq('post_id', post.id).eq('user_id', user.id)
      await supabase.from('community_posts').update({ like_count: Math.max(0, post.like_count - 1) }).eq('id', post.id)
    }
  }

  const handleDeletePost = async (postId: string) => {
    await supabase.from('community_posts').delete().eq('id', postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  const handleShare = async () => {
    const url = window.location.href
    const shareData = { title: event?.title || 'Gathr Event', text: event?.description || 'Check out this event on Gathr!', url }
    if (navigator.share) {
      try { await navigator.share(shareData) } catch {}
    } else {
      await navigator.clipboard.writeText(url)
    }
  }

  const formatTime = (dt: string) => {
    const diff = Date.now() - new Date(dt).getTime()
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago'
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago'
    return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

  const isOwnerOrAdmin = memberRole === 'owner' || memberRole === 'admin'

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
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D110D] via-transparent to-transparent" />
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 z-10">
          <button onClick={() => router.push('/communities')}
            className="w-9 h-9 bg-[#0D110D]/70 border border-white/15 rounded-xl flex items-center justify-center text-[#F0EDE6]">
            ←
          </button>
          <div className="flex gap-2">
            <button onClick={handleShare} className="w-9 h-9 bg-[#0D110D]/70 border border-white/15 rounded-xl flex items-center justify-center text-base">↑</button>
            {memberRole === 'owner' && (
              <button onClick={() => router.push('/communities/' + communityId + '/settings')}
                className="w-9 h-9 bg-[#0D110D]/70 border border-white/15 rounded-xl flex items-center justify-center text-base">⚙️</button>
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="px-4 pt-3 pb-3">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: community.banner_gradient || '#1E2E1E' }}>
            {community.icon || '👥'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-[#F0EDE6] text-lg leading-tight">{community.name}</h1>
              {community.is_private && <span className="text-[9px] bg-white/10 border border-white/10 text-white/40 px-1.5 py-0.5 rounded">🔒 Private</span>}
            </div>
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
          <div className="font-bold text-[#E8B84B] text-base">{posts.length}</div>
          <div className="text-[9px] text-white/40 mt-0.5 uppercase tracking-wide">Posts</div>
        </div>
        <div className="flex-1 text-center py-3">
          <div className="font-bold text-[#E8B84B] text-base">{events.length}</div>
          <div className="text-[9px] text-white/40 mt-0.5 uppercase tracking-wide">Events</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 px-4 gap-5">
        {(['feed', 'events', 'members'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={'py-3 text-xs font-semibold capitalize border-b-2 transition-all ' +
              (activeTab === tab ? 'border-[#E8B84B] text-[#E8B84B]' : 'border-transparent text-white/35')}>
            {tab === 'feed'
              ? `Feed${posts.length > 0 ? ' · ' + posts.length : ''}`
              : tab === 'events'
              ? `Events${events.length > 0 ? ' · ' + events.length : ''}`
              : `Members · ${members.length}${pendingRequests.length > 0 ? ' · ' + pendingRequests.length + ' pending' : ''}`}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4">

        {/* FEED TAB */}
        {activeTab === 'feed' && (
          <div className="space-y-3">
            {/* Private locked state for non-members */}
            {community.is_private && !isMember && (
              <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-5 text-center">
                <div className="text-3xl mb-2">🔒</div>
                <div className="text-sm font-semibold text-[#F0EDE6] mb-1">Private Community</div>
                <div className="text-xs text-white/40">
                  {isPending ? 'Your request is being reviewed by the owner.' : 'Join to see posts and participate.'}
                </div>
              </div>
            )}

            {isMember && (
              <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5">
                <textarea
                  ref={postInputRef}
                  value={postText}
                  onChange={e => setPostText(e.target.value)}
                  placeholder="Share something with the community..."
                  maxLength={1000}
                  rows={3}
                  className="w-full bg-transparent text-sm text-[#F0EDE6] placeholder-white/20 outline-none resize-none"
                />
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                  <span className="text-[10px] text-white/20">{postText.length}/1000</span>
                  <button onClick={handlePost} disabled={!postText.trim() || posting}
                    className="bg-[#E8B84B] text-[#0D110D] text-xs font-bold px-4 py-1.5 rounded-xl disabled:opacity-30 active:scale-95 transition-transform">
                    {posting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            )}

            {isMember && posts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="text-4xl">📢</div>
                <p className="text-white/40 text-sm text-center">No posts yet — start the conversation!</p>
              </div>
            )}

            {isMember && posts.map(post => {
              const profile = (post as any).profiles
              const isOwn = post.user_id === user?.id
              return (
                <div key={post.id} className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5">
                  <div className="flex items-start gap-2.5 mb-3">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 bg-[#2A4A2A] rounded-xl flex items-center justify-center text-sm flex-shrink-0">
                        {profile?.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <button onClick={() => router.push('/profile/' + profile?.id)}
                          className="text-sm font-semibold text-[#F0EDE6]">{profile?.name || 'Unknown'}</button>
                        <span className="text-[9px] text-white/25">{formatTime(post.created_at)}</span>
                        {isOwn && (
                          <button onClick={() => handleDeletePost(post.id)} className="ml-auto text-[9px] text-white/20">✕</button>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed mb-3">{post.text}</p>
                  <div className="flex items-center gap-4 pt-2 border-t border-white/10">
                    <button onClick={() => handleLike(post)}
                      className={'flex items-center gap-1.5 text-xs font-medium transition-colors ' + (post.liked ? 'text-[#E8B84B]' : 'text-white/30')}>
                      <span>{post.liked ? '♥' : '♡'}</span>
                      <span>{post.like_count > 0 ? post.like_count : ''}</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* EVENTS TAB */}
        {activeTab === 'events' && (
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
        )}

        {/* MEMBERS TAB */}
        {activeTab === 'members' && (
          <div className="space-y-3">
            {/* Pending requests — owner/admin only */}
            {isOwnerOrAdmin && pendingRequests.length > 0 && (
              <div className="bg-[#1E2A1E] border border-[#7EC87E]/20 rounded-2xl p-3.5">
                <div className="text-[9px] uppercase tracking-widest text-[#7EC87E]/60 font-medium mb-3">
                  {pendingRequests.length} Join Request{pendingRequests.length !== 1 ? 's' : ''}
                </div>
                <div className="space-y-3">
                  {pendingRequests.map(req => (
                    <div key={req.user_id} className="flex items-center gap-3">
                      {req.profile?.avatar_url ? (
                        <img src={req.profile.avatar_url} alt="" className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 bg-[#2A4A2A] rounded-xl flex items-center justify-center text-base flex-shrink-0">
                          {req.profile?.name?.charAt(0) || '🧑'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[#F0EDE6]">{req.profile?.name || 'Unknown'}</div>
                        <div className="text-xs text-white/40 truncate">{req.profile?.bio_social || 'Wants to join'}</div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => handleAcceptMember(req.id, req.user_id)}
                          className="bg-[#E8B84B] text-[#0D110D] text-xs font-bold px-3 py-1.5 rounded-xl active:scale-95 transition-transform">
                          Accept
                        </button>
                        <button onClick={() => handleDeclineMember(req.user_id)}
                          className="bg-[#1C241C] border border-white/10 text-white/40 text-xs px-3 py-1.5 rounded-xl">
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
        )}
      </div>

      {/* CTA bar */}
      <div className="fixed bottom-16 left-0 right-0 px-4 pb-4 pt-4 bg-gradient-to-t from-[#0D110D] via-[#0D110D]/95 to-transparent">
        {isMember ? (
          <div className="flex gap-3">
            <button onClick={handleLeave} disabled={memberRole === 'owner' || actionLoading}
              className="flex-1 py-3.5 rounded-2xl bg-[#1C241C] border border-white/10 text-white/50 text-sm font-medium text-center disabled:opacity-30">
              {memberRole === 'owner' ? 'Owner' : 'Leave'}
            </button>
            <button onClick={() => router.push('/create?community=' + communityId)}
              className="flex-[2] py-3.5 rounded-2xl bg-[#E8B84B] text-[#0D110D] text-sm font-bold text-center active:scale-95 transition-transform"
              style={{ boxShadow: '0 4px 18px rgba(232,184,75,0.28)' }}>
              Create Event
            </button>
          </div>
        ) : isPending ? (
          <button onClick={handleCancelRequest} disabled={actionLoading}
            className="w-full py-4 rounded-2xl bg-[#1C241C] border border-[#E8B84B]/30 text-[#E8B84B] text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50">
            ⏳ Request Sent — Tap to Cancel
          </button>
        ) : (
          <button onClick={handleJoin} disabled={actionLoading}
            className="w-full py-4 rounded-2xl bg-[#E8B84B] text-[#0D110D] text-sm font-bold active:scale-95 transition-transform disabled:opacity-50"
            style={{ boxShadow: '0 5px 22px rgba(232,184,75,0.3)' }}>
            {actionLoading ? 'Sending...' : community.is_private ? '🔒 Request to Join' : '+ Join Community'}
          </button>
        )}
      </div>

      <BottomNav />
    </div>
  )
}