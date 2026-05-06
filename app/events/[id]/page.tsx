'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'

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
    const channel = supabase
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
    return () => { supabase.removeChannel(channel) }
  }, [eventId])

  const fetchEvent = async (id: string, userId: string) => {
    const { data: eventData } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()

    if (!eventData) { router.push('/home'); return }
    setEvent(eventData)

    // Save to recently viewed
    try {
      const RECENTLY_VIEWED_KEY = 'gathr_recently_viewed'
      const stored = localStorage.getItem(RECENTLY_VIEWED_KEY)
      const viewed = stored ? JSON.parse(stored) : []
      const updated = [eventData, ...viewed.filter((e: any) => e.id !== eventData.id)].slice(0, 10)
      localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated))
    } catch {}
    
    const [hostRes, rsvpRes, attendeesRes, countRes, commentsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', eventData.host_id).single(),
      supabase.from('rsvps').select('id').eq('event_id', id).eq('user_id', userId).single(),
      supabase.from('rsvps').select('user_id, profiles(id, name, avatar_url)').eq('event_id', id).limit(12),
      supabase.from('rsvps').select('*', { count: 'exact', head: true }).eq('event_id', id),
      supabase.from('event_comments').select('id, user_id, text, created_at, profiles(id, name, avatar_url)').eq('event_id', id).order('created_at', { ascending: true }),
    ])

    if (hostRes.data) setHost(hostRes.data)
    if (rsvpRes.data) setRsvped(true)
    if (attendeesRes.data) setAttendees(attendeesRes.data as any)
    if (countRes.count !== null) setTotalAttendees(countRes.count)
    if (commentsRes.data) setComments(commentsRes.data as any)

    setLoading(false)
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
    }
    setRsvpLoading(false)
  }

  const handleDelete = async () => {
    if (!event) return
    setDeleting(true)
    await supabase.from('rsvps').delete().eq('event_id', event.id)
    await supabase.from('events').delete().eq('id', event.id)
    router.push('/home')
  }

  const handlePostComment = async () => {
    const trimmed = commentText.trim()
    if (!trimmed || !user || !eventId || postingComment) return
    setPostingComment(true)
    setCommentText('')
    await supabase.from('event_comments').insert({
      event_id: eventId,
      user_id: user.id,
      text: trimmed,
    })
    setPostingComment(false)
  }

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from('event_comments').delete().eq('id', commentId)
    setComments(prev => prev.filter(c => c.id !== commentId))
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

  if (loading) return (
    <div className="min-h-screen bg-[#0D110D] flex items-center justify-center">
      <div className="text-[#E8B84B] text-2xl font-bold">Gathr.</div>
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
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D110D] via-transparent to-transparent"></div>
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 z-10">
          <button onClick={() => router.back()}
            className="w-9 h-9 bg-[#0D110D]/70 border border-white/15 rounded-xl flex items-center justify-center text-[#F0EDE6]">
            ←
          </button>
          <div className="flex gap-2">
            {isHost && (
              <button onClick={() => router.push('/events/' + event.id + '/edit')}
                className="w-9 h-9 bg-[#E8B84B]/20 border border-[#E8B84B]/30 rounded-xl flex items-center justify-center text-sm">
                ✏️
              </button>
            )}
            <button className="w-9 h-9 bg-[#0D110D]/70 border border-white/15 rounded-xl flex items-center justify-center text-base">↑</button>
            <button className="w-9 h-9 bg-[#0D110D]/70 border border-white/15 rounded-xl flex items-center justify-center text-base">🔖</button>
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
            <button className="ml-auto bg-[#1E3A1E] border border-[#E8B84B]/20 rounded-lg px-2.5 py-1 text-[10px] text-[#E8B84B]">
              + Calendar
            </button>
          </div>
          <div className="border-t border-white/10 my-2.5"></div>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-[#1E3A1E] rounded-lg flex items-center justify-center text-xs flex-shrink-0">📍</div>
            <div>
              <div className="text-sm font-medium text-[#F0EDE6]">{event.location_name}</div>
              <div className="text-xs text-white/45">{event.location_address || event.city}</div>
            </div>
          </div>
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
            {totalAttendees > 12 && (
              <span className="text-[10px] text-[#E8B84B]">+{totalAttendees - 12} more</span>
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
              <div className="text-xs text-white/45 mt-0.5">{host.hosted_count} events hosted</div>
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
                        {isOwn && (
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
        <div className="fixed bottom-16 left-0 right-0 px-4 pb-4 pt-4 bg-gradient-to-t from-[#0D110D] to-transparent">
          <button onClick={handleRsvp} disabled={rsvpLoading}
            className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 ${rsvped ? 'bg-[#1C241C] border border-[#E8B84B]/30 text-[#E8B84B]' : 'bg-[#E8B84B] text-[#0D110D]'}`}
            style={{boxShadow: rsvped ? 'none' : '0 5px 22px rgba(232,184,75,0.3)'}}>
            {rsvpLoading ? 'Loading...' : rsvped ? '✓ You\'re going · Cancel RSVP' : `Join Event${event.spots_left > 0 && event.spots_left < 20 ? ` · ${event.spots_left} spots left` : ''}`}
          </button>
        </div>
      )}

      {/* Host manage bar */}
      {isHost && (
        <div className="fixed bottom-16 left-0 right-0 px-4 pb-4 pt-4 bg-gradient-to-t from-[#0D110D] to-transparent">
          <button onClick={() => router.push('/events/' + event.id + '/edit')}
            className="w-full py-4 rounded-2xl font-bold text-base bg-[#E8B84B] text-[#0D110D] active:scale-95 transition-all"
            style={{boxShadow: '0 5px 22px rgba(232,184,75,0.3)'}}>
            ✏️ Edit Event
          </button>
        </div>
      )}

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center" onClick={() => setShowDeleteConfirm(false)}>
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