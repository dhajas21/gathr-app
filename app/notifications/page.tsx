'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { NotificationsPageSkeleton } from '@/components/Skeleton'
import { optimizedImgSrc } from '@/lib/utils'
import PageTransition from '@/components/PageTransition'

export default function NotificationsPage() {
  const [user, setUser] = useState<any>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [actorProfiles, setActorProfiles] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const fetchedActorIds = useRef<Set<string>>(new Set())
  const PAGE_SIZE = 30
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

  const hydrateActors = async (rows: any[]) => {
    const newActorIds = [...new Set(rows.map((n: any) => n.actor_id).filter(Boolean))]
      .filter(id => !fetchedActorIds.current.has(id as string)) as string[]
    if (newActorIds.length === 0) return
    newActorIds.forEach(id => fetchedActorIds.current.add(id))
    const { data: profiles } = await supabase
      .from('profiles').select('id, name, avatar_url').in('id', newActorIds)
    if (profiles) {
      setActorProfiles(prev => {
        const next = { ...prev }
        profiles.forEach(p => { next[p.id] = p })
        return next
      })
    }
  }

  const hydrateConnectionStatuses = async (notifs: any[], userId: string): Promise<any[]> => {
    const connReqs = notifs.filter(n => n.type === 'connection_request')
    if (connReqs.length === 0) return notifs
    const actorIds = [...new Set(connReqs.map(n => n.actor_id).filter(Boolean))] as string[]
    if (actorIds.length === 0) return notifs
    const { data: conns, error } = await supabase
      .from('connections')
      .select('requester_id, status')
      .in('requester_id', actorIds)
      .eq('addressee_id', userId)
    // If query failed, default to showing buttons — don't hide them on error
    if (error || !conns) return notifs
    const statusMap: Record<string, string> = {}
    conns.forEach(c => { statusMap[c.requester_id] = c.status })
    return notifs.map(n => {
      if (n.type !== 'connection_request' || !n.actor_id) return n
      const status = statusMap[n.actor_id]
      if (status === 'accepted') return { ...n, _accepted: true }
      if (!status) return { ...n, _resolved: true } // requester withdrew
      return n // 'pending' → show buttons
    })
  }

  const fetchNotifications = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)
      if (data) {
        const enriched = await hydrateConnectionStatuses(data, userId)
        setNotifications(enriched)
        setHasMore(data.length === PAGE_SIZE)
        await hydrateActors(enriched)
      }
    } finally {
      setLoading(false)
    }
  }

  const loadMore = async () => {
    if (!user || loadingMore || notifications.length === 0) return
    setLoadingMore(true)
    const oldestCreatedAt = notifications[notifications.length - 1].created_at
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .lt('created_at', oldestCreatedAt)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)
    if (data) {
      const enriched = await hydrateConnectionStatuses(data, user.id)
      setNotifications(prev => [...prev, ...enriched])
      setHasMore(data.length === PAGE_SIZE)
      await hydrateActors(enriched)
    }
    setLoadingMore(false)
  }

  const fetchActorProfile = async (actorId: string) => {
    if (!actorId || fetchedActorIds.current.has(actorId)) return
    fetchedActorIds.current.add(actorId)
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

  const markUnread = async (notifId: string) => {
    await supabase.from('notifications').update({ read: false }).eq('id', notifId)
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: false } : n))
  }

  const toggleRead = async (e: React.MouseEvent, notif: any) => {
    e.stopPropagation()
    if (notif.read) await markUnread(notif.id)
    else await markRead(notif.id)
  }

  const handleTap = async (notif: any) => {
    if (!notif.read) await markRead(notif.id)
    if (notif.link?.startsWith('/')) router.push(notif.link)
  }

  const handleAcceptConnection = async (notif: any) => {
    if (!user || actionLoading) return
    setActionLoading(notif.id)
    setActionError(null)
    const { data, error } = await supabase
      .from('connections')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('requester_id', notif.actor_id)
      .eq('addressee_id', user.id)
      .eq('status', 'pending')
      .select()
    if (error) {
      setActionError('Something went wrong. Please try again.')
    } else if (!data || data.length === 0) {
      // 0 rows updated — request may have been withdrawn or already accepted
      setActionError('This request is no longer pending.')
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, _resolved: true } : n))
    } else {
      await markRead(notif.id)
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true, _accepted: true } : n))
    }
    setActionLoading(null)
  }

  const handleDeclineConnection = async (notif: any) => {
    if (!user || actionLoading) return
    setActionLoading(notif.id + '_decline')
    setActionError(null)
    const { data, error } = await supabase
      .from('connections')
      .delete()
      .eq('requester_id', notif.actor_id)
      .eq('addressee_id', user.id)
      .eq('status', 'pending')
      .select()
    if (error) {
      setActionError('Something went wrong. Please try again.')
    } else if (!data || data.length === 0) {
      setActionError('This request is no longer pending.')
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, _resolved: true } : n))
    } else {
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

  const getTypeIconSvg = (type: string): React.ReactNode => {
    const s = { width: 11, height: 11, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
    switch (type) {
      case 'connection_request':
        return <svg {...s} stroke="#E8B84B"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
      case 'connection_accepted':
        return <svg {...s} stroke="#7EC87E"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
      case 'after_event_match':
        return <svg {...s} stroke="#E8B84B"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      case 'rsvp':
        return <svg {...s} stroke="#7EC87E"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      case 'event_comment':
        return <svg {...s} stroke="#7EC87E"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      case 'message':
        return <svg {...s} stroke="#7EC87E"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
      case 'event_reminder':
        return <svg {...s} stroke="#E8B84B"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      default:
        return <svg {...s} stroke="#E8B84B"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
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
    const resolved = notif._resolved
    const isLoading = actionLoading === notif.id || actionLoading === notif.id + '_decline'

    return (
      <div key={notif.id}
        onClick={() => (!isConnReq || accepted) && handleTap(notif)}
        className={'flex items-start gap-3 px-4 py-3.5 relative transition-colors ' + (!notif.read ? 'bg-white/[0.025]' : '') + (!isConnReq || accepted ? ' cursor-pointer active:bg-white/[0.03]' : '')}>
        {/* Read/unread toggle — tap to flip state */}
        <button
          onClick={e => toggleRead(e, notif)}
          title={notif.read ? 'Mark as unread' : 'Mark as read'}
          className="absolute left-0 top-3.5 w-5 h-6 flex items-center justify-center flex-shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full transition-colors ${notif.read ? 'bg-white/10' : 'bg-[#E8B84B]'}`} />
        </button>

        {/* Avatar */}
        <div className="flex-shrink-0 relative">
          {optimizedImgSrc(actor?.avatar_url, 96) ? (
            <img src={optimizedImgSrc(actor.avatar_url, 96)!} alt="" className="w-10 h-10 rounded-xl object-cover border border-white/10"  loading="lazy" />
          ) : (
            <div className="w-10 h-10 bg-[#1E2E1E] rounded-xl flex items-center justify-center text-lg border border-white/10">
              {actor?.name?.charAt(0) || '?'}
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#1C241C] border border-[#0D110D] flex items-center justify-center text-[10px]">
            {getTypeIconSvg(notif.type)}
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
          {isConnReq && !accepted && !declined && !resolved && (
            <div className="mt-2.5">
              <div className="flex gap-2">
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
                  className="text-[10px] text-white/35 px-2 py-1.5">
                  View profile
                </button>
              </div>
              {actionError && actionLoading === null && (
                <p className="text-[10px] text-[#E85B5B] mt-1.5">{actionError}</p>
              )}
            </div>
          )}

          {/* Connection accepted state */}
          {isConnReq && accepted && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-[#7EC87E] font-medium">✓ Connected</span>
              <span className="text-[10px] text-[#E8B84B]/60">· Tap to view profile</span>
            </div>
          )}
          {isConnReq && declined && (
            <div className="mt-2 text-xs text-white/35">Request declined</div>
          )}
          {isConnReq && resolved && (
            <div className="mt-2 text-xs text-white/25">Request no longer pending</div>
          )}

          {/* Event / message quick action */}
          {(notif.type === 'rsvp' || notif.type === 'event_comment' || notif.type === 'event_reminder') && notif.link?.startsWith('/') && (
            <button onClick={e => { e.stopPropagation(); router.push(notif.link) }}
              className="mt-2 text-[10px] text-[#E8B84B] bg-[#E8B84B]/10 border border-[#E8B84B]/20 px-2.5 py-1 rounded-lg">
              View event →
            </button>
          )}
          {notif.type === 'message' && notif.link?.startsWith('/') && (
            <button onClick={e => { e.stopPropagation(); router.push(notif.link) }}
              className="mt-2 text-[10px] text-[#7EC87E] bg-[#7EC87E]/10 border border-[#7EC87E]/20 px-2.5 py-1 rounded-lg">
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
    <PageTransition>
    <div className="min-h-screen bg-[#0D110D] pb-24">
      <div className="flex items-center gap-3 px-4 pt-14 pb-3 border-b border-white/10">
        <button onClick={() => router.back()}
          className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-[#F0EDE6] active:scale-95 transition-transform flex-shrink-0">
          ←
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-[#F0EDE6] text-xl font-display">Activity</h1>
          {unreadCount > 0 && <p className="text-xs text-white/40 mt-0.5">{unreadCount} new</p>}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-xs text-[#E8B84B]">Mark all read</button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 px-4">
          <div className="w-14 h-14 rounded-2xl bg-[#1C241C] border border-white/10 flex items-center justify-center mb-1">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(126,200,126,0.45)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <p className="text-white/40 text-sm text-center">No activity yet</p>
          <p className="text-white/25 text-xs text-center max-w-[240px]">RSVPs, connection requests, comments, and messages will show up here.</p>
        </div>
      ) : (
        <div>
          {renderSection('Today', today)}
          {renderSection('This week', thisWeek)}
          {renderSection('Earlier', earlier)}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-3 mt-2 mb-4 text-xs text-white/40 font-medium active:text-white/60 transition-colors disabled:opacity-40">
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>
      )}

      <BottomNav />
    </div>
    </PageTransition>
  )
}