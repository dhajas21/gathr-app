'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'

export default function MessagesPage() {
  const [user, setUser] = useState<any>(null)
  const [threads, setThreads] = useState<any[]>([])
  const [connections, setConnections] = useState<any[]>([])
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let userId: string
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      userId = session.user.id
      setUser(session.user)
      fetchData(session.user.id)
    })

    const channel = supabase
      .channel('messages-list-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as any
        if (userId && (msg.sender_id === userId || msg.recipient_id === userId)) {
          fetchData(userId)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchData = async (userId: string) => {
    const [connRes, msgRes, unreadRes] = await Promise.all([
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
    ])

    if (connRes.data) setConnections(connRes.data)

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

      const enriched = await Promise.all(grouped.map(async (thread: any) => {
        const otherId = thread.sender_id === userId ? thread.recipient_id : thread.sender_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .eq('id', otherId)
          .single()
        return { ...thread, otherProfile: profile }
      }))

      setThreads(enriched)
    }

    setLoading(false)
  }

  const handleAccept = async (connectionId: string) => {
    await supabase.from('connections').update({ status: 'accepted' }).eq('id', connectionId)
    setConnections(prev => prev.filter(c => c.id !== connectionId))
  }

  const handleDecline = async (connectionId: string) => {
    await supabase.from('connections').update({ status: 'declined' }).eq('id', connectionId)
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

  if (loading) return (
    <div className="min-h-screen bg-[#0D110D] flex items-center justify-center">
      <div className="text-[#E8B84B] text-2xl font-bold">Gathr.</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0D110D] pb-24">

      <div className="px-4 pt-14 pb-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-[#F0EDE6] text-xl" style={{ fontFamily: 'sans-serif' }}>Messages</h1>
          {totalUnread > 0 && (
            <span className="bg-[#E8B84B] text-[#0D110D] text-xs font-bold px-2.5 py-1 rounded-full">
              {totalUnread > 99 ? '99+' : totalUnread} unread
            </span>
          )}
        </div>
        <p className="text-xs text-white/40 mt-1">
          {threads.length > 0
            ? threads.length + ' conversation' + (threads.length > 1 ? 's' : '')
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

      {threads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 px-4">
          <div className="text-4xl">💬</div>
          <p className="text-[#F0EDE6] opacity-50 text-sm text-center">No messages yet</p>
          <p className="text-white/25 text-xs text-center max-w-[220px]">Connect with people at events and start a conversation</p>
        </div>
      ) : (
        <div className="mt-2">
          {totalUnread > 0 && (
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
              const showEarlierLabel = !isUnread && (i === 0 || prevIsUnread) && totalUnread > 0
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
      )}

      <BottomNav />
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