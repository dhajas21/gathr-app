'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import SafetyBadge from '@/components/SafetyBadge'

export default function AttendeesPage({ params }: { params: Promise<{ id: string }> }) {
  const [user, setUser] = useState<any>(null)
  const [event, setEvent] = useState<any>(null)
  const [attendees, setAttendees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isHost, setIsHost] = useState(false)
  const [connectionIds, setConnectionIds] = useState<Set<string>>(new Set())
  const router = useRouter()

  useEffect(() => {
    params.then(({ id }) => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) { router.push('/auth'); return }
        setUser(session.user)
        fetchData(id, session.user.id)
      })
    })
  }, [params, router])

  const fetchData = async (eventId: string, userId: string) => {
    const { data: eventData } = await supabase
      .from('events').select('id, title, visibility, host_id').eq('id', eventId).single()
    if (!eventData) { router.push('/home'); return }
    setEvent(eventData)

    const host = eventData.host_id === userId
    setIsHost(host)

    if (!host && (eventData.visibility === 'private' || eventData.visibility === 'unlisted')) {
      setLoading(false)
      return
    }

    const [rsvpRes, connRes] = await Promise.all([
      supabase.from('rsvps')
        .select('user_id, profiles(id, name, avatar_url, rsvp_visibility, safety_tier, review_count)')
        .eq('event_id', eventId),
      supabase.from('connections')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
    ])

    const connectedIds = new Set<string>()
    connRes.data?.forEach((c: any) => {
      connectedIds.add(c.requester_id === userId ? c.addressee_id : c.requester_id)
    })
    setConnectionIds(connectedIds)

    if (rsvpRes.data) {
      const filtered = rsvpRes.data.filter((r: any) => {
        if (host) return true
        if (r.user_id === userId) return true
        const vis = r.profiles?.rsvp_visibility || 'public'
        if (vis === 'public') return true
        if (vis === 'connections') return connectedIds.has(r.user_id)
        return false
      })
      setAttendees(filtered)
    }

    setLoading(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0D110D] pb-10">
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 border-b border-white/10">
        <div className="w-9 h-9 bg-white/[0.07] rounded-xl animate-pulse flex-shrink-0" />
        <div className="h-5 w-40 bg-white/[0.07] rounded-xl animate-pulse" />
      </div>
      <div className="px-4 pt-4 space-y-3">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="flex items-center gap-3 py-2">
            <div className="w-10 h-10 bg-white/[0.07] rounded-xl animate-pulse flex-shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 w-32 bg-white/[0.07] rounded-xl animate-pulse" />
              <div className="h-3 w-20 bg-white/[0.05] rounded-xl animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0D110D] pb-10">
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 border-b border-white/10">
        <button onClick={() => router.back()}
          className="w-9 h-9 bg-[#1C241C] border border-white/10 rounded-xl flex items-center justify-center text-[#F0EDE6]">
          ←
        </button>
        <div>
          <h1 className="font-bold text-[#F0EDE6] text-lg">Who's going</h1>
          {event && <p className="text-xs text-white/40 mt-0.5 truncate max-w-[220px]">{event.title}</p>}
        </div>
        <span className="ml-auto text-xs text-white/30">{attendees.length} attendee{attendees.length !== 1 ? 's' : ''}</span>
      </div>

      {!isHost && (event?.visibility === 'private' || event?.visibility === 'unlisted') ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 px-4 text-center">
          <div className="text-4xl">🔒</div>
          <p className="text-white/40 text-sm">Attendee list is only visible to the host</p>
        </div>
      ) : attendees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 px-4 text-center">
          <div className="text-4xl">👋</div>
          <p className="text-white/40 text-sm">No attendees yet — be the first!</p>
        </div>
      ) : (
        <div className="px-4 py-3 divide-y divide-white/[0.06]">
          {isHost && attendees.some(r => r.profiles?.rsvp_visibility !== 'public') && (
            <div className="flex items-center gap-2 bg-[#1C241C] border border-white/[0.06] rounded-xl px-3 py-2 mb-3 text-[10px] text-white/30">
              <span className="flex-shrink-0">ℹ️</span>
              <span>🔒 Hidden from others &nbsp;·&nbsp; 🤝 Connections only &nbsp;·&nbsp; Visible to you as host</span>
            </div>
          )}
          {attendees.map((r: any) => {
            const profile = r.profiles
            const isSelf = r.user_id === user?.id
            const canLink = isHost || isSelf || connectionIds.has(r.user_id)
            return (
              <div key={r.user_id}
                onClick={() => canLink && router.push('/profile/' + r.user_id)}
                className={'flex items-center gap-3 py-3 ' + (canLink ? 'cursor-pointer active:opacity-70' : '')}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 bg-[#1E3A1E] rounded-xl flex items-center justify-center text-base flex-shrink-0">
                    {profile?.name?.charAt(0) || '?'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium text-[#F0EDE6] truncate">
                      {profile?.name || 'Unknown'}
                      {isSelf && <span className="text-[10px] text-white/30 ml-1.5">· You</span>}
                    </span>
                    <SafetyBadge tier={profile?.safety_tier || 'new'} reviewCount={profile?.review_count} size="sm" />
                  </div>
                  {isHost && profile?.rsvp_visibility === 'private' && (
                    <div className="text-[10px] text-white/30 mt-0.5">🔒 Hidden from other attendees</div>
                  )}
                  {isHost && profile?.rsvp_visibility === 'connections' && (
                    <div className="text-[10px] text-white/30 mt-0.5">🤝 Visible to connections only</div>
                  )}
                </div>
                {canLink && <span className="text-white/20 text-sm flex-shrink-0">›</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
