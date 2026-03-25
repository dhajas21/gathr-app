'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'

export default function MessagesPage() {
  const [user, setUser] = useState<any>(null)
  const [threads, setThreads] = useState<any[]>([])
  const [connections, setConnections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUser(session.user)
      fetchData(session.user.id)
    })
  }, [])

  const fetchData = async (userId: string) => {
    // Fetch pending connection requests
    const { data: connData } = await supabase
      .from('connections')
      .select('*, requester:profiles!connections_requester_id_fkey(id, name)')
      .eq('addressee_id', userId)
      .eq('status', 'pending')
    if (connData) setConnections(connData)

    // Fetch all messages for this user
    const { data: msgData } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('sent_at', { ascending: false })

    if (msgData) {
      // Group by thread_id, keep only latest per thread
      const seen = new Set()
      const grouped = msgData.filter(m => {
        if (seen.has(m.thread_id)) return false
        seen.add(m.thread_id)
        return true
      })

      // Fetch other user's profile for each thread
      const enriched = await Promise.all(grouped.map(async (thread) => {
        const otherId = thread.sender_id === userId ? thread.recipient_id : thread.sender_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, name')
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

  const toggleRead = async (thread: any) => {
    if (!user) return
    const isUnread = !thread.read_at && thread.recipient_id === user.id

    if (isUnread) {
      // Mark all messages in this thread as read
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('thread_id', thread.thread_id)
        .eq('recipient_id', user.id)
        .is('read_at', null)
    } else {
      // Mark latest message in this thread as unread
      await supabase
        .from('messages')
        .update({ read_at: null })
        .eq('thread_id', thread.thread_id)
        .eq('recipient_id', user.id)
    }

    // Refresh
    fetchData(user.id)
  }

  const formatTime = (dt: string) => {
    const d = new Date(dt)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))}m`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0D110D] flex items-center justify-center">
      <div className="text-[#E8B84B] text-2xl font-bold">Gathr.</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0D110D] pb-24">

      {/* Header */}
      <div className="px-4 pt-14 pb-3">
        <h1 className="font-bold text-[#F0EDE6] text-xl" style={{ fontFamily: 'sans-serif' }}>Messages</h1>
        <p className="text-xs text-white/40 mt-1">
          {threads.length > 0 ? `${threads.length} conversation${threads.length > 1 ? 's' : ''}` : 'No messages yet'}
        </p>
      </div>

      {/* Connection requests */}
      {connections.length > 0 && (
        <div className="mx-4 mb-3 bg-[#1E3A1E]/30 border border-[#7EC87E]/15 rounded-2xl p-3">
          <div className="text-xs font-medium text-[#7EC87E] mb-3">
            {connections.length} connection request{connections.length > 1 ? 's' : ''}
          </div>
          {connections.map(conn => (
            <div key={conn.id} className="flex items-center gap-3 mb-2 last:mb-0">
              <div className="w-9 h-9 bg-[#2A4A2A] rounded-xl flex items-center justify-center text-base flex-shrink-0">🧑</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#F0EDE6]">{conn.requester?.name}</div>
                <div className="text-xs text-white/40">wants to connect</div>
              </div>
              <button onClick={() => handleAccept(conn.id)}
                className="bg-[#E8B84B] text-[#0D110D] text-xs font-bold px-3 py-1.5 rounded-lg">
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

      {/* Threads */}
      {threads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 px-4">
          <div className="text-4xl">💬</div>
          <p className="text-[#F0EDE6] opacity-50 text-sm text-center">No messages yet — connect with people at events!</p>
        </div>
      ) : (
        <div>
          <div className="text-[9px] uppercase tracking-widest text-white/20 px-4 py-2 font-medium">Recent</div>
          {threads.map(thread => {
            const isUnread = !thread.read_at && thread.recipient_id === user?.id
            return (
              <SwipeThread
                key={thread.id}
                thread={thread}
                isUnread={isUnread}
                onTap={() => router.push(`/messages/${thread.thread_id}`)}
                onToggleRead={() => toggleRead(thread)}
                formatTime={formatTime}
              />
            )
          })}
        </div>
      )}

      <BottomNav />
    </div>
  )
}

// Swipeable thread row component
function SwipeThread({ thread, isUnread, onTap, onToggleRead, formatTime }: {
  thread: any
  isUnread: boolean
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
    // Only allow swiping left
    if (diff < 0 && rowRef.current) {
      const clamped = Math.max(diff, -90)
      rowRef.current.style.transform = `translateX(${clamped}px)`
      rowRef.current.style.transition = 'none'
    }
  }

  const handleTouchEnd = () => {
    setDragging(false)
    if (rowRef.current) {
      rowRef.current.style.transition = 'transform 0.25s ease-out'
      if (currentX.current < -50) {
        // Reveal action
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
    // Only navigate if not swiped
    if (!swiped && Math.abs(currentX.current) < 10) {
      onTap()
    }
  }

  return (
    <div className="relative overflow-hidden">
      {/* Action behind the row */}
      <div className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center z-0">
        <button onClick={handleAction}
          className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl ${
            isUnread ? 'bg-[#1E3A1E]' : 'bg-[#E8B84B]/15'
          }`}>
          <span className="text-base">{isUnread ? '✓' : '●'}</span>
          <span className={`text-[9px] font-medium ${isUnread ? 'text-[#7EC87E]' : 'text-[#E8B84B]'}`}>
            {isUnread ? 'Read' : 'Unread'}
          </span>
        </button>
      </div>

      {/* Swipeable row */}
      <div
        ref={rowRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
        className={`flex items-start gap-3 px-4 py-3 cursor-pointer relative bg-[#0D110D] z-10 ${isUnread ? 'bg-white/[0.02]' : ''}`}
      >
        {isUnread && <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-[#E8B84B]"></div>}
        <div className="w-10 h-10 bg-[#1E3A1E] rounded-xl flex items-center justify-center text-base flex-shrink-0">
          {thread.otherProfile?.name?.charAt(0) || '🧑'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <div className="text-sm font-semibold text-[#F0EDE6]">{thread.otherProfile?.name || 'Unknown'}</div>
            <div className="text-[10px] text-white/30">{formatTime(thread.sent_at)}</div>
          </div>
          <div className={`text-xs truncate ${isUnread ? 'text-[#F0EDE6] font-medium' : 'text-white/45'}`}>
            {thread.text}
          </div>
        </div>
        {isUnread && (
          <div className="w-4 h-4 bg-[#E8B84B] rounded-full flex items-center justify-center text-[8px] font-bold text-[#0D110D] flex-shrink-0 mt-1">1</div>
        )}
      </div>
    </div>
  )
}