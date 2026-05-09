'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { EventDetailSkeleton } from '@/components/Skeleton'
import MysteryMatchCard from '@/components/MysteryMatchCard'

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
  const commentInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    params.then(({ id }) => {
      setEventId(id)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) { router.push('/auth'); return }
        setUser(session.user)
        fetchEvent(id, session.user.id)
      })
    })
  }, [])

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
        if (data) setComments(prev => [...prev, data as any])
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
        const { data } = await supabase
          .from('rsvps')
          .select('user_id, profiles(id, name, avatar_url)')
          .eq('event_id', eventId)
          .limit(12)
        if (data) setAttendees(data as any)
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'rsvps',
        filter: 'event_id=eq.' + eventId,
      }, async (payload) => {
        setTotalAttendees(prev => Math.max(0, prev - 1))
        const { data } = await supabase
          .from('rsvps')
          .select('user_id, profiles(id, name, avatar_url)')
          .eq('event_id', eventId)
          .limit(12)
        if (data) setAttendees(data as any)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(commentChannel)
      supabase.removeChannel(rsvpChannel)
    }
  }, [eventId])

  const fetchEvent = async (id: string, userId: string) => {
    const { data: eventData } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()

    if (!eventData) { router.push('/home'); return }
    setEvent(eventData)

    try {
      const RECENTLY_VIEWED_KEY = 'gathr_recently_viewed'
      const stored = localStorage.getItem(RECENTLY_VIEWED_KEY)
      const viewed = stored ? JSON.parse(stored) : []
      const updated = [eventData, ...viewed.filter((e: any) => e.id !== eventData.id)].slice(0, 10)
      localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated))
    } catch {}

    const [hostRes, rsvpRes, attendeesRes, countRes, commentsRes, hostCountRes, bookmarkRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', eventData.host_id).single(),
      supabase.from('rsvps').select('id').eq('event_id', id).eq('user_id', userId).single(),
      supabase.from('rsvps').select('user_id, profiles(id, name, avatar_url)').eq('event_id', id).limit(12),
      supabase.from('rsvps').select('*', { count: 'exact', head: true }).eq('event_id', id),
      supabase.from('event_comments').select('id, user_id, text, created_at, profiles(id, name, avatar_url)').eq('event_id', id).order('created_at', { ascending: true }).limit(100),
      supabase.from('events').select('*', { count: 'exact', head: true }).eq('host_id', eventData.host_id),
      supabase.from('event_bookmarks').select('id').eq('event_id', id).eq('user_id', userId).single(),
    ])

    if (hostRes.data) setHost(hostRes.data)
    if (hostCountRes.count !== null) setHostEventCount(hostCountRes.count)
    if (rsvpRes.data) setRsvped(true)
    if (attendeesRes.data) setAttendees(attendeesRes.data as any)
    if (countRes.count !== null) setTotalAttendees(countRes.count)
    if (commentsRes.data) setComments(commentsRes.data as any)
    if (bookmarkRes.data) setBookmarked(true)
    if (eventData.invite_code) setInviteCode(eventData.invite_code)

    if (eventData.visibility === 'private' && eventData.host_id !== userId && !rsvpRes.data) {
      const inviteParam = new URLSearchParams(window.location.search).get('invite')
      if (inviteParam !== eventData.invite_code) {
        setBlocked(true)
        setLoading(false)
        return
      }
    }

    setLoading(false)

    const endTime = new Date(eventData.end_datetime).getTime()
    const nowMs = Date.now()
    if (rsvpRes.data && endTime > nowMs - 48 * 3600000) {
      fetchMatches(id, userId)
    }
  }

  const handleRsvp = async () => {
    if (!user || !event) return
    setRsvpLoading(true)
    if (rsvped) {
      await supabase.from('rsvps').delete()
        .eq('event_id', event.id).eq('user_id', user.id)
      setRsvped(false)
      setTotalAttendees(prev => Math.max(0, prev - 1))
      setAttendees(prev => prev.filter(a => a.user_id !== user.id))
    } else {
      await supabase.from('rsvps').insert({
        event_id: event.id, user_id: user.id, status: 'joined'
      })
      setRsvped(true)
      setTotalAttendees(prev => prev + 1)
      const { data } = await supabase
        .from('rsvps')
        .select('user_id, profiles(id, name, avatar_url)')
        .eq('event_id', event.id)
        .limit(12)
      if (data) setAttendees(data as any)
      if (event.host_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: event.host_id,
          actor_id: user.id,
          type: 'rsvp',
          title: 'is going to your event',
          body: event.title,
          link: '/events/' + event.id,
          read: false,
        })
      }
    }
    setRsvpLoading(false)
  }

  const handleBookmark = async () => {
    if (!user || !event) return
    if (bookmarked) {
      await supabase.from('event_bookmarks').delete().eq('event_id', event.id).eq('user_id', user.id)
      setBookmarked(false)
    } else {
      await supabase.from('event_bookmarks').insert({ event_id: event.id, user_id: user.id })
      setBookmarked(true)
    }
  }

  const fetchMatches = async (evtId: string, userId: string) => {
    const { data: rsvpData } = await supabase
      .from('rsvps')
      .select('user_id')
      .eq('event_id', evtId)
      .neq('user_id', userId)

    if (!rsvpData || rsvpData.length === 0) return

    const attendeeIds = rsvpData.map((r: any) => r.user_id)

    const [profilesRes, myProfileRes, connectionsRes, myWavesRes, incomingWavesRes] = await Promise.all([
      supabase.from('profiles').select('id, name, avatar_url, interests, bio_social, attended_count, safety_tier, review_count').in('id', attendeeIds).eq('matching_enabled', true),
      supabase.from('profiles').select('interests, gathr_plus').eq('id', userId).single(),
      supabase.from('connections').select('requester_id, addressee_id, status').or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
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
    setIsGathrPlus(myProfileRes.data?.gathr_plus || false)
    setWavedIds(new Set((myWavesRes.data || []).map((w: any) => w.receiver_id)))
    const mutualIds = new Set((incomingWavesRes.data || []).filter((w: any) => w.is_mutual).map((w: any) => w.sender_id))
    setMutualWaveIds(mutualIds)
    setIncomingWaveCount((incomingWavesRes.data || []).length)
  }

  const handleWave = async (receiverId: string) => {
    if (!user || !event) return
    const { data } = await supabase.from('waves').insert({
      sender_id: user.id,
      receiver_id: receiverId,
      event_id: eventId,
    }).select().single()
    if (data) {
      setWavedIds(prev => new Set([...prev, receiverId]))
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

  const handleMatchConnect = async (e: React.MouseEvent, personId: string) => {
    e.stopPropagation()
    if (!user || matchConnLoading) return
    setMatchConnLoading(personId)
    const { data } = await supabase.from('connections').insert({
      requester_id: user.id,
      addressee_id: personId,
    }).select().single()
    if (data) {
      setMatchConnStatuses(prev => ({ ...prev, [personId]: 'pending' }))
      await supabase.from('notifications').insert({
        user_id: personId,
        actor_id: user.id,
        type: 'connection_request',
        title: 'wants to connect with you',
        body: "You're both going to the same event.",
        link: '/profile/' + user.id,
        read: false,
      })
    }
    setMatchConnLoading(null)
  }

  const handleDelete = async () => {
    if (!event) return
    setDeleting(true)
    await Promise.all([
      supabase.from('rsvps').delete().eq('event_id', event.id),
      supabase.from('event_bookmarks').delete().eq('event_id', event.id),
      supabase.from('event_comments').delete().eq('event_id', event.id),
      supabase.from('waves').delete().eq('event_id', event.id),
    ])
    await supabase.from('events').delete().eq('id', event.id)
    router.push('/home')
  }

  const handlePostComment = async () => {
    const trimmed = commentText.trim()
    if (!trimmed || !user || !eventId || postingComment) return
    setPostingComment(true)
    setCommentText('')
    const { data: newComment, error } = await supabase
      .from('event_comments')
      .insert({ event_id: eventId, user_id: user.id, text: trimmed })
      .select('id, user_id, text, created_at, profiles(id, name, avatar_url)')
      .single()
    if (!error && newComment) {
      setComments(prev => prev.some(c => c.id === (newComment as any).id) ? prev : [...prev, newComment as any])
    } else if (error) {
      setCommentText(trimmed)
    }
    setPostingComment(false)
  }

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from('event_comments').delete().eq('id', commentId)
    setComments(prev => prev.filter(c => c.id !== commentId))
  }

  const handleCopyInvite = async () => {
    const url = window.location.origin + '/events/' + event?.id + '?invite=' + inviteCode
    await navigator.clipboard.writeText(url)
    setInviteCopied(true)
    setTimeout(() => setInviteCopied(false), 2000)
  }

  const handleShare = async () => {
    const url = window.location.href
    const shareData = { title: event?.title || 'Gathr Event', text: event?.description || 'Check out this event on Gathr!', url }
    if (navigator.share) {
      try { await navigator.share(shareData) } catch {}
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
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
      location: [event.location_name, event.location_address].filter(Boolean).join(', '),
    })
    window.open('https://calendar.google.com/calendar/render?' + p.toString(), '_blank')
    setShowCalendarModal(false)
  }

  const handleAppleCalendar = () => {
    if (!event) return
    const fmt = (dt: string) => new Date(dt).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'DTSTART:' + fmt(event.start_datetime),
      'DTEND:' + fmt(event.end_datetime),
      'SUMMARY:' + event.title,
      'DESCRIPTION:' + (event.description || '').replace(/\n/g, '\\n'),
      'LOCATION:' + [event.location_name, event.location_address].filter(Boolean).join(', '),
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

  const formatDate = (dt: string) => new Date(dt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const formatTime = (dt: string) => new Date(dt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
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
      <div className="w-16 h-16 bg-[#1C241C] border border-white/10 rounded-2xl flex items-center justify-center text-3xl mb-2">🔒</div>
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
    <div className="min-h-screen bg-[#0D110D] flex flex-col">

      {/* Hero */}
      <div className="relative h-52 flex items-center justify-center text-6xl flex-shrink-0"
        style={{background: 'linear-gradient(135deg,#1E3A1E,#2A1A0E)'}}>
        {(event as any).cover_url && (
          <img src={(event as any).cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D110D] via-transparent to-transparent"></div>
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 z-10">
          <button onClick={() => router.back()}
            className="w-9 h-9 bg-[#0D110D]/70 border border-white/15 rounded-xl flex items-center justify-center text-[#F0EDE6]">
            {'←'}
          </button>
          <div className="flex gap-2">
            {isHost && (
              <button onClick={() => router.push('/events/' + event.id + '/edit')}
                className="w-9 h-9 bg-[#E8B84B]/20 border border-[#E8B84B]/30 rounded-xl flex items-center justify-center text-sm">
                ✏️
              </button>
            )}
            {isHost && (event.visibility === 'private' || event.visibility === 'unlisted') && inviteCode && (
              <button onClick={handleCopyInvite} className={'w-9 h-9 bg-[#0D110D]/70 border rounded-xl flex items-center justify-center text-base transition-colors ' + (inviteCopied ? 'border-[#7EC87E]/40 text-[#7EC87E]' : 'border-[#E8B84B]/30')}>
                {inviteCopied ? '✓' : '🔗'}
              </button>
            )}
            <button onClick={handleShare} className={'w-9 h-9 bg-[#0D110D]/70 border rounded-xl flex items-center justify-center text-base transition-colors ' + (copied ? 'border-[#7EC87E]/40 text-[#7EC87E]' : 'border-white/15')}>
              {copied ? '✓' : '↑'}
            </button>
            <button onClick={handleBookmark} className={'w-9 h-9 border rounded-xl flex items-center justify-center text-base transition-all ' + (bookmarked ? 'bg-[#E8B84B]/20 border-[#E8B84B]/40' : 'bg-[#0D110D]/70 border-white/15')}>🔖</button>
          </div>
        </div>
        <span className="relative z-5">
          {event.category === 'Music' ? '🎸' : event.category === 'Fitness' ? '🏃' : event.category === 'Food & Drink' ? '🍺' : event.category === 'Tech' ? '💻' : event.category === 'Outdoors' ? '🥾' : event.category === 'Arts & Culture' ? '🎨' : '🎉'}
        </span>
        <div className="absolute bottom-3 left-4 flex gap-2 z-10">
          {event.is_featured && <span className="bg-[#E8B84B] text-[#0D110D] text-[9px] font-bold px-2 py-0.5 rounded-full">Featured</span>}
          <span className="bg-[#0E1E0E]/90 text-[#7EC87E] text-[9px] px-2 py-0.5 rounded-full border border-[#7EC87E]/20">◉ {event.visibility}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-40">

        <h1 className="font-bold text-[#F0EDE6] text-lg leading-snug mb-4" style={{fontFamily:'sans-serif'}}>
          {event.title}
        </h1>

        {/* Date + Location */}
        <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5 mb-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 bg-[#1E3A1E] rounded-lg flex items-center justify-center text-xs flex-shrink-0">📅</div>
            <div>
              <div className="text-sm font-medium text-[#F0EDE6]">{formatDate(event.start_datetime)}</div>
              <div className="text-xs text-white/45">{formatTime(event.start_datetime)} – {formatTime(event.end_datetime)}</div>
            </div>
            <button onClick={handleAddToCalendar} className="ml-auto bg-[#1E3A1E] border border-[#E8B84B]/20 rounded-lg px-2.5 py-1 text-[10px] text-[#E8B84B] active:scale-95 transition-transform">
              + Calendar
            </button>
          </div>
          <button onClick={handleOpenMaps} className="flex items-center gap-3 w-full text-left active:opacity-70 transition-opacity">
            <div className="w-7 h-7 bg-[#1E3A1E] rounded-lg flex items-center justify-center text-xs flex-shrink-0">📍</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[#F0EDE6]">{event.location_name}</div>
              <div className="text-xs text-white/45">{event.location_address || event.city}</div>
            </div>
            <span className="text-[10px] text-[#E8B84B] bg-[#E8B84B]/10 border border-[#E8B84B]/15 px-2 py-1 rounded-lg flex-shrink-0">Open →</span>
          </button>
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
            <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium">
              {totalAttendees > 0 ? `${totalAttendees} Going` : 'Attendees'}
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
              <div className="text-2xl">👋</div>
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
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover border border-white/10" />
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
                <p className="text-[10px] text-white/30 leading-relaxed">
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
                  <span className="text-xl flex-shrink-0">👋</span>
                  <div className="flex-1">
                    <div className="text-[10px] font-semibold text-[#E8B84B]">
                      {incomingWaveCount === 1 ? 'Someone is curious about meeting you' : `${incomingWaveCount} people are curious about meeting you`}
                      {mutualWaveIds.size > 0 && (
                        <span className="ml-1.5 text-[#7EC87E]">· {mutualWaveIds.size} mutual 🔁</span>
                      )}
                    </div>
                    <div className="text-[9px] text-white/30 mt-0.5">
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
                    onHi={id => handleMatchConnect({ stopPropagation: () => {} } as React.MouseEvent, id)}
                    onWave={handleWave}
                    onNavigate={path => router.push(path)}
                    isPostEvent={isPostEvent}
                  />
                ))}
              </div>

              {/* Gathr+ upsell — free users on upcoming events with hidden matches */}
              {eventState === 'upcoming' && !isGathrPlus && hiddenCount > 0 && (
                <div className="mt-3.5 bg-[#E8B84B]/5 border border-[#E8B84B]/15 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-bold text-[#E8B84B]">✦ Gathr+</span>
                    <span className="text-[9px] text-white/25">unlock before the event</span>
                  </div>
                  <p className="text-[9px] text-white/35 mb-2 leading-relaxed">
                    See {hiddenCount} more {hiddenCount === 1 ? 'match' : 'matches'}, partial names, shared interests, and send waves before you arrive.
                  </p>
                  <button onClick={() => router.push('/gathr-plus')} className="text-[10px] text-[#E8B84B] font-semibold">
                    Learn more →
                  </button>
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
            <div className="w-9 h-9 bg-[#E8B84B]/10 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
              {event.ticket_type === 'paid' ? '🎟' : '🎁'}
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
            {host.avatar_url ? (
              <img src={host.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-[#E8B84B]/20" />
            ) : (
              <div className="w-10 h-10 bg-[#2A4A2A] rounded-xl flex items-center justify-center text-lg flex-shrink-0 border border-[#E8B84B]/20">
                🧑‍💻
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
              <div className="text-2xl">💬</div>
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
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-lg object-cover flex-shrink-0 mt-0.5" />
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

      {/* RSVP CTA */}
      {!isHost && (
        <div className="fixed bottom-24 left-0 right-0 px-4 pb-4 pt-4 bg-gradient-to-t from-[#0D110D] to-transparent">
          {(() => {
            const isFull = event.capacity > 0 && event.spots_left === 0 && !rsvped
            return (
              <button onClick={handleRsvp} disabled={rsvpLoading || isFull}
                className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 ${rsvped ? 'bg-[#1C241C] border border-[#E8B84B]/30 text-[#E8B84B]' : isFull ? 'bg-[#1C241C] border border-white/10 text-white/40' : 'bg-[#E8B84B] text-[#0D110D]'}`}
                style={{boxShadow: rsvped || isFull ? 'none' : '0 5px 22px rgba(232,184,75,0.3)'}}>
                {rsvpLoading ? 'Loading...' : rsvped ? '✓ You\'re going · Cancel RSVP' : isFull ? '🚫 Event Full' : event.ticket_type === 'paid' ? `🎟 Get Ticket${event.ticket_price ? ` · $${event.ticket_price.toFixed(2)}` : ''}` : event.ticket_type === 'donation' ? '🎁 Join · Donation welcome' : `Join Event${event.spots_left > 0 && event.spots_left < 20 ? ` · ${event.spots_left} spots left` : ''}`}
              </button>
            )
          })()}
        </div>
      )}

      {/* Host manage bar */}
      {isHost && (
        <div className="fixed bottom-24 left-0 right-0 px-4 pb-4 pt-4 bg-gradient-to-t from-[#0D110D] to-transparent">
          <button onClick={() => router.push('/events/' + event.id + '/edit')}
            className="w-full py-4 rounded-2xl font-bold text-base bg-[#E8B84B] text-[#0D110D] active:scale-95 transition-all"
            style={{boxShadow: '0 5px 22px rgba(232,184,75,0.3)'}}>
            ✏️ Edit Event
          </button>
        </div>
      )}

      {/* Calendar picker modal */}
      {showCalendarModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-end justify-center" onClick={() => setShowCalendarModal(false)}>
          <div className="w-full max-w-md bg-[#1C241C] rounded-t-3xl p-5 pb-10" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5"></div>
            <div className="text-xs text-white/30 uppercase tracking-widest mb-4 text-center font-medium">Add to Calendar</div>
            <div className="space-y-3">
              <button onClick={handleGoogleCalendar}
                className="w-full flex items-center gap-3 bg-[#0D110D] border border-white/10 rounded-2xl px-4 py-3.5 active:opacity-70">
                <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-lg flex-shrink-0">📅</div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-[#F0EDE6]">Google Calendar</div>
                  <div className="text-xs text-white/35 mt-0.5">Opens in browser</div>
                </div>
              </button>
              <button onClick={handleAppleCalendar}
                className="w-full flex items-center gap-3 bg-[#0D110D] border border-white/10 rounded-2xl px-4 py-3.5 active:opacity-70">
                <div className="w-9 h-9 rounded-xl bg-[#1C1C1E] border border-white/10 flex items-center justify-center text-lg flex-shrink-0">🗓</div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-[#F0EDE6]">Apple Calendar</div>
                  <div className="text-xs text-white/35 mt-0.5">Downloads .ics file</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-end justify-center" onClick={() => setShowDeleteConfirm(false)}>
          <div className="w-full max-w-md bg-[#1C241C] rounded-t-3xl p-5 pb-10" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4"></div>
            <div className="text-center mb-5">
              <div className="text-3xl mb-3">⚠️</div>
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

      <BottomNav />
    </div>
  )
}
