'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, connectionPairOr } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { EventDetailSkeleton } from '@/components/Skeleton'
import MysteryMatchCard from '@/components/MysteryMatchCard'
import { optimizedImgSrc, formatDateVerbose, formatTime, isValidUUID, tzAbbreviation } from '@/lib/utils'
import { cityToTimezone } from '@/lib/constants'
import { track } from '@/components/AnalyticsProvider'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import FadeIn from '@/components/FadeIn'
// canvas-confetti is dynamic-imported in the RSVP success handler to keep
// it out of the main bundle for users who never RSVP.
let confettiCache: ((opts: Record<string, unknown>) => void) | null = null
const fireConfetti = (opts: Record<string, unknown>) => {
  if (confettiCache) { try { confettiCache(opts) } catch {} ; return }
  import('canvas-confetti').then(mod => {
    confettiCache = mod.default as unknown as (opts: Record<string, unknown>) => void
    try { confettiCache(opts) } catch {}
  }).catch(() => {})
}

interface Event {
  id: string
  title: string
  category: string
  description: string
  start_datetime: string
  end_datetime: string
  location_name: string
  location_address: string
  city: string
  spots_left: number
  capacity: number
  tags: string[]
  visibility: string
  is_featured: boolean
  host_id: string
  ticket_type?: string
  ticket_price?: number
  latitude?: number | null
  longitude?: number | null
}

interface Attendee {
  user_id: string
  profiles: { id: string; name: string; avatar_url: string | null }
}

interface Comment {
  id: string
  user_id: string
  text: string
  created_at: string
  profiles: { id: string; name: string; avatar_url: string | null }
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [event, setEvent] = useState<Event | null>(null)
  const [host, setHost] = useState<any>(null)
  const [hostEventCount, setHostEventCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [rsvped, setRsvped] = useState(false)
  const [rsvpLoading, setRsvpLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [eventId, setEventId] = useState<string>('')
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [totalAttendees, setTotalAttendees] = useState(0)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [hasReviewsPending, setHasReviewsPending] = useState(true)
  const [showCancelRsvp, setShowCancelRsvp] = useState(false)
  const [rsvpGhostKey, setRsvpGhostKey] = useState(0)
  const [matches, setMatches] = useState<any[]>([])
  const [matchConnStatuses, setMatchConnStatuses] = useState<Record<string, string>>({})
  const [matchConnLoading, setMatchConnLoading] = useState<string | null>(null)
  const [showAllMatches, setShowAllMatches] = useState(false)
  const [isGathrPlus, setIsGathrPlus] = useState(false)
  const [wavedIds, setWavedIds] = useState<Set<string>>(new Set())
  const [mutualWaveIds, setMutualWaveIds] = useState<Set<string>>(new Set())
  const [incomingWaveCount, setIncomingWaveCount] = useState(0)
  const [inviteCode, setInviteCode] = useState('')
  const [inviteCopied, setInviteCopied] = useState(false)
  const [copied, setCopied] = useState(false)
  const [rsvpError, setRsvpError] = useState('')
  const [showPaidGate, setShowPaidGate] = useState(false)
  const [showPushPrompt, setShowPushPrompt] = useState(false)
  const [checkedIn, setCheckedIn] = useState(false)
  const [checkInLoading, setCheckInLoading] = useState(false)
  const [checkInError, setCheckInError] = useState('')
  const [pendingCheckIn, setPendingCheckIn] = useState<{ lat: number | null; lng: number | null; distanceM: number | null } | null>(null)
  const checkInErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { status: pushStatus, enable: enablePush } = usePushNotifications(user?.id ?? null)
  const commentInputRef = useRef<HTMLInputElement>(null)
  const inviteCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rsvpErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  useEffect(() => {
    params.then(({ id }) => {
      if (!isValidUUID(id)) { router.push('/home'); return }
      setEventId(id)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) { router.push('/auth'); return }
        setUser(session.user)
        fetchEvent(id, session.user.id)
      })
    })
  }, [params, router])

  useEffect(() => {
    if (!eventId) return

    const commentChannel = supabase
      .channel('comments-' + eventId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'event_comments',
        filter: 'event_id=eq.' + eventId,
      }, async (payload) => {
        const { data } = await supabase
          .from('event_comments')
          .select('id, user_id, text, created_at, profiles(id, name, avatar_url)')
          .eq('id', payload.new.id)
          .single()
        if (!data) return
        setComments(prev => {
          if (prev.some(c => c.id === data.id)) return prev
          // Replace optimistic placeholder from own post if it matches
          const optimisticIdx = prev.findIndex(c =>
            c.id.startsWith('optimistic-') && c.user_id === data.user_id && c.text === (data as any).text
          )
          if (optimisticIdx !== -1) {
            const next = [...prev]
            next[optimisticIdx] = data as any
            return next
          }
          return [...prev, data as any]
        })
      })
      .subscribe()

    const rsvpChannel = supabase
      .channel('rsvps-' + eventId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'rsvps',
        filter: 'event_id=eq.' + eventId,
      }, async (payload) => {
        setTotalAttendees(prev => prev + 1)
        setEvent(prev => prev ? { ...prev, spots_left: Math.max(0, prev.spots_left - 1) } : prev)
        const newRsvp = payload.new as { user_id?: string }
        if (newRsvp.user_id && newRsvp.user_id !== user?.id) {
          setRsvpGhostKey(k => k + 1)
          const { data: prof } = await supabase.from('profiles').select('id, name, avatar_url').eq('id', newRsvp.user_id).single()
          if (prof) setAttendees(prev => {
            if (prev.some(a => a.user_id === newRsvp.user_id)) return prev
            return [...prev, { user_id: newRsvp.user_id, profiles: prof } as any].slice(0, 12)
          })
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'rsvps',
        filter: 'event_id=eq.' + eventId,
      }, (payload) => {
        const gone = payload.old as { user_id?: string }
        setTotalAttendees(prev => Math.max(0, prev - 1))
        setEvent(prev => prev ? { ...prev, spots_left: prev.spots_left + 1 } : prev)
        if (gone.user_id) setAttendees(prev => prev.filter(a => a.user_id !== gone.user_id))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(commentChannel)
      supabase.removeChannel(rsvpChannel)
      if (inviteCopiedTimerRef.current) clearTimeout(inviteCopiedTimerRef.current)
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
      if (rsvpErrorTimerRef.current) clearTimeout(rsvpErrorTimerRef.current)
      if (checkInErrorTimerRef.current) clearTimeout(checkInErrorTimerRef.current)
    }
  }, [eventId])

  const fetchEvent = async (id: string, userId: string) => {
    try {
    const { data: eventData } = await supabase
      .from('events')
      .select('id, title, category, description, start_datetime, end_datetime, location_name, location_address, city, spots_left, capacity, tags, visibility, is_featured, host_id, ticket_type, ticket_price, latitude, longitude')
      .eq('id', id)
      .single()

    if (!eventData) { router.push('/home'); return }

    // Privacy gate — invite code validated server-side so invite_code never reaches the client
    if (eventData.visibility === 'private' && eventData.host_id !== userId) {
      const inviteParam = new URLSearchParams(window.location.search).get('invite')
      const hasValidInvite = inviteParam
        ? !!(await supabase.from('events').select('id').eq('id', id).eq('invite_code', inviteParam).maybeSingle()).data
        : false
      if (!hasValidInvite) {
        const { data: rsvpCheck } = await supabase
          .from('rsvps').select('id').eq('event_id', id).eq('user_id', userId).maybeSingle()
        if (!rsvpCheck) { setBlocked(true); return }
      }
    }

    const [hostRes, rsvpRes, attendeesRes, countRes, commentsRes, hostCountRes, bookmarkRes, checkInRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', eventData.host_id).single(),
      supabase.from('rsvps').select('id').eq('event_id', id).eq('user_id', userId).maybeSingle(),
      supabase.from('rsvps').select('user_id, profiles(id, name, avatar_url)').eq('event_id', id).limit(12),
      supabase.from('rsvps').select('*', { count: 'exact', head: true }).eq('event_id', id),
      supabase.from('event_comments').select('id, user_id, text, created_at, profiles(id, name, avatar_url)').eq('event_id', id).order('created_at', { ascending: true }).limit(100),
      supabase.from('events').select('*', { count: 'exact', head: true }).eq('host_id', eventData.host_id),
      supabase.from('event_bookmarks').select('id').eq('event_id', id).eq('user_id', userId).maybeSingle(),
      supabase.from('check_ins').select('id').eq('event_id', id).eq('user_id', userId).maybeSingle(),
    ])

    // Access confirmed — commit to state
    setEvent(eventData)
    if (hostRes.data) setHost(hostRes.data)
    if (hostCountRes.count !== null) setHostEventCount(hostCountRes.count)
    if (rsvpRes.data) setRsvped(true)
    if (attendeesRes.data) setAttendees(attendeesRes.data as any)
    if (countRes.count !== null) setTotalAttendees(countRes.count)
    if (commentsRes.data) setComments(commentsRes.data as any)
    if (checkInRes.data) setCheckedIn(true)
    if (bookmarkRes.data) setBookmarked(true)
    if (userId === eventData.host_id && (eventData.visibility === 'private' || eventData.visibility === 'unlisted')) {
      const { data: codeRow } = await supabase.from('events').select('invite_code').eq('id', id).single()
      if (codeRow?.invite_code) setInviteCode(codeRow.invite_code)
    }

    try {
      const RECENTLY_VIEWED_KEY = 'gathr_recently_viewed'
      const stored = localStorage.getItem(RECENTLY_VIEWED_KEY)
      const viewed = stored ? JSON.parse(stored) : []
      const updated = [eventData, ...viewed.filter((e: any) => e.id !== eventData.id)].slice(0, 10)
      localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated))
    } catch {}

    const endTime = new Date(eventData.end_datetime).getTime()
    const nowMs = Date.now()
    if (rsvpRes.data && endTime > nowMs - 48 * 3600000) {
      fetchMatches(id, userId)
    }

    if (rsvpRes.data && endTime < nowMs) {
      const otherCount = Math.max(0, (countRes.count ?? 0) - 1)
      if (otherCount === 0) {
        setHasReviewsPending(false)
      } else {
        const { count: reviewedCount } = await supabase
          .from('user_reviews')
          .select('*', { count: 'exact', head: true })
          .eq('reviewer_id', userId)
          .eq('event_id', id)
        setHasReviewsPending(reviewedCount === null || reviewedCount < otherCount)
      }
    }
  } finally {
    setLoading(false)
  }
  }

  const haversineM = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371000
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  const commitCheckIn = async (lat: number | null, lng: number | null, distanceM: number | null) => {
    if (!user || !event) return
    setCheckInLoading(true)
    const { error } = await supabase.from('check_ins').insert({
      user_id: user.id, event_id: event.id, lat, lng, distance_m: distanceM,
    })
    if (error) {
      setCheckInError('Check-in failed. Try again.')
      if (checkInErrorTimerRef.current) clearTimeout(checkInErrorTimerRef.current)
      checkInErrorTimerRef.current = setTimeout(() => setCheckInError(''), 4000)
    } else {
      setCheckedIn(true)
    }
    setPendingCheckIn(null)
    setCheckInLoading(false)
  }

  const handleCheckIn = () => {
    if (!user || !event || checkInLoading || checkedIn) return
    setCheckInLoading(true)

    if (!navigator.geolocation || !event.latitude || !event.longitude) {
      setCheckInLoading(false)
      setPendingCheckIn({ lat: null, lng: null, distanceM: null })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = Math.round(haversineM(pos.coords.latitude, pos.coords.longitude, event.latitude!, event.longitude!))
        if (dist <= 500) {
          commitCheckIn(pos.coords.latitude, pos.coords.longitude, dist)
        } else {
          setCheckInLoading(false)
          setPendingCheckIn({ lat: pos.coords.latitude, lng: pos.coords.longitude, distanceM: dist })
        }
      },
      () => {
        setCheckInLoading(false)
        setPendingCheckIn({ lat: null, lng: null, distanceM: null })
      },
      { timeout: 8000, maximumAge: 30000 },
    )
  }

  const handleRsvp = async () => {
    if (!user || !event) return
    if (rsvped) { setShowCancelRsvp(true); return }
    if (event.ticket_type === 'paid') { setShowPaidGate(true); return }
    setRsvpLoading(true)
    setRsvped(true)
    setTotalAttendees(prev => prev + 1)
    setEvent(prev => prev ? { ...prev, spots_left: Math.max(0, prev.spots_left - 1) } : prev)
    const { error } = await supabase.from('rsvps').insert({
      event_id: event.id, user_id: user.id, status: 'joined'
    })
    if (error) {
      setRsvped(false)
      setTotalAttendees(prev => Math.max(0, prev - 1))
      setEvent(prev => prev ? { ...prev, spots_left: prev.spots_left + 1 } : prev)
      const msg = error.code === '23505' ? 'You already have an RSVP for this event.' : 'Couldn\'t join — please try again.'
      setRsvpError(msg)
      if (rsvpErrorTimerRef.current) clearTimeout(rsvpErrorTimerRef.current)
      rsvpErrorTimerRef.current = setTimeout(() => setRsvpError(''), 4000)
    } else {
      fireConfetti({ particleCount: 80, spread: 60, origin: { y: 0.7 }, colors: ['#E8B84B', '#F0EDE6', '#7EC87E'] })
      track('event_rsvp_joined', { event_id: event.id, category: event.category, city: event.city })
      try {
        if (pushStatus === 'inactive' && !localStorage.getItem('gathr_push_prompted')) {
          localStorage.setItem('gathr_push_prompted', '1')
          setTimeout(() => setShowPushPrompt(true), 1200)
        }
      } catch {}
      const { data } = await supabase.from('rsvps').select('user_id, profiles(id, name, avatar_url)').eq('event_id', event.id).limit(12)
      if (data) setAttendees(data as any)
    }
    setRsvpLoading(false)
  }

  const handleConfirmCancelRsvp = async () => {
    if (!user || !event) return
    setShowCancelRsvp(false)
    setRsvpLoading(true)
    setRsvped(false)
    setTotalAttendees(prev => Math.max(0, prev - 1))
    setAttendees(prev => prev.filter(a => a.user_id !== user.id))
    setEvent(prev => prev ? { ...prev, spots_left: prev.spots_left + 1 } : prev)
    const { error } = await supabase.from('rsvps').delete().eq('event_id', event.id).eq('user_id', user.id)
    if (error) {
      setRsvped(true)
      setTotalAttendees(prev => prev + 1)
      setAttendees(prev => [...prev, { user_id: user.id, profiles: null } as any])
      setEvent(prev => prev ? { ...prev, spots_left: Math.max(0, prev.spots_left - 1) } : prev)
    } else {
      track('event_rsvp_cancelled', { event_id: event.id, category: event.category })
    }
    setRsvpLoading(false)
  }

  const handleBookmark = async () => {
    if (!user || !event) return
    if (bookmarked) {
      setBookmarked(false)
      const { error } = await supabase.from('event_bookmarks').delete().eq('event_id', event.id).eq('user_id', user.id)
      if (error) setBookmarked(true)
    } else {
      setBookmarked(true)
      const { error } = await supabase.from('event_bookmarks').insert({ event_id: event.id, user_id: user.id })
      if (error) setBookmarked(false)
    }
  }

  const fetchMatches = async (evtId: string, userId: string) => {
    const { data: rsvpData } = await supabase
      .from('rsvps')
      .select('user_id')
      .eq('event_id', evtId)
      .neq('user_id', userId)
      .limit(100)

    if (!rsvpData || rsvpData.length === 0) return

    const attendeeIds = rsvpData.map((r: any) => r.user_id)

    const [profilesRes, myProfileRes, connectionsRes, myWavesRes, incomingWavesRes] = await Promise.all([
      supabase.from('profiles').select('id, name, avatar_url, interests, bio_social, attended_count, safety_tier, review_count').in('id', attendeeIds).eq('matching_enabled', true),
      supabase.from('profiles').select('interests, gathr_plus, gathr_plus_expires_at').eq('id', userId).single(),
      supabase.from('connections').select('requester_id, addressee_id, status').or(connectionPairOr(userId)),
      supabase.from('waves').select('receiver_id').eq('sender_id', userId).eq('event_id', evtId),
      supabase.from('waves').select('sender_id, is_mutual').eq('receiver_id', userId).eq('event_id', evtId),
    ])

    const myInterests: string[] = (myProfileRes.data?.interests || []).map((i: string) => i.toLowerCase())
    const connections = connectionsRes.data || []

    const connMap: Record<string, string> = {}
    connections.forEach((c: any) => {
      const otherId = c.requester_id === userId ? c.addressee_id : c.requester_id
      connMap[otherId] = c.status
    })
    setMatchConnStatuses(connMap)

    const scored = (profilesRes.data || [])
      .filter((p: any) => !connMap[p.id] && p.safety_tier !== 'flagged')
      .map((p: any) => {
        const their = (p.interests || []).map((i: string) => i.toLowerCase())
        const shared = myInterests.filter(i => their.includes(i))
        const trust = (p.avatar_url ? 1 : 0) + (p.bio_social ? 1 : 0) + (their.length >= 3 ? 1 : 0) + ((p.attended_count || 0) >= 3 ? 1 : 0)
        return { ...p, shared, trust }
      })
      .sort((a: any, b: any) => b.shared.length - a.shared.length || b.trust - a.trust)

    setMatches(scored)
    const expiresAt = myProfileRes.data?.gathr_plus_expires_at
    const trialActive = expiresAt ? new Date(expiresAt) > new Date() : false
    setIsGathrPlus(myProfileRes.data?.gathr_plus === true || trialActive)
    setWavedIds(new Set((myWavesRes.data || []).map((w: any) => w.receiver_id)))
    const mutualIds = new Set((incomingWavesRes.data || []).filter((w: any) => w.is_mutual).map((w: any) => w.sender_id))
    setMutualWaveIds(mutualIds)
    setIncomingWaveCount((incomingWavesRes.data || []).length)
  }

  const handleWave = async (receiverId: string) => {
    if (!user || !event || wavedIds.has(receiverId)) return
    setWavedIds(prev => new Set([...prev, receiverId]))
    const { data, error } = await supabase.from('waves').insert({
      sender_id: user.id,
      receiver_id: receiverId,
      event_id: eventId,
    }).select().single()
    if (error) {
      setWavedIds(prev => { const next = new Set(prev); next.delete(receiverId); return next })
      return
    }
    if (data) {
      await supabase.from('notifications').insert({
        user_id: receiverId,
        actor_id: null,
        type: 'wave',
        title: 'Someone wants to meet you',
        body: `A mystery match at "${event.title}" sent you a wave 👋`,
        link: '/events/' + eventId,
        read: false,
      })
    }
  }

  const handleMatchConnect = async (personId: string) => {
    if (!user || matchConnLoading) return
    setMatchConnLoading(personId)
    const { data, error } = await supabase.from('connections').insert({
      requester_id: user.id,
      addressee_id: personId,
    }).select().single()
    if (!error && data) {
      setMatchConnStatuses(prev => ({ ...prev, [personId]: 'pending' }))
    }
    setMatchConnLoading(null)
  }

  const handleDelete = async () => {
    if (!event || !user || user.id !== event.host_id) return
    setDeleting(true)
    const coverUrl = (event as any).cover_url as string | undefined
    await Promise.all([
      supabase.from('rsvps').delete().eq('event_id', event.id),
      supabase.from('event_bookmarks').delete().eq('event_id', event.id),
      supabase.from('event_comments').delete().eq('event_id', event.id),
      supabase.from('waves').delete().eq('event_id', event.id),
    ])
    await supabase.from('events').delete().eq('id', event.id)
    if (coverUrl) {
      const marker = '/event-covers/'
      const idx = coverUrl.indexOf(marker)
      if (idx !== -1) {
        const storagePath = coverUrl.slice(idx + marker.length).split('?')[0]
        await supabase.storage.from('event-covers').remove([storagePath])
      }
    }
    router.push('/home')
  }

  const handlePostComment = async () => {
    const trimmed = commentText.trim()
    if (!trimmed || !user || !eventId || postingComment) return
    if (trimmed.length > 500) return

    // Resolve own profile for the optimistic comment from available in-page data
    const myProfile =
      attendees.find(a => a.user_id === user.id)?.profiles
      ?? (host?.id === user.id ? { id: user.id, name: host.name, avatar_url: host.avatar_url ?? null } : null)
      ?? { id: user.id, name: user.email?.split('@')[0] ?? 'You', avatar_url: null }

    const tempId = 'optimistic-' + Date.now()
    const optimistic = { id: tempId, user_id: user.id, text: trimmed, created_at: new Date().toISOString(), profiles: myProfile }
    setCommentText('')
    setPostingComment(true)
    setComments(prev => [...prev, optimistic as any])

    const { data: newComment, error } = await supabase
      .from('event_comments')
      .insert({ event_id: eventId, user_id: user.id, text: trimmed })
      .select('id, user_id, text, created_at, profiles(id, name, avatar_url)')
      .single()
    if (!error && newComment) {
      setComments(prev => prev.map(c => c.id === tempId ? newComment as any : c))
    } else if (error) {
      setComments(prev => prev.filter(c => c.id !== tempId))
      setCommentText(trimmed)
    }
    setPostingComment(false)
  }

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase.from('event_comments').delete().eq('id', commentId)
    if (!error) setComments(prev => prev.filter(c => c.id !== commentId))
  }

  const handleCopyInvite = async () => {
    const url = window.location.origin + '/events/' + event?.id + '?invite=' + inviteCode
    await navigator.clipboard.writeText(url)
    setInviteCopied(true)
    if (inviteCopiedTimerRef.current) clearTimeout(inviteCopiedTimerRef.current)
    inviteCopiedTimerRef.current = setTimeout(() => setInviteCopied(false), 2000)
  }

  const handleShare = async () => {
    const url = window.location.href
    const shareData = { title: event?.title || 'Gathr Event', text: event?.description || 'Check out this event on Gathr!', url }
    if (navigator.share) {
      try { await navigator.share(shareData) } catch {}
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleOpenMaps = () => {
    if (!event) return
    const query = encodeURIComponent([event.location_name, event.location_address, event.city].filter(Boolean).join(', '))
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    window.open(isIOS ? `https://maps.apple.com/?q=${query}` : `https://www.google.com/maps/search/${query}`, '_blank')
  }

  const handleAddToCalendar = () => setShowCalendarModal(true)

  const handleGoogleCalendar = () => {
    if (!event) return
    const fmt = (dt: string) => new Date(dt).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const p = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: fmt(event.start_datetime) + '/' + fmt(event.end_datetime),
      details: event.description || '',
      location: [event.location_name, (rsvped || user?.id === event.host_id) ? event.location_address : null].filter(Boolean).join(', '),
    })
    window.open('https://calendar.google.com/calendar/render?' + p.toString(), '_blank')
    setShowCalendarModal(false)
  }

  const handleAppleCalendar = () => {
    if (!event) return
    const fmt = (dt: string) => new Date(dt).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const icsEscape = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/:/g, '\\:').replace(/\r\n|\r|\n/g, '\\n')
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'DTSTART:' + fmt(event.start_datetime),
      'DTEND:' + fmt(event.end_datetime),
      'SUMMARY:' + icsEscape(event.title),
      'DESCRIPTION:' + icsEscape(event.description || ''),
      'LOCATION:' + icsEscape([event.location_name, (rsvped || user?.id === event.host_id) ? event.location_address : null].filter(Boolean).join(', ')),
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
    const blob = new Blob([ics], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = event.title.replace(/\s+/g, '-') + '.ics'
    a.click()
    URL.revokeObjectURL(url)
    setShowCalendarModal(false)
  }

  const formatCommentTime = (dt: string) => {
    const diff = Date.now() - new Date(dt).getTime()
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago'
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago'
    return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) return <EventDetailSkeleton />

  if (blocked) return (
    <div className="min-h-screen bg-[#0D110D] flex flex-col items-center justify-center px-6 gap-4 text-center">
      <div className="w-16 h-16 bg-[#1C241C] border border-white/10 rounded-2xl flex items-center justify-center mb-2">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <h2 className="text-lg font-bold text-[#F0EDE6]">Private Event</h2>
      <p className="text-sm text-white/40 max-w-[240px]">You need an invite link from the host to access this event.</p>
      <button onClick={() => router.push('/home')}
        className="mt-4 bg-[#E8B84B] text-[#0D110D] px-8 py-3.5 rounded-2xl font-bold text-sm active:scale-95 transition-transform">
        Back to Home
      </button>
    </div>
  )

  if (!event) return null

  const isHost = user?.id === event.host_id
  const spotsPercent = event.capacity > 0 ? ((event.capacity - event.spots_left) / event.capacity) * 100 : 0

  return (
    <FadeIn className="min-h-screen bg-[#0D110D] flex flex-col">

      {/* Hero */}
      <div className="relative h-52 flex-shrink-0"
        style={{background: 'var(--gradient-event-hero)'}}>
        {optimizedImgSrc((event as any).cover_url, 900) && (
          <img src={optimizedImgSrc((event as any).cover_url, 900)!} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D110D] via-transparent to-transparent"></div>
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 z-10">
          <button onClick={() => router.back()}
            className="w-9 h-9 bg-[#0D110D]/70 border border-white/15 rounded-xl flex items-center justify-center text-[#F0EDE6] active:scale-95 transition-transform">
            {'←'}
          </button>
          <div className="flex gap-2">
            {isHost && (
              <button onClick={() => router.push('/events/' + event.id + '/edit')}
                className="w-9 h-9 bg-[#0D110D]/70 border border-white/15 rounded-xl flex items-center justify-center active:scale-95 transition-transform">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(232,184,75,0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            )}
            {isHost && (event.visibility === 'private' || event.visibility === 'unlisted') && inviteCode && (
              <button onClick={handleCopyInvite} className={'w-9 h-9 bg-[#0D110D]/70 border rounded-xl flex items-center justify-center text-base transition-all active:scale-95 ' + (inviteCopied ? 'border-[#7EC87E]/40 text-[#7EC87E]' : 'border-[#E8B84B]/30')}>
                {inviteCopied ? '✓' : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                )}
              </button>
            )}
            <button onClick={handleShare} className={'w-9 h-9 bg-[#0D110D]/70 border rounded-xl flex items-center justify-center text-base transition-all active:scale-95 ' + (copied ? 'border-[#7EC87E]/40 text-[#7EC87E]' : 'border-white/15')}>
              {copied ? '✓' : '↑'}
            </button>
            <button onClick={handleBookmark} className={'w-9 h-9 border rounded-xl flex items-center justify-center transition-all active:scale-95 ' + (bookmarked ? 'bg-[#E8B84B]/20 border-[#E8B84B]/40 text-[#E8B84B]' : 'bg-[#0D110D]/70 border-white/15 text-white/60')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="absolute bottom-3 left-4 flex gap-2 z-10">
          {event.is_featured && <span className="bg-[#E8B84B] text-[#0D110D] text-[9px] font-bold px-2 py-0.5 rounded-full">Featured</span>}
          <span className="bg-[#0E1E0E]/90 text-[#7EC87E] text-[9px] px-2 py-0.5 rounded-full border border-[#7EC87E]/20">◉ {event.visibility}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-40">

        <h1 className="font-display font-bold text-[#F0EDE6] text-lg leading-snug mb-4">
          {event.title}
        </h1>

        {/* Date + Location */}
        <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5 mb-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 bg-[#1E3A1E] rounded-lg flex items-center justify-center flex-shrink-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(232,184,75,0.6)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div>
              {(() => { const tz = cityToTimezone(event.city); const abbr = tzAbbreviation(event.start_datetime, tz); return (
                <>
                  <div className="text-sm font-medium text-[#F0EDE6]">{formatDateVerbose(event.start_datetime, tz)}</div>
                  <div className="text-xs text-white/45">
                    {formatTime(event.start_datetime, tz)} – {formatTime(event.end_datetime, tz)}
                    {abbr && <span className="text-white/30"> · {abbr}</span>}
                  </div>
                </>
              )})()}
            </div>
            <button onClick={handleAddToCalendar} className="ml-auto flex items-center gap-1 bg-[#E8B84B]/10 border border-[#E8B84B]/30 rounded-xl px-2.5 py-1.5 text-[10px] font-semibold text-[#E8B84B] active:scale-95 transition-transform">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Save
            </button>
          </div>
          {(rsvped || isHost) ? (
            <button onClick={handleOpenMaps} className="flex items-center gap-3 w-full text-left active:opacity-70 transition-opacity">
              <div className="w-7 h-7 bg-[#1E3A1E] rounded-lg flex items-center justify-center flex-shrink-0">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(232,184,75,0.6)" strokeWidth="1.75" strokeLinecap="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#F0EDE6]">{event.location_name}</div>
                <div className="text-xs text-white/45">{event.location_address || event.city}</div>
              </div>
              <span className="text-[10px] text-[#E8B84B] bg-[#E8B84B]/10 border border-[#E8B84B]/20 px-2 py-1 rounded-lg flex-shrink-0">Open →</span>
            </button>
          ) : (
            <div className="flex items-center gap-3 w-full">
              <div className="w-7 h-7 bg-[#1E3A1E] rounded-lg flex items-center justify-center flex-shrink-0">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(232,184,75,0.6)" strokeWidth="1.75" strokeLinecap="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#F0EDE6]">{event.location_name}</div>
                <div className="text-xs text-white/40 italic">RSVP to unlock full address</div>
              </div>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
          )}
        </div>

        {/* About */}
        {event.description && (
          <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5 mb-3">
            <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2 font-medium">About this event</div>
            <p className="text-sm text-white/60 leading-relaxed font-light">{event.description}</p>
          </div>
        )}

        {/* Attendees */}
        <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5 mb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium relative">
              {totalAttendees > 0 ? `${totalAttendees} Going` : 'Attendees'}
              {rsvpGhostKey > 0 && (
                <span
                  key={rsvpGhostKey}
                  className="absolute -top-3 left-full ml-1 text-[10px] font-bold text-[#7EC87E] rsvp-ghost normal-case tracking-normal">
                  +1
                </span>
              )}
            </div>
            {totalAttendees > 0 && (
              <button onClick={() => router.push('/events/' + event.id + '/attendees')}
                className="text-[10px] text-[#E8B84B]">
                {totalAttendees > 12 ? `+${totalAttendees - 12} more →` : 'See all →'}
              </button>
            )}
          </div>
          {attendees.length === 0 ? (
            <div className="flex items-center gap-2 py-1">
              <p className="text-xs text-white/35">Be the first to RSVP!</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {attendees.map((a) => {
                const profile = (a as any).profiles
                if (!profile) return null
                return (
                  <button
                    key={a.user_id}
                    onClick={() => router.push('/profile/' + profile.id)}
                    className="flex flex-col items-center gap-1"
                  >
                    {optimizedImgSrc(profile.avatar_url, 96) ? (
                      <img src={optimizedImgSrc(profile.avatar_url, 96)!} alt="" className="w-10 h-10 rounded-xl object-cover border border-white/10"  loading="lazy" />
                    ) : (
                      <div className="w-10 h-10 bg-[#2A4A2A] rounded-xl flex items-center justify-center text-base border border-white/10">
                        {profile.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <span className="text-[9px] text-white/40 max-w-[40px] truncate">{profile.name?.split(' ')[0]}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Mystery match teaser — shown to non-RSVPed, non-host on upcoming events */}
        {!rsvped && !isHost && event && Date.now() < new Date(event.end_datetime).getTime() && matches.length === 0 && (
          <div className="bg-[#1C241C] border border-[#E8B84B]/15 rounded-2xl p-3.5 mb-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E8B84B]/8 border border-[#E8B84B]/15 flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(232,184,75,0.6)" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6"/>
                <circle cx="12" cy="8" r="4" fill="rgba(232,184,75,0.06)"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-[#E8B84B]/70 mb-0.5">Who&apos;s going?</div>
              <div className="text-[10px] text-white/40 leading-snug">RSVP to unlock your match count — see how many people share your vibe</div>
            </div>
          </div>
        )}

        {/* People Matching */}
        {matches.length > 0 && event && (() => {
          const nowMs = Date.now()
          const eventState: 'upcoming' | 'ongoing' | 'ended' =
            nowMs < new Date(event.start_datetime).getTime() ? 'upcoming'
            : nowMs < new Date(event.end_datetime).getTime() ? 'ongoing'
            : 'ended'
          const isPostEvent = eventState === 'ended'

          const headerEmoji = eventState === 'upcoming' ? '🔮' : eventState === 'ongoing' ? '🎯' : '✨'
          const headerText = eventState === 'upcoming'
            ? `${matches.length} match${matches.length !== 1 ? 'es' : ''} waiting`
            : eventState === 'ongoing'
            ? `${matches.length} ${matches.length !== 1 ? 'people' : 'person'} here now`
            : `${matches.length} ${matches.length !== 1 ? 'people' : 'person'} you crossed paths with`

          const freeVisibleCount = eventState === 'upcoming' && !isGathrPlus ? 1 : 5
          const visibleMatches = showAllMatches ? matches : matches.slice(0, freeVisibleCount)
          const hiddenCount = matches.length - visibleMatches.length

          return (
            <div className="bg-[#1C241C] border border-[#E8B84B]/15 rounded-2xl p-3.5 mb-3">

              {/* Header */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{headerEmoji}</span>
                  <span className="text-xs font-semibold text-[#F0EDE6]">{headerText}</span>
                </div>
                <p className="text-[10px] text-white/40 leading-relaxed">
                  {eventState === 'upcoming'
                    ? 'Full profiles unlock after the event. Show up to reveal who you matched with.'
                    : eventState === 'ongoing'
                    ? 'They\'re here. Find them in person or send a Hi.'
                    : 'You were at the same event. Rate your experience below.'}
                </p>
              </div>

              {/* Incoming wave teaser */}
              {incomingWaveCount > 0 && eventState === 'upcoming' && (
                <div className="mb-3 bg-[#E8B84B]/5 border border-[#E8B84B]/20 rounded-xl p-2.5 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#E8B84B]/10 flex items-center justify-center flex-shrink-0">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(232,184,75,0.8)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-semibold text-[#E8B84B]">
                      {incomingWaveCount === 1 ? 'Someone is curious about meeting you' : `${incomingWaveCount} people are curious about meeting you`}
                      {mutualWaveIds.size > 0 && (
                        <span className="ml-1.5 text-[#7EC87E]">· {mutualWaveIds.size} mutual 🔁</span>
                      )}
                    </div>
                    <div className="text-[9px] text-white/35 mt-0.5">
                      {mutualWaveIds.size > 0 ? 'You both waved — show up to connect' : 'Attend the event to find out who'}
                    </div>
                  </div>
                </div>
              )}

              {/* Match cards */}
              <div className="space-y-3.5">
                {visibleMatches.map((match: any) => (
                  <MysteryMatchCard
                    key={match.id}
                    match={match}
                    eventState={eventState}
                    gathrPlus={isGathrPlus}
                    eventId={eventId}
                    connStatus={matchConnStatuses[match.id]}
                    waved={wavedIds.has(match.id)}
                    incomingMutual={mutualWaveIds.has(match.id)}
                    matchConnLoading={matchConnLoading}
                    onHi={id => handleMatchConnect(id)}
                    onWave={handleWave}
                    onNavigate={path => router.push(path)}
                    onMessage={() => router.push('/messages/' + [user?.id, match.id].sort().join('_') + '?from=' + eventId)}
                    isPostEvent={isPostEvent}
                  />
                ))}
              </div>

              {/* Gathr+ upsell — blurred ghost cards for free users on upcoming events */}
              {eventState === 'upcoming' && !isGathrPlus && hiddenCount > 0 && (
                <div className="mt-3.5">
                  {/* Show up to 2 ghost previews blurred behind a frosted lock overlay */}
                  <div className="space-y-3.5 relative">
                    {matches.slice(freeVisibleCount, freeVisibleCount + 2).map((ghost: any, i: number) => (
                      <div key={ghost.id + '-ghost'} className="relative select-none pointer-events-none" style={{ opacity: i === 0 ? 0.55 : 0.35 }}>
                        <div className="blur-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-[#1E3A1E] border border-white/[0.07] flex-shrink-0" />
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="h-3 w-20 bg-white/10 rounded-full" />
                              <div className="h-2.5 w-28 bg-white/[0.07] rounded-full" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* Frosted glass lock banner */}
                    <div
                      className="absolute inset-x-0 bottom-0 top-0 flex flex-col items-center justify-center rounded-xl"
                      style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(13,17,13,0.85) 40%)' }}>
                      <div className="flex items-center gap-1.5">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(232,184,75,0.7)" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        <span className="text-[10px] font-bold text-[#E8B84B]">{hiddenCount} more {hiddenCount === 1 ? 'match' : 'matches'} hidden</span>
                      </div>
                    </div>
                  </div>
                  {/* Upsell card */}
                  <div className="mt-3 bg-[#E8B84B]/5 border border-[#E8B84B]/15 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-bold text-[#E8B84B]">✦ Gathr+</span>
                      <span className="text-[9px] text-white/25">unlock before the event</span>
                    </div>
                    <p className="text-[9px] text-white/40 mb-2 leading-relaxed">
                      See partial names, shared interests, and send waves to your matches before you arrive.
                    </p>
                    <button onClick={() => router.push('/gathr-plus')} className="text-[10px] text-[#E8B84B] font-semibold">
                      Learn more →
                    </button>
                  </div>
                </div>
              )}

              {/* See more / show less for Gathr+ or post-event */}
              {(isGathrPlus || eventState !== 'upcoming') && hiddenCount > 0 && !showAllMatches && (
                <button onClick={() => setShowAllMatches(true)}
                  className="mt-3 w-full text-[10px] text-[#E8B84B]/60 text-center py-1.5 border-t border-white/[0.06]">
                  See {hiddenCount} more →
                </button>
              )}
              {showAllMatches && matches.length > freeVisibleCount && (
                <button onClick={() => setShowAllMatches(false)}
                  className="mt-3 w-full text-[10px] text-[#E8B84B]/60 text-center py-1.5 border-t border-white/[0.06]">
                  Show less ↑
                </button>
              )}

              {/* Preferences link */}
              {hiddenCount === 0 && !showAllMatches && (
                <div className="mt-3 pt-2.5 border-t border-white/[0.06] text-center">
                  <button onClick={() => router.push('/settings')} className="text-[9px] text-white/20">
                    Manage matching preferences →
                  </button>
                </div>
              )}
            </div>
          )
        })()}

        {/* Post-event survey CTA */}
        {rsvped && event && hasReviewsPending && Date.now() > new Date(event.end_datetime).getTime() && (
          <div className="bg-[#1C241C] border border-[#7EC87E]/20 rounded-2xl p-3.5 mb-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-[#7EC87E]/10 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
              ✦
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-[#F0EDE6]">How was it?</div>
              <div className="text-[11px] text-white/40 mt-0.5">Share a quick review to help the community.</div>
            </div>
            <button
              onClick={() => router.push(`/events/${event.id}/survey`)}
              className="bg-[#7EC87E]/15 border border-[#7EC87E]/25 rounded-xl px-3 py-1.5 text-[11px] font-semibold text-[#7EC87E] flex-shrink-0">
              Review
            </button>
          </div>
        )}

        {/* Spots */}
        {event.capacity > 0 && (
          <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5 mb-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-white/45">Spots remaining</span>
              <span className={`text-xs font-semibold ${event.spots_left < 20 ? 'text-[#E8A84B]' : 'text-[#F0EDE6]'}`}>
                {event.spots_left} of {event.capacity} left
              </span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#7EC87E] to-[#E8B84B]"
                style={{width: `${spotsPercent}%`}}></div>
            </div>
          </div>
        )}

        {/* Tickets */}
        {event.ticket_type && event.ticket_type !== 'free' && (
          <div className="bg-[#1C241C] border border-[#E8B84B]/20 rounded-2xl p-3.5 mb-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-[#E8B84B]/10 rounded-xl flex items-center justify-center flex-shrink-0">
              {event.ticket_type === 'paid' ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(232,184,75,0.65)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 5H3a1 1 0 0 0-1 1v3.5a2.5 2.5 0 0 1 0 5V18a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5a2.5 2.5 0 0 1 0-5V6a1 1 0 0 0-1-1z"/>
                </svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(232,184,75,0.65)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/>
                  <path d="M12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
                </svg>
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-[#F0EDE6]">
                {event.ticket_type === 'paid'
                  ? (event.ticket_price ? `$${event.ticket_price.toFixed(2)} per ticket` : 'Paid entry')
                  : 'Donation welcome'}
              </div>
              <div className="text-xs text-white/40 mt-0.5">
                {event.ticket_type === 'paid' ? 'Ticket required to attend' : 'Pay what you can'}
              </div>
            </div>
          </div>
        )}

        {/* Host */}
        {host && (
          <div
            className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5 mb-3 flex items-center gap-3 cursor-pointer active:opacity-80"
            onClick={() => router.push('/profile/' + host.id)}
          >
            {optimizedImgSrc(host.avatar_url, 96) ? (
              <img src={optimizedImgSrc(host.avatar_url, 96)!} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-[#E8B84B]/20"  loading="lazy" />
            ) : (
              <div className="w-10 h-10 bg-[#2A4A2A] rounded-xl flex items-center justify-center flex-shrink-0 border border-[#E8B84B]/20">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(126,200,126,0.5)" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6"/></svg>
              </div>
            )}
            <div>
              <div className="text-sm font-semibold text-[#F0EDE6]">{host.name}</div>
              <div className="text-xs text-white/45 mt-0.5">{hostEventCount} event{hostEventCount !== 1 ? 's' : ''} hosted</div>
            </div>
            <div className="ml-auto bg-[#E8B84B]/10 border border-[#E8B84B]/20 rounded-lg px-2.5 py-1 text-[9px] text-[#E8B84B]">
              Host
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5 mb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium">
              {comments.length > 0 ? `Comments · ${comments.length}` : 'Comments'}
            </div>
            <button onClick={() => commentInputRef.current?.focus()}
              className="text-[10px] text-[#E8B84B] bg-[#E8B84B]/10 border border-[#E8B84B]/20 px-2.5 py-1 rounded-lg">
              + Add
            </button>
          </div>

          {comments.length === 0 ? (
            <div className="flex items-center gap-2 py-1">
              <p className="text-xs text-white/35">No comments yet — ask a question!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map(comment => {
                const profile = (comment as any).profiles
                const isCommentHost = comment.user_id === event.host_id
                const isOwn = comment.user_id === user?.id
                return (
                  <div key={comment.id} className={'flex gap-2.5 ' + (isCommentHost ? 'rounded-xl border border-[#E8B84B]/15 bg-[#E8B84B]/5 p-2' : '')}>
                    {optimizedImgSrc(profile?.avatar_url, 96) ? (
                      <img src={optimizedImgSrc(profile?.avatar_url, 96)!} alt="" className="w-7 h-7 rounded-lg object-cover flex-shrink-0 mt-0.5"  loading="lazy" />
                    ) : (
                      <div className="w-7 h-7 bg-[#2A4A2A] rounded-lg flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                        {profile?.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-semibold text-[#F0EDE6]">{profile?.name || 'Unknown'}</span>
                        {isCommentHost && <span className="text-[8px] text-[#E8B84B] bg-[#E8B84B]/10 px-1.5 py-0.5 rounded-full">Host</span>}
                        <span className="text-[9px] text-white/25 ml-auto">{formatCommentTime(comment.created_at)}</span>
                        {(isOwn || isHost) && (
                          <button onClick={() => handleDeleteComment(comment.id)} className="text-[9px] text-white/20 hover:text-red-400">✕</button>
                        )}
                      </div>
                      <p className="text-xs text-white/60 leading-relaxed">{comment.text}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
            <input
              ref={commentInputRef}
              type="text"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePostComment()}
              placeholder="Ask a question or leave a comment..."
              maxLength={500}
              className="flex-1 bg-[#0D110D] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EDE6] placeholder-white/20 outline-none focus:border-[#E8B84B]/30"
            />
            <button
              onClick={handlePostComment}
              disabled={!commentText.trim() || postingComment}
              className="bg-[#E8B84B] text-[#0D110D] text-xs font-bold px-3 py-2 rounded-xl disabled:opacity-30 active:scale-95 transition-transform"
            >
              Post
            </button>
          </div>
        </div>

        {/* Tags */}
        {event.tags && event.tags.length > 0 && (
          <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5 mb-3">
            <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2 font-medium">Tags</div>
            <div className="flex flex-wrap gap-2">
              {event.tags.map(tag => (
                <span key={tag} className="bg-[#2A4A2A]/40 text-[#7EC87E] text-xs px-3 py-1 rounded-lg border border-[#7EC87E]/10">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Host danger zone */}
        {isHost && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full mt-2 py-3 rounded-2xl border border-red-500/20 text-red-400/70 text-sm font-medium bg-red-500/5 active:opacity-70"
          >
            Cancel & Delete Event
          </button>
        )}
      </div>

      {/* RSVP / Check-in CTA */}
      {!isHost && event && (() => {
        const nowMs = Date.now()
        const startMs = new Date(event.start_datetime).getTime()
        const endMs = new Date(event.end_datetime).getTime()
        const inCheckInWindow = rsvped && nowMs >= startMs - 30 * 60000 && nowMs < endMs
        const isFull = event.capacity > 0 && event.spots_left === 0 && !rsvped
        return (
          <div className="fixed bottom-24 left-0 right-0 px-4 pb-4 pt-4 bg-gradient-to-t from-[#0D110D] to-transparent">
            {(rsvpError || checkInError) && (
              <div className="mb-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium text-center">
                {rsvpError || checkInError}
              </div>
            )}
            {inCheckInWindow ? (
              checkedIn ? (
                <div className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 bg-[#1C241C] border border-[#7EC87E]/30 text-[#7EC87E]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Checked In
                </div>
              ) : (
                <>
                  <button onClick={handleCheckIn} disabled={checkInLoading}
                    className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 bg-[#7EC87E] text-[#0D110D] active:scale-95 transition-all disabled:opacity-60"
                    style={{ boxShadow: '0 5px 22px rgba(126,200,126,0.35)' }}>
                    {checkInLoading ? 'Getting location…' : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        I'm Here
                      </>
                    )}
                  </button>
                  {rsvped && (
                    <button onClick={() => setShowCancelRsvp(true)}
                      className="w-full mt-2 py-2 text-center text-xs text-white/30 active:opacity-70">
                      Cancel RSVP
                    </button>
                  )}
                </>
              )
            ) : (
              <button onClick={handleRsvp} disabled={rsvpLoading || isFull}
                className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 ${rsvped ? 'bg-[#1C241C] border border-[#E8B84B]/30 text-[#E8B84B] animate-rsvp-confirm' : isFull ? 'bg-[#1C241C] border border-white/10 text-white/40' : 'bg-[#E8B84B] text-[#0D110D]'}`}
                style={{ boxShadow: rsvped || isFull ? 'none' : '0 5px 22px rgba(232,184,75,0.3)' }}>
                {rsvpLoading ? (rsvped ? 'Cancelling...' : 'Joining...') : rsvped ? '✓ You\'re going · Cancel RSVP' : isFull ? 'Event Full' : event.ticket_type === 'paid' ? `Get Ticket${event.ticket_price ? ` · $${event.ticket_price.toFixed(2)}` : ''}` : event.ticket_type === 'donation' ? 'Join · Donation welcome' : `Join Event${event.spots_left > 0 && event.spots_left < 20 ? ` · ${event.spots_left} spots left` : ''}`}
              </button>
            )}
          </div>
        )
      })()}

      {/* Host manage bar */}
      {isHost && (
        <div className="fixed bottom-24 left-0 right-0 px-4 pb-4 pt-4 bg-gradient-to-t from-[#0D110D] to-transparent">
          <button onClick={() => router.push('/events/' + event.id + '/edit')}
            className="w-full py-4 rounded-2xl font-bold text-base bg-[#E8B84B] text-[#0D110D] active:scale-95 transition-all flex items-center justify-center gap-2"
            style={{boxShadow: '0 5px 22px rgba(232,184,75,0.3)'}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit Event
          </button>
        </div>
      )}

      {/* Calendar picker modal */}
      {showCalendarModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-end justify-center" onClick={() => setShowCalendarModal(false)}>
          <div className="w-full max-w-md bg-[#1C241C] rounded-t-3xl p-5 pb-10" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />
            <div className="flex items-center gap-2 justify-center mb-5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E8B84B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span className="text-[11px] text-[#E8B84B]/60 uppercase tracking-widest font-semibold">Add to Calendar</span>
            </div>
            <div className="space-y-3">
              <button onClick={handleGoogleCalendar}
                className="w-full flex items-center gap-3 bg-[#0D110D] border border-white/10 rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-transform">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#4285F4,#34A853)', boxShadow: '0 2px 8px rgba(66,133,244,0.3)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-[#F0EDE6]">Google Calendar</div>
                  <div className="text-xs text-white/35 mt-0.5">Opens in browser</div>
                </div>
                <svg className="ml-auto" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
              <button onClick={handleAppleCalendar}
                className="w-full flex items-center gap-3 bg-[#0D110D] border border-white/10 rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-transform">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#555,#1C1C1E)', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-[#F0EDE6]">Apple Calendar</div>
                  <div className="text-xs text-white/35 mt-0.5">Downloads .ics file</div>
                </div>
                <svg className="ml-auto" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel RSVP confirm sheet */}
      {showCancelRsvp && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-end justify-center" onClick={() => !rsvpLoading && setShowCancelRsvp(false)}>
          <div className="w-full max-w-md bg-[#1C241C] rounded-t-3xl p-5 pb-10" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4"></div>
            <div className="text-center mb-5">
              <h3 className="text-base font-bold text-[#F0EDE6] mb-1">Cancel your RSVP?</h3>
              <p className="text-xs text-white/40">Your spot will be released back to the event.</p>
            </div>
            <button onClick={handleConfirmCancelRsvp}
              disabled={rsvpLoading}
              className="w-full py-3.5 rounded-2xl bg-[#3A1E1E] border border-red-500/20 text-red-400 font-bold text-sm mb-3 disabled:opacity-50">
              {rsvpLoading ? 'Cancelling…' : 'Yes, Cancel RSVP'}
            </button>
            <button onClick={() => setShowCancelRsvp(false)}
              disabled={rsvpLoading}
              className="w-full py-3.5 rounded-2xl bg-[#0D110D] border border-white/10 text-white/60 font-medium text-sm">
              Keep My Spot
            </button>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-end justify-center" onClick={() => setShowDeleteConfirm(false)}>
          <div className="w-full max-w-md bg-[#1C241C] rounded-t-3xl p-5 pb-10" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4"></div>
            <div className="text-center mb-5">
              <div className="w-11 h-11 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <h3 className="text-base font-bold text-[#F0EDE6] mb-1">Cancel this event?</h3>
              <p className="text-xs text-white/40">This will remove all RSVPs and cannot be undone.</p>
            </div>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full py-3.5 rounded-2xl bg-red-500/80 text-white font-bold text-sm mb-3 disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Yes, Cancel Event'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="w-full py-3.5 rounded-2xl bg-[#0D110D] border border-white/10 text-white/60 font-medium text-sm"
            >
              Keep Event
            </button>
          </div>
        </div>
      )}

      {/* Paid ticket gate */}
      {showPaidGate && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-end justify-center" onClick={() => setShowPaidGate(false)}>
          <div className="w-full max-w-md bg-[#1C241C] rounded-t-3xl p-5 pb-10" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
            <div className="text-center mb-5">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: 'rgba(232,184,75,0.1)', border: '1px solid rgba(232,184,75,0.2)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8B84B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                </svg>
              </div>
              <h3 className="text-base font-bold text-[#F0EDE6] mb-1">Paid tickets coming soon</h3>
              <p className="text-xs text-white/40 max-w-[240px] mx-auto leading-relaxed">
                We&apos;re wiring up payments. Join the waitlist and you&apos;ll be the first to grab a ticket when it goes live.
              </p>
            </div>
            <button
              onClick={() => { setShowPaidGate(false); router.push('/waitlist') }}
              className="w-full py-3.5 rounded-2xl font-bold text-sm mb-3 text-[#0D110D]"
              style={{ background: '#E8B84B', boxShadow: '0 4px 16px rgba(232,184,75,0.25)' }}
            >
              Join the Waitlist →
            </button>
            <button
              onClick={() => setShowPaidGate(false)}
              className="w-full py-3.5 rounded-2xl bg-[#0D110D] border border-white/10 text-white/60 font-medium text-sm"
            >
              Maybe Later
            </button>
          </div>
        </div>
      )}

      {showPushPrompt && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-end justify-center" onClick={() => setShowPushPrompt(false)}>
          <div className="w-full max-w-md bg-[#1C241C] rounded-t-3xl p-5 pb-10 border-t border-white/10" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />
            <div className="flex items-start gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-[#E8B84B]/10 border border-[#E8B84B]/20 flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(232,184,75,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F0EDE6] mb-1">Stay in the loop</h3>
                <p className="text-xs text-white/45 leading-relaxed">Get notified when the host posts updates, someone waves at you, or spots fill up.</p>
              </div>
            </div>
            <button
              onClick={async () => {
                await enablePush()
                setShowPushPrompt(false)
              }}
              className="w-full bg-[#E8B84B] text-[#0D110D] font-bold text-sm py-3.5 rounded-2xl mb-3 active:scale-[0.98] transition-transform"
              style={{ boxShadow: '0 4px 16px rgba(232,184,75,0.25)' }}>
              Enable Notifications
            </button>
            <button onClick={() => setShowPushPrompt(false)}
              className="w-full bg-transparent text-white/35 text-sm py-2">
              Not now
            </button>
          </div>
        </div>
      )}

      {/* Check-in soft-confirm sheet */}
      {pendingCheckIn && event && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-end justify-center" onClick={() => setPendingCheckIn(null)}>
          <div className="w-full max-w-md bg-[#1C241C] rounded-t-3xl px-5 pt-5 pb-10 border-t border-white/10" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-5" />
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-12 h-12 bg-[#7EC87E]/10 border border-[#7EC87E]/20 rounded-2xl flex items-center justify-center mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(126,200,126,0.8)" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
              <div className="font-semibold text-[#F0EDE6] text-base mb-1">Confirm check-in</div>
              {pendingCheckIn.distanceM !== null ? (
                <p className="text-sm text-white/45 leading-relaxed">
                  You're {pendingCheckIn.distanceM >= 1000 ? `${(pendingCheckIn.distanceM / 1000).toFixed(1)}km` : `${pendingCheckIn.distanceM}m`} from {event.location_name}. Confirm you're at the venue.
                </p>
              ) : (
                <p className="text-sm text-white/45 leading-relaxed">
                  Location couldn't be verified. Confirm you're at {event.location_name}.
                </p>
              )}
            </div>
            <button
              onClick={() => commitCheckIn(pendingCheckIn.lat, pendingCheckIn.lng, pendingCheckIn.distanceM)}
              disabled={checkInLoading}
              className="w-full py-3.5 rounded-2xl bg-[#7EC87E] text-[#0D110D] font-bold text-sm active:scale-95 transition-transform disabled:opacity-50">
              {checkInLoading ? 'Checking in…' : "Yes, I'm Here"}
            </button>
            <button onClick={() => setPendingCheckIn(null)}
              className="w-full mt-2.5 py-2.5 text-white/35 text-sm text-center">
              Cancel
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </FadeIn>
  )
}
