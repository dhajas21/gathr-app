'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Attendee {
  user_id: string
  profiles: {
    id: string
    name: string
    avatar_url: string | null
    bio_social: string | null
    city: string | null
    rsvp_visibility: string | null
  }
}

export default function AttendeesPage({ params }: { params: Promise<{ id: string }> }) {
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [eventTitle, setEventTitle] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState('')
  const [connectionIds, setConnectionIds] = useState<string[]>([])
  const [isHost, setIsHost] = useState(false)
  const router = useRouter()

  useEffect(() => {
    params.then(({ id }) => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) { router.push('/auth'); return }
        setCurrentUserId(session.user.id)
        fetchAll(id, session.user.id)
      })
    })
  }, [])

  const fetchAll = async (eventId: string, userId: string) => {
    const [eventRes, rsvpsRes, countRes, connRes] = await Promise.all([
      supabase.from('events').select('title, host_id').eq('id', eventId).single(),
      supabase.from('rsvps').select('user_id, profiles(id, name, avatar_url, bio_social, city, rsvp_visibility)').eq('event_id', eventId),
      supabase.from('rsvps').select('*', { count: 'exact', head: true }).eq('event_id', eventId),
      supabase.from('connections')
        .select('requester_id, addressee_id')
        .or('requester_id.eq.' + userId + ',addressee_id.eq.' + userId)
        .eq('status', 'accepted'),
    ])

    if (eventRes.data) {
      setEventTitle(eventRes.data.title)
      setIsHost(eventRes.data.host_id === userId)
    }
    if (countRes.count !== null) setTotalCount(countRes.count)
    if (connRes.data) {
      setConnectionIds(connRes.data.map((c: any) => c.requester_id === userId ? c.addressee_id : c.requester_id))
    }
    if (rsvpsRes.data) setAttendees(rsvpsRes.data as any)
    setLoading(false)
  }

  const isVisible = (attendee: Attendee) => {
    const profile = attendee.profiles
    if (!profile) return false
    if (attendee.user_id === currentUserId) return true
    if (isHost) return true
    const vis = profile.rsvp_visibility || 'public'
    if (vis === 'public') return true
    if (vis === 'connections') return connectionIds.includes(attendee.user_id)
    return false
  }

  const visibleAttendees = attendees.filter(isVisible)
  const hiddenCount = totalCount - visibleAttendees.length

  if (loading) return (
    <div className="min-h-screen bg-[#0D110D] flex items-center justify-center">
      <div className="text-[#E8B84B] text-2xl font-bold">Gathr.</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0D110D] pb-10">
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 border-b border-white/10">
        <button onClick={() => router.back()}
          className="w-9 h-9 bg-[#1C241C] border border-white/10 rounded-xl flex items-center justify-center text-[#F0EDE6]">←</button>
        <div>
          <h1 className="text-base font-bold text-[#F0EDE6]">Attendees</h1>
          <p className="text-[10px] text-white/35 mt-0.5 truncate max-w-[220px]">{eventTitle}</p>
        </div>
        <span className="ml-auto text-xs text-white/30">{totalCount} going</span>
      </div>

      <div className="px-4 pt-4 space-y-2">
        {visibleAttendees.map(a => {
          const profile = a.profiles
          if (!profile) return null
          const isMe = a.user_id === currentUserId
          return (
            <div key={a.user_id}
              onClick={() => router.push('/profile/' + profile.id)}
              className="flex items-center gap-3 bg-[#1C241C] border border-white/10 rounded-2xl p-3 cursor-pointer active:scale-[0.98] transition-transform">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-11 h-11 bg-[#2A4A2A] rounded-xl flex items-center justify-center text-lg flex-shrink-0 border border-white/10">
                  {profile.name?.charAt(0) || '?'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-[#F0EDE6] truncate">{profile.name}</span>
                  {isMe && <span className="text-[9px] bg-[#E8B84B]/10 text-[#E8B84B] border border-[#E8B84B]/20 px-1.5 py-0.5 rounded-full flex-shrink-0">You</span>}
                </div>
                {profile.bio_social ? (
                  <div className="text-xs text-white/40 mt-0.5 truncate">{profile.bio_social}</div>
                ) : profile.city ? (
                  <div className="text-xs text-white/40 mt-0.5">📍 {profile.city}</div>
                ) : null}
              </div>
              <span className="text-white/20 text-sm flex-shrink-0">›</span>
            </div>
          )
        })}

        {hiddenCount > 0 && (
          <div className="flex items-center gap-3 bg-[#1C241C] border border-white/10 rounded-2xl p-3">
            <div className="w-11 h-11 bg-[#1A2A1A] rounded-xl flex items-center justify-center text-lg flex-shrink-0 border border-white/10">🔒</div>
            <div>
              <div className="text-sm font-medium text-white/50">{hiddenCount} private attendee{hiddenCount !== 1 ? 's' : ''}</div>
              <div className="text-xs text-white/25 mt-0.5">Their profiles are hidden</div>
            </div>
          </div>
        )}

        {visibleAttendees.length === 0 && hiddenCount === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="text-4xl">👋</div>
            <p className="text-white/40 text-sm">No attendees yet</p>
            <p className="text-white/25 text-xs text-center max-w-[200px]">Be the first to RSVP to this event!</p>
          </div>
        )}
      </div>
    </div>
  )
}
