'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { MessagesPageSkeleton } from '@/components/Skeleton'

export default function MessagesPage() {
  const [user, setUser] = useState<any>(null)
  const [threads, setThreads] = useState<any[]>([])
  const [connections, setConnections] = useState<any[]>([])
  const [acceptedConnections, setAcceptedConnections] = useState<any[]>([])
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [communityChats, setCommunityChats] = useState<any[]>([])
  const [showCompose, setShowCompose] = useState(false)
  const [composeSearch, setComposeSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const fetchCommunityChats = async (userId: string) => {
    const { data: memberships } = await supabase
      .from('community_members')
      .select('community_id, community:communities(id, name, icon, banner_gradient)')
      .eq('user_id', userId)
      .neq('role', 'pending')
    if (!memberships || memberships.length === 0) { setCommunityChats([]); return }

    // Fetch last message per community in parallel (capped at 20 to bound request count)
    const capped = memberships.slice(0, 20)
    const lastMsgResults = await Promise.all(
      capped.map((m: any) =>
        supabase
          .from('community_chat_messages')
          .select('community_id, user_id, text, created_at, profiles(name)')
          .eq('community_id', m.community_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      )
    )

    const chats = capped
      .map((m: any, i: number) => ({
        communityId: m.community_id,
        community: m.community,
        lastMessage: lastMsgResults[i].data || null,
      }))
      .filter((m: any) => m.community && m.lastMessage) // only show communities with chat activity

    setCommunityChats(chats)
  }

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>
    let commChatChannel: ReturnType<typeof supabase.channel>

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      const uid = session.user.id
      setUser(session.user)
      fetchData(uid)
      fetchCommunityChats(uid)

      channel = supabase
        .channel('messages-list-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const msg = payload.new as any
          if (msg.sender_id === uid || msg.recipient_id === uid) fetchData(uid)
        })
        .subscribe()

      commChatChannel = supabase
        .channel('messages-community-chats')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_chat_messages' }, () => {
          fetchCommunityChats(uid)
        })
        .subscribe()
    })

    return () => {
      if (channel) supabase.removeChannel(channel)
      if (commChatChannel) supabase.removeChannel(commChatChannel)
    }
  }, [])

  const fetchData = async (userId: string) => {
    const [connRes, msgRes, unreadRes, acceptedRes] = await Promise.all([
      supabase
        .from('connections')
        .select('*, requester:profiles!connections_requester_id_fkey(id, name, avatar_url)')
        .eq('addressee_id', userId)
        .eq('status', 'pending'),
      supabase
        .from('messages')
        .select('*')
        .or('sender_id.eq.' + userId + ',recipient_id.eq.' + userId)
        .order('sent_at', { ascending: false }),
      supabase
        .from('messages')
        .select('thread_id')
        .eq('recipient_id', userId)
        .is('read_at', null),
      supabase
        .from('connections')
        .select(`
          id,
          requester_id,
          addressee_id,
          requester:profiles!connections_requester_id_fkey(id, name, avatar_url),
          addressee:profiles!connections_addressee_id_fkey(id, name, avatar_url)
        `)
        .or('requester_id.eq.' + userId + ',addressee_id.eq.' + userId)
        .eq('status', 'accepted'),
    ])

    if (connRes.data) setConnections(connRes.data)

    if (acceptedRes.data) {
      const mapped = acceptedRes.data.map((c: any) => {
        const other = c.requester_id === userId ? c.addressee : c.requester
        return { ...c, otherProfile: other }
      })
      setAcceptedConnections(mapped)
    }

    if (unreadRes.data) {
      const counts: Record<string, number> = {}
      unreadRes.data.forEach((m: any) => {
        counts[m.thread_id] = (counts[m.thread_id] || 0) + 1
      })
      setUnreadCounts(counts)
    }

    if (msgRes.data) {
      const seen = new Set()
      const grouped = msgRes.data.filter((m: any) => {
        if (seen.has(m.thread_id)) return false
        seen.add(m.thread_id)
        return true
      })

      const otherIds = [...new Set(grouped.map((m: any) =>
        m.sender_id === userId ? m.recipient_id : m.sender_id
      ))]

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', otherIds)

      const profileMap: Record<string, any> = {}
      profileData?.forEach((p: any) => { profileMap[p.id] = p })

      const enriched = grouped.map((thread: any) => {
        const otherId = thread.sender_id === userId ? thread.recipient_id : thread.sender_id
        return { ...thread, otherProfile: profileMap[otherId] || null }
      })

      setThreads(enriched)
    }

    setLoading(false)
  }

  const handleAccept = async (connectionId: string) => {
    const conn = connections.find(c => c.id === connectionId)
    await supabase.from('connections').update({ status: 'accepted' }).eq('id', connectionId)
    setConnections(prev => prev.filter(c => c.id !== connectionId))
    if (conn) {
      setAcceptedConnections(prev => [...prev, { ...conn, status: 'accepted', otherProfile: conn.requester }])
    }
  }

  const handleDecline = async (connectionId: string) => {
    await supabase.from('connections').delete().eq('id', connectionId)
    setConnections(prev => prev.filter(c => c.id !== connectionId))
  }

  const markThreadRead = async (thread: any) => {
    if (!user) return
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('thread_id', thread.thread_id)
      .eq('recipient_id', user.id)
      .is('read_at', null)
    setUnreadCounts(prev => {
      const next = { ...prev }
      delete next[thread.thread_id]
      return next
    })
  }

  const toggleRead = async (thread: any) => {
    if (!user) return
    const isUnread = (unreadCounts[thread.thread_id] || 0) > 0

    if (isUnread) {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('thread_id', thread.thread_id)
        .eq('recipient_id', user.id)
        .is('read_at', null)
      setUnreadCounts(prev => { const next = { ...prev }; delete next[thread.thread_id]; return next })
    } else {
      await supabase
        .from('messages')
        .update({ read_at: null })
        .eq('thread_id', thread.thread_id)
        .eq('recipient_id', user.id)
      setUnreadCounts(prev => ({ ...prev, [thread.thread_id]: 1 }))
    }
  }

  const formatTime = (dt: string) => {
    const d = new Date(dt)
    const diff = Date.now() - d.getTime()
    if (diff < 3600000) return Math.max(1, Math.floor(diff / 60000)) + 'm'
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h'
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

  if (loading) return <MessagesPageSkeleton />

  return (
    <div className="min-h-screen bg-[#0D110D] pb-24">

      <div className="px-4 pt-14 pb-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-[#F0EDE6] text-xl" style={{ fontFamily: 'sans-serif' }}>Messages</h1>
          <div className="flex items-center gap-2">
            {totalUnread > 0 && (
              <span className="bg-[#E8B84B] text-[#0D110D] text-xs font-bold px-2.5 py-1 rounded-full">
                {totalUnread > 99 ? '99+' : totalUnread} unread
              </span>
            )}
            <button onClick={() => setShowCompose(true)}
              className="w-9 h-9 bg-[#1C241C] border border-white/10 rounded-xl flex items-center justify-center text-base">
              ✏️
            </button>
          </div>
        </div>
        <p className="text-xs text-white/40 mt-1">
          {threads.length > 0
            ? threads.length + ' conversation' + (threads.length > 1 ? 's' : '')
            : communityChats.length > 0 ? communityChats.length + ' community chat' + (communityChats.length > 1 ? 's' : '')
            : 'No messages yet'}
        </p>
      </div>

      {connections.length > 0 && (
        <div className="mx-4 mt-3 mb-1 bg-[#1E3A1E]/30 border border-[#7EC87E]/15 rounded-2xl p-3">
          <div className="text-xs font-medium text-[#7EC87E] mb-3">
            {connections.length} connection request{connections.length > 1 ? 's' : ''}
          </div>
          {connections.map(conn => (
            <div key={conn.id} className="flex items-center gap-3 mb-2 last:mb-0">
              {conn.requester?.avatar_url ? (
                <img src={conn.requester.avatar_url} alt="" className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 bg-[#2A4A2A] rounded-xl flex items-center justify-center text-base flex-shrink-0">🧑</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#F0EDE6]">{conn.requester?.name}</div>
                <div className="text-xs text-white/40">wants to connect</div>
              </div>
              <button onClick={() => handleAccept(conn.id)}
                className="bg-[#E8B84B] text-[#0D110D] text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform">
                Accept
              </button>
              <button onClick={() => handleDecline(conn.id)}
                className="bg-[#1C241C] border border-white/10 text-white/50 text-xs px-3 py-1.5 rounded-lg">
                Decline
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Connections quick-access bar */}
      {acceptedConnections.length > 0 && (
        <div className="px-4 pt-3 pb-1">
          <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium mb-2.5">
            Connections · {acceptedConnections.length}
          </div>
          <div className="flex gap-3.5 overflow-x-auto scrollbar-hide pb-1">
            {acceptedConnections.map(conn => {
              const threadId = [conn.requester_id, conn.addressee_id].sort().join('_')
              const hasUnread = (unreadCounts[threadId] || 0) > 0
              return (
                <button key={conn.id}
                  onClick={() => router.push('/messages/' + threadId)}
                  className="flex flex-col items-center gap-1 flex-shrink-0 active:scale-95 transition-transform">
                  <div className="relative">
                    {conn.otherProfile?.avatar_url ? (
                      <img src={conn.otherProfile.avatar_url} alt="" className="w-12 h-12 rounded-xl object-cover border border-white/10" />
                    ) : (
                      <div className="w-12 h-12 bg-[#1E3A1E] border border-white/10 rounded-xl flex items-center justify-center text-lg">
                        {conn.otherProfile?.name?.charAt(0) || '🧑'}
                      </div>
                    )}
                    {hasUnread && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#E8B84B] rounded-full border-2 border-[#0D110D]" />
                    )}
                  </div>
                  <div className="text-[9px] text-white/40 max-w-[48px] truncate text-center">
                    {conn.otherProfile?.name?.split(' ')[0] || '—'}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Community chats */}
      {communityChats.length > 0 && (
        <div className="mt-2">
          <div className="text-[9px] uppercase tracking-widest text-white/20 px-4 py-2 font-medium">Community Chats</div>
          <div className="divide-y divide-white/[0.05]">
            {communityChats.map(chat => (
              <button key={chat.communityId}
                onClick={() => router.push('/communities/' + chat.communityId + '?tab=chat')}
                className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-white/[0.02] transition-colors">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 border border-white/10"
                  style={{ background: chat.community?.banner_gradient || 'var(--gradient-community-banner)' }}>
                  {chat.community?.icon || '👥'}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-sm font-medium text-[#F0EDE6]/85">{chat.community?.name}</div>
                  <div className="text-xs text-white/35 truncate mt-0.5">
                    {chat.lastMessage
                      ? ((chat.lastMessage.profiles as any)?.name ? (chat.lastMessage.profiles as any).name + ': ' : '') + chat.lastMessage.text
                      : 'Tap to open chat'}
                  </div>
                </div>
                {chat.lastMessage && (
                  <div className="text-[10px] text-white/30 flex-shrink-0">{formatTime(chat.lastMessage.created_at)}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Direct messages */}
      {threads.length === 0 && communityChats.length === 0 ? (
        <div className="flex flex-col items-center pt-10 pb-20 px-4">
          <div className="text-4xl mb-3">💬</div>
          <p className="text-[#F0EDE6] opacity-50 text-sm text-center mb-1">No messages yet</p>
          {acceptedConnections.length === 0 ? (
            <p className="text-white/25 text-xs text-center max-w-[220px]">Connect with people at events and start a conversation</p>
          ) : (
            <>
              <p className="text-white/25 text-xs text-center mb-5">Say hi to one of your connections</p>
              <div className="w-full space-y-2">
                {acceptedConnections.slice(0, 5).map(conn => (
                  <button
                    key={conn.id}
                    onClick={() => router.push('/messages/' + [conn.requester_id, conn.addressee_id].sort().join('_'))}
                    className="w-full flex items-center gap-3 bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-3 active:scale-[0.98] transition-transform"
                  >
                    {conn.otherProfile?.avatar_url ? (
                      <img src={conn.otherProfile.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 bg-[#2A4A2A] rounded-xl flex items-center justify-center text-lg flex-shrink-0">🧑</div>
                    )}
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-[#F0EDE6]">{conn.otherProfile?.name}</div>
                      <div className="text-xs text-white/30">Tap to say hi</div>
                    </div>
                    <span className="text-white/20 text-lg">→</span>
                  </button>
                ))}
                {acceptedConnections.length > 5 && (
                  <button onClick={() => setShowCompose(true)}
                    className="w-full py-2.5 rounded-2xl bg-[#1C241C] border border-white/10 text-white/35 text-xs active:scale-[0.98] transition-transform">
                    +{acceptedConnections.length - 5} more — tap ✏️ to search
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      ) : threads.length > 0 ? (
        <div className="mt-2">
          {communityChats.length > 0 && (
            <div className="text-[9px] uppercase tracking-widest text-white/20 px-4 py-2 font-medium">Direct Messages</div>
          )}
          {totalUnread > 0 && communityChats.length === 0 && (
            <div className="text-[9px] uppercase tracking-widest text-white/20 px-4 py-2 font-medium">Unread</div>
          )}
          {threads
            .sort((a, b) => {
              const aUnread = (unreadCounts[a.thread_id] || 0) > 0 ? 1 : 0
              const bUnread = (unreadCounts[b.thread_id] || 0) > 0 ? 1 : 0
              return bUnread - aUnread
            })
            .map((thread, i, arr) => {
              const isUnread = (unreadCounts[thread.thread_id] || 0) > 0
              const count = unreadCounts[thread.thread_id] || 0
              const prevIsUnread = i > 0 && (unreadCounts[arr[i - 1]?.thread_id] || 0) > 0
              const showEarlierLabel = !isUnread && (i === 0 || prevIsUnread) && totalUnread > 0 && communityChats.length === 0
              return (
                <div key={thread.id}>
                  {showEarlierLabel && (
                    <div className="text-[9px] uppercase tracking-widest text-white/20 px-4 pt-3 pb-2 font-medium">Earlier</div>
                  )}
                  <SwipeThread
                    thread={thread}
                    isUnread={isUnread}
                    unreadCount={count}
                    onTap={async () => {
                      await markThreadRead(thread)
                      router.push('/messages/' + thread.thread_id)
                    }}
                    onToggleRead={() => toggleRead(thread)}
                    formatTime={formatTime}
                  />
                </div>
              )
            })}
        </div>
      ) : null}

      <BottomNav />

      {/* Compose overlay */}
      {showCompose && (
        <div className="fixed inset-0 bg-[#0D110D] z-50 flex flex-col">
          <div className="flex items-center gap-3 px-4 pt-14 pb-4 border-b border-white/10">
            <button onClick={() => { setShowCompose(false); setComposeSearch('') }}
              className="w-9 h-9 bg-[#1C241C] border border-white/10 rounded-xl flex items-center justify-center text-[#F0EDE6]">
              ✕
            </button>
            <h2 className="text-base font-bold text-[#F0EDE6]">New Message</h2>
          </div>
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center gap-2 bg-[#1C241C] border border-white/10 rounded-xl px-3 py-2.5">
              <span className="text-white/30 text-sm">🔍</span>
              <input
                autoFocus
                value={composeSearch}
                onChange={e => setComposeSearch(e.target.value)}
                placeholder="Search connections..."
                className="flex-1 bg-transparent text-sm text-[#F0EDE6] placeholder-white/30 outline-none"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {acceptedConnections.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-3xl mb-2">🤝</div>
                <p className="text-white/40 text-sm">No connections yet</p>
                <p className="text-white/25 text-xs mt-1">Connect with people at events first</p>
              </div>
            ) : (
              <div className="space-y-2 mt-1">
                {acceptedConnections
                  .filter(conn => !composeSearch || conn.otherProfile?.name?.toLowerCase().includes(composeSearch.toLowerCase()))
                  .map(conn => (
                    <button key={conn.id}
                      onClick={() => {
                        setShowCompose(false)
                        setComposeSearch('')
                        router.push('/messages/' + [conn.requester_id, conn.addressee_id].sort().join('_'))
                      }}
                      className="w-full flex items-center gap-3 bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-3 active:scale-[0.98] transition-transform">
                      {conn.otherProfile?.avatar_url ? (
                        <img src={conn.otherProfile.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 bg-[#2A4A2A] rounded-xl flex items-center justify-center text-lg flex-shrink-0">🧑</div>
                      )}
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-[#F0EDE6]">{conn.otherProfile?.name}</div>
                        <div className="text-xs text-white/30">Send a message</div>
                      </div>
                      <span className="text-white/20 text-lg">→</span>
                    </button>
                  ))}
                {composeSearch && acceptedConnections.filter(c => c.otherProfile?.name?.toLowerCase().includes(composeSearch.toLowerCase())).length === 0 && (
                  <p className="text-center text-white/30 text-xs py-8">No connections match "{composeSearch}"</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SwipeThread({ thread, isUnread, unreadCount, onTap, onToggleRead, formatTime }: {
  thread: any
  isUnread: boolean
  unreadCount: number
  onTap: () => void
  onToggleRead: () => void
  formatTime: (dt: string) => string
}) {
  const startX = useRef(0)
  const currentX = useRef(0)
  const rowRef = useRef<HTMLDivElement>(null)
  const [swiped, setSwiped] = useState(false)
  const [dragging, setDragging] = useState(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    currentX.current = 0
    setDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return
    const diff = e.touches[0].clientX - startX.current
    currentX.current = diff
    if (diff < 0 && rowRef.current) {
      const clamped = Math.max(diff, -90)
      rowRef.current.style.transform = 'translateX(' + clamped + 'px)'
      rowRef.current.style.transition = 'none'
    }
  }

  const handleTouchEnd = () => {
    setDragging(false)
    if (rowRef.current) {
      rowRef.current.style.transition = 'transform 0.25s ease-out'
      if (currentX.current < -50) {
        rowRef.current.style.transform = 'translateX(-80px)'
        setSwiped(true)
      } else {
        rowRef.current.style.transform = 'translateX(0)'
        setSwiped(false)
      }
    }
  }

  const handleAction = () => {
    if (rowRef.current) {
      rowRef.current.style.transition = 'transform 0.25s ease-out'
      rowRef.current.style.transform = 'translateX(0)'
    }
    setSwiped(false)
    onToggleRead()
  }

  const handleClick = () => {
    if (!swiped && Math.abs(currentX.current) < 10) {
      onTap()
    }
  }

  const badgeCount = unreadCount > 9 ? '9+' : String(unreadCount)

  return (
    <div className="relative overflow-hidden border-b border-white/[0.05]">
      <div className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center z-0">
        <button onClick={handleAction}
          className={'flex flex-col items-center gap-1 px-2 py-2 rounded-xl ' + (isUnread ? 'bg-[#1E3A1E]' : 'bg-[#E8B84B]/15')}>
          <span className="text-base">{isUnread ? '✓' : '●'}</span>
          <span className={'text-[9px] font-medium ' + (isUnread ? 'text-[#7EC87E]' : 'text-[#E8B84B]')}>
            {isUnread ? 'Read' : 'Unread'}
          </span>
        </button>
      </div>

      <div
        ref={rowRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
        className={'flex items-center gap-3 px-4 py-3.5 cursor-pointer relative z-10 transition-colors ' + (isUnread ? 'bg-white/[0.025]' : 'bg-[#0D110D]')}
      >
        {isUnread && <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-[3px] h-[3px] rounded-full bg-[#E8B84B]" />}

        <div className="relative flex-shrink-0">
          {thread.otherProfile?.avatar_url ? (
            <img src={thread.otherProfile.avatar_url} alt="" className="w-11 h-11 rounded-xl object-cover" />
          ) : (
            <div className="w-11 h-11 bg-[#1E3A1E] rounded-xl flex items-center justify-center text-lg border border-white/10">
              {thread.otherProfile?.name?.charAt(0) || '🧑'}
            </div>
          )}
          {isUnread && (
            <div className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-[#E8B84B] rounded-full flex items-center justify-center px-1">
              <span className="text-[8px] font-bold text-[#0D110D]">{badgeCount}</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <div className={'text-sm ' + (isUnread ? 'font-bold text-[#F0EDE6]' : 'font-medium text-[#F0EDE6]/80')}>
              {thread.otherProfile?.name || 'Unknown'}
            </div>
            <div className={'text-[10px] ' + (isUnread ? 'text-[#E8B84B]' : 'text-white/30')}>
              {formatTime(thread.sent_at)}
            </div>
          </div>
          <div className={'text-xs truncate ' + (isUnread ? 'text-[#F0EDE6]/70 font-medium' : 'text-white/35')}>
            {thread.sender_id === thread.otherProfile?.id ? '' : 'You: '}{thread.text}
          </div>
        </div>
      </div>
    </div>
  )
}
