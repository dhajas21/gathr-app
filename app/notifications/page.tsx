'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'

export default function NotificationsPage() {
  const [user, setUser] = useState<any>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUser(session.user)
      fetchNotifications(session.user.id)
    })
  }, [])

  const fetchNotifications = async (userId: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setNotifications(data)
    setLoading(false)
  }

  const markAllRead = async () => {
    if (!user) return
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const handleTap = async (notif: any) => {
    // Mark as read
    if (!notif.read) {
      await supabase.from('notifications').update({ read: true }).eq('id', notif.id)
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))
    }
    // Navigate if there's a link
    if (notif.link) router.push(notif.link)
  }

  const formatTime = (dt: string) => {
    const d = new Date(dt)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return Math.floor(diff / 60000) + ' min ago'
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' hours ago'
    if (diff < 172800000) return 'Yesterday'
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const groupByTime = (notifs: any[]) => {
    const today: any[] = []
    const thisWeek: any[] = []
    const earlier: any[] = []
    const now = new Date()

    notifs.forEach(n => {
      const diff = now.getTime() - new Date(n.created_at).getTime()
      if (diff < 86400000) today.push(n)
      else if (diff < 604800000) thisWeek.push(n)
      else earlier.push(n)
    })

    return { today, thisWeek, earlier }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'connection_request': return '👋'
      case 'connection_accepted': return '🤝'
      case 'rsvp': return '📅'
      case 'event_reminder': return '⏰'
      case 'community_event': return '👥'
      case 'message': return '💬'
      case 'achievement': return '🏆'
      default: return '🔔'
    }
  }

  const getTypeBadgeBg = (type: string) => {
    switch (type) {
      case 'connection_request': return '#2A4A2A'
      case 'connection_accepted': return '#2A4A2A'
      case 'rsvp': return '#1E3A1E'
      case 'event_reminder': return '#E8B84B'
      case 'community_event': return '#2A4A2A'
      case 'message': return '#1A2A1A'
      case 'achievement': return '#E8B84B'
      default: return '#1C241C'
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  if (loading) return (
    <div className="min-h-screen bg-[#0D110D] flex items-center justify-center">
      <div className="text-[#E8B84B] text-2xl font-bold">Gathr.</div>
    </div>
  )

  const { today, thisWeek, earlier } = groupByTime(notifications)

  const renderNotif = (notif: any) => (
    <div key={notif.id} onClick={() => handleTap(notif)}
      className={'flex items-start gap-3 px-4 py-3 relative cursor-pointer active:bg-white/[0.02] transition-colors ' + (!notif.read ? 'bg-white/[0.02]' : '')}>
      {!notif.read && <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-[3px] h-[3px] rounded-full bg-[#E8B84B]"></div>}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 relative"
        style={{ background: '#1E2E1E' }}>
        {notif.icon || getTypeIcon(notif.type)}
        <div className="absolute -bottom-0.5 -right-0.5 w-[14px] h-[14px] rounded-full flex items-center justify-center text-[7px] border-[1.5px] border-[#0D110D]"
          style={{ background: getTypeBadgeBg(notif.type), color: notif.type === 'event_reminder' || notif.type === 'achievement' ? '#0D110D' : '#7EC87E' }}>
          {notif.type === 'connection_request' ? '👋' : notif.type === 'rsvp' ? '📅' : notif.type === 'community_event' ? '👥' : notif.type === 'message' ? '💬' : notif.type === 'achievement' ? '★' : '!'}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-[#F0EDE6] leading-snug">{notif.title}</div>
        {notif.body && <div className="text-xs text-white/40 mt-0.5 leading-relaxed">{notif.body}</div>}
        <div className="text-[10px] text-white/25 mt-1">{formatTime(notif.created_at)}</div>

        {/* Action buttons for connection requests */}
        {notif.type === 'connection_request' && !notif.read && (
          <div className="flex gap-2 mt-2">
            <button onClick={e => { e.stopPropagation(); handleAcceptConnection(notif) }}
              className="bg-[#E8B84B] text-[#0D110D] text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform">
              Accept
            </button>
            <button onClick={e => { e.stopPropagation(); handleDeclineConnection(notif) }}
              className="bg-[#1C241C] border border-white/10 text-white/50 text-xs px-3 py-1.5 rounded-lg active:scale-95 transition-transform">
              Decline
            </button>
          </div>
        )}

        {/* View button for events */}
        {(notif.type === 'rsvp' || notif.type === 'event_reminder' || notif.type === 'community_event') && notif.link && (
          <div className="flex gap-2 mt-2">
            <button onClick={e => { e.stopPropagation(); router.push(notif.link) }}
              className="bg-[#1C241C] border border-white/10 text-white/50 text-xs px-3 py-1.5 rounded-lg">
              View event
            </button>
          </div>
        )}
      </div>
    </div>
  )

  const handleAcceptConnection = async (notif: any) => {
    // Mark notification as read
    await supabase.from('notifications').update({ read: true }).eq('id', notif.id)
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))
  }

  const handleDeclineConnection = async (notif: any) => {
    await supabase.from('notifications').update({ read: true }).eq('id', notif.id)
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))
  }

  return (
    <div className="min-h-screen bg-[#0D110D] pb-24">

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-14 pb-3">
        <div>
          <h1 className="font-bold text-[#F0EDE6] text-xl" style={{ fontFamily: 'sans-serif' }}>Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-xs text-white/40 mt-0.5">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-xs text-[#E8B84B]">Mark all read</button>
        )}
      </div>

      {/* Notifications list */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 px-4">
          <div className="text-4xl">🔔</div>
          <p className="text-white/40 text-sm text-center">No notifications yet</p>
          <p className="text-white/25 text-xs text-center max-w-[240px]">When someone RSVPs to your event, sends a connection request, or something happens — you'll see it here.</p>
        </div>
      ) : (
        <div>
          {today.length > 0 && (
            <>
              <div className="text-[9px] uppercase tracking-widest text-white/20 px-4 py-2 font-medium">Today</div>
              {today.map(renderNotif)}
              <div className="h-px bg-white/10 mx-4"></div>
            </>
          )}
          {thisWeek.length > 0 && (
            <>
              <div className="text-[9px] uppercase tracking-widest text-white/20 px-4 py-2 font-medium">This week</div>
              {thisWeek.map(renderNotif)}
              <div className="h-px bg-white/10 mx-4"></div>
            </>
          )}
          {earlier.length > 0 && (
            <>
              <div className="text-[9px] uppercase tracking-widest text-white/20 px-4 py-2 font-medium">Earlier</div>
              {earlier.map(renderNotif)}
            </>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  )
}