'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { NotificationsPageSkeleton } from '@/components/Skeleton'
import { safeImgSrc } from '@/lib/utils'

export default function NotificationsPage() {
  const [user, setUser] = useState<any>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [actorProfiles, setActorProfiles] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | undefined
    let cancelled = false

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      if (!session) { router.push('/auth'); return }
      setUser(session.user)
      fetchNotifications(session.user.id)

      channel = supabase
        .channel('notifications-' + session.user.id)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'notifications',
          filter: 'user_id=eq.' + session.user.id,
        }, (payload) => {
          setNotifications(prev => [payload.new as any, ...prev])
          fetchActorProfile((payload.new as any).actor_id)
        })
        .subscribe()
    })

    return () => { cancelled = true; if (channel) supabase.removeChannel(channel) }
  }, [router])

  const fetchNotifications = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (data) {
        setNotifications(data)
        const actorIds = [...new Set(data.map((n: any) => n.actor_id).filter(Boolean))]
        if (actorIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, name, avatar_url')
            .in('id', actorIds)
          if (profiles) {
            const map: Record<string, any> = {}
            profiles.forEach(p => { map[p.id] = p })
            setActorProfiles(map)
          }
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchActorProfile = async (actorId: string) => {
    if (!actorId || actorProfiles[actorId]) return
    const { data } = await supabase.from('profiles').select('id, name, avatar_url').eq('id', actorId).single()
    if (data) setActorProfiles(prev => ({ ...prev, [data.id]: data }))
  }

  const markAllRead = async () => {
    if (!user) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const markRead = async (notifId: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', notifId)
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n))
  }

  const handleTap = async (notif: any) => {
    if (!notif.read) await markRead(notif.id)
    if (notif.link?.startsWith('/')) router.push(notif.link)
  }

  const handleAcceptConnection = async (notif: any) => {
    if (!user || actionLoading) return
    setActionLoading(notif.id)
    const { error } = await supabase
      .from('connections')
      .update({ status: 'accepted' })
      .eq('requester_id', notif.actor_id)
      .eq('addressee_id', user.id)
    if (!error) {
      await markRead(notif.id)
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true, _accepted: true } : n))
    }
    setActionLoading(null)
  }

  const handleDeclineConnection = async (notif: any) => {
    if (!user || actionLoading) return
    setActionLoading(notif.id + '_decline')
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('requester_id', notif.actor_id)
      .eq('addressee_id', user.id)
    if (!error) {
      await markRead(notif.id)
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true, _declined: true } : n))
    }
    setActionLoading(null)
  }

  const formatTime = (dt: string) => {
    const diff = Date.now() - new Date(dt).getTime()
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago'
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago'
    if (diff < 172800000) return 'Yesterday'
    return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'connection_request': return '👋'
      case 'connection_accepted': return '🤝'
      case 'after_event_match': return '✨'
      case 'rsvp': return '📅'
      case 'event_comment': return '💬'
      case 'message': return '✉️'
      case 'event_reminder': return '⏰'
      default: return '🔔'
    }
  }

  const groupByTime = (notifs: any[]) => {
    const today: any[] = [], thisWeek: any[] = [], earlier: any[] = []
    const now = Date.now()
    notifs.forEach(n => {
      const diff = now - new Date(n.created_at).getTime()
      if (diff < 86400000) today.push(n)
      else if (diff < 604800000) thisWeek.push(n)
      else earlier.push(n)
    })
    return { today, thisWeek, earlier }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  if (loading) return <NotificationsPageSkeleton />

  const { today, thisWeek, earlier } = groupByTime(notifications)

  const renderNotif = (notif: any) => {
    const actor = actorProfiles[notif.actor_id]
    const isConnReq = notif.type === 'connection_request'
    const accepted = notif._accepted
    const declined = notif._declined
    const isLoading = actionLoading === notif.id || actionLoading === notif.id + '_decline'

    return (
      <div key={notif.id}
        onClick={() => !isConnReq && handleTap(notif)}
        className={'flex items-start gap-3 px-4 py-3.5 relative transition-colors ' + (!notif.read ? 'bg-white/[0.025]' : '') + (!isConnReq ? ' cursor-pointer active:bg-white/[0.03]' : '')}>
        {!notif.read && (
          <div className="absolute left-1.5 top-5 w-[3px] h-[3px] rounded-full bg-[#E8B84B]" />
        )}

        {/* Avatar */}
        <div className="flex-shrink-0 relative">
          {safeImgSrc(actor?.avatar_url) ? (
            <img src={safeImgSrc(actor.avatar_url)!} alt="" className="w-10 h-10 rounded-xl object-cover border border-white/10" />
          ) : (
            <div className="w-10 h-10 bg-[#1E2E1E] rounded-xl flex items-center justify-center text-lg border border-white/10">
              {actor?.name?.charAt(0) || getTypeIcon(notif.type)}
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#1C241C] border border-[#0D110D] flex items-center justify-center text-[10px]">
            {getTypeIcon(notif.type)}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-[#F0EDE6] leading-snug">
            {actor?.name && <span className="font-semibold">{actor.name} </span>}
            <span className="text-white/70">{notif.title?.replace(actor?.name || '', '').trim() || notif.title}</span>
          </div>
          {notif.body && (
            <div className="text-xs text-white/40 mt-0.5 leading-relaxed">{notif.body}</div>
          )}
          <div className="text-[10px] text-white/25 mt-1">{formatTime(notif.created_at)}</div>

          {/* Connection request actions */}
          {isConnReq && !accepted && !declined && (
            <div className="flex gap-2 mt-2.5">
              <button
                onClick={e => { e.stopPropagation(); handleAcceptConnection(notif) }}
                disabled={!!isLoading}
                className="bg-[#E8B84B] text-[#0D110D] text-xs font-bold px-4 py-1.5 rounded-xl active:scale-95 transition-transform disabled:opacity-50">
                {actionLoading === notif.id ? 'Accepting...' : 'Accept'}
              </button>
              <button
                onClick={e => { e.stopPropagation(); handleDeclineConnection(notif) }}
                disabled={!!isLoading}
                className="bg-[#1C241C] border border-white/10 text-white/50 text-xs px-4 py-1.5 rounded-xl active:scale-95 transition-transform disabled:opacity-50">
                {actionLoading === notif.id + '_decline' ? '...' : 'Decline'}
              </button>
              <button
                onClick={e => { e.stopPropagation(); router.push('/profile/' + notif.actor_id) }}
                className="text-[10px] text-white/30 px-2 py-1.5">
                View profile
              </button>
            </div>
          )}

          {/* Connection accepted state */}
          {isConnReq && accepted && (
            <div className="mt-2 text-xs text-[#7EC87E] font-medium">✓ Connected</div>
          )}
          {isConnReq && declined && (
            <div className="mt-2 text-xs text-white/30">Request declined</div>
          )}

          {/* Event / message quick action */}
          {(notif.type === 'rsvp' || notif.type === 'event_comment' || notif.type === 'event_reminder') && notif.link?.startsWith('/') && (
            <button onClick={e => { e.stopPropagation(); router.push(notif.link) }}
              className="mt-2 text-[10px] text-[#E8B84B] bg-[#E8B84B]/10 border border-[#E8B84B]/15 px-2.5 py-1 rounded-lg">
              View event →
            </button>
          )}
          {notif.type === 'message' && notif.link?.startsWith('/') && (
            <button onClick={e => { e.stopPropagation(); router.push(notif.link) }}
              className="mt-2 text-[10px] text-[#7EC87E] bg-[#7EC87E]/10 border border-[#7EC87E]/15 px-2.5 py-1 rounded-lg">
              Reply →
            </button>
          )}
        </div>
      </div>
    )
  }

  const renderSection = (label: string, items: any[]) => items.length === 0 ? null : (
    <>
      <div className="text-[9px] uppercase tracking-widest text-white/20 px-4 pt-3 pb-1.5 font-medium">{label}</div>
      <div className="divide-y divide-white/[0.06]">
        {items.map(renderNotif)}
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-[#0D110D] pb-24">
      <div className="flex items-center justify-between px-4 pt-14 pb-3 border-b border-white/10">
        <div>
          <h1 className="font-bold text-[#F0EDE6] text-xl font-display">Activity</h1>
          {unreadCount > 0 && <p className="text-xs text-white/40 mt-0.5">{unreadCount} new</p>}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-xs text-[#E8B84B]">Mark all read</button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 px-4">
          <div className="text-4xl">🔔</div>
          <p className="text-white/40 text-sm text-center">No activity yet</p>
          <p className="text-white/25 text-xs text-center max-w-[240px]">RSVPs, connection requests, comments, and messages will show up here.</p>
        </div>
      ) : (
        <div>
          {renderSection('Today', today)}
          {renderSection('This week', thisWeek)}
          {renderSection('Earlier', earlier)}
        </div>
      )}

      <BottomNav />
    </div>
  )
}