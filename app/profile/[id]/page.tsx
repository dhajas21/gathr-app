'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'

export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [hostedEvents, setHostedEvents] = useState<any[]>([])
  const [attendedEvents, setAttendedEvents] = useState<any[]>([])
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null)
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [mutualCount, setMutualCount] = useState(0)
  const [mutualProfiles, setMutualProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [profileId, setProfileId] = useState('')
  const [activeTab, setActiveTab] = useState<'hosting' | 'going'>('hosting')
  const router = useRouter()

  useEffect(() => {
    params.then(({ id }) => {
      setProfileId(id)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) { router.push('/auth'); return }
        if (session.user.id === id) { router.push('/profile'); return }
        setUser(session.user)
        fetchProfile(id, session.user.id)
      })
    })
  }, [])

  const fetchProfile = async (id: string, userId: string) => {
    const [profileRes, hostedRes, connectionRes, myConnsRes, theirConnsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('events').select('*').eq('host_id', id).eq('visibility', 'public').order('start_datetime', { ascending: false }).limit(10),
      supabase.from('connections').select('*')
        .or('and(requester_id.eq.' + userId + ',addressee_id.eq.' + id + '),and(requester_id.eq.' + id + ',addressee_id.eq.' + userId + ')')
        .limit(1).single(),
      supabase.from('connections').select('requester_id, addressee_id').or('requester_id.eq.' + userId + ',addressee_id.eq.' + userId).eq('status', 'accepted'),
      supabase.from('connections').select('requester_id, addressee_id').or('requester_id.eq.' + id + ',addressee_id.eq.' + id).eq('status', 'accepted'),
    ])

    if (!profileRes.data) { router.push('/home'); return }
    setProfile(profileRes.data)
    if (hostedRes.data) setHostedEvents(hostedRes.data)

    if (connectionRes.data) {
      setConnectionStatus(connectionRes.data.status)
      setConnectionId(connectionRes.data.id)
    }

    if (myConnsRes.data && theirConnsRes.data) {
      const myIds = new Set(myConnsRes.data.map((c: any) => c.requester_id === userId ? c.addressee_id : c.requester_id))
      const theirIds = new Set(theirConnsRes.data.map((c: any) => c.requester_id === id ? c.addressee_id : c.requester_id))
      const mutualIds: string[] = []
      myIds.forEach(mid => { if (theirIds.has(mid)) mutualIds.push(mid as string) })
      setMutualCount(mutualIds.length)
      if (mutualIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', mutualIds.slice(0, 5))
        if (profiles) setMutualProfiles(profiles)
      }
    }

    const { data: rsvps } = await supabase.from('rsvps').select('event_id').eq('user_id', id)
    if (rsvps && rsvps.length > 0) {
      const eventIds = rsvps.map((r: any) => r.event_id)
      const { data: attended } = await supabase
        .from('events').select('*').in('id', eventIds).eq('visibility', 'public')
        .gte('start_datetime', new Date().toISOString())
        .order('start_datetime', { ascending: true }).limit(10)
      if (attended) setAttendedEvents(attended)
    }

    setLoading(false)
  }

  const handleConnect = async () => {
    if (!user || actionLoading) return
    setActionLoading(true)
    if (connectionStatus === null) {
      const { data } = await supabase.from('connections').insert({
        requester_id: user.id, addressee_id: profileId, user_id: user.id, friend_id: profileId,
      }).select().single()
      if (data) {
        setConnectionStatus('pending')
        setConnectionId(data.id)
        await supabase.from('notifications').insert({
          user_id: profileId,
          actor_id: user.id,
          type: 'connection_request',
          title: 'wants to connect with you',
          body: 'Tap to view their profile and accept or decline.',
          link: '/profile/' + user.id,
          read: false,
        })
      }
    }
    setActionLoading(false)
  }

  const handleMessage = async () => {
    if (!user) return
    const ids = [user.id, profileId].sort()
    const threadId = ids.join('-')
    const { data: existing } = await supabase.from('messages').select('thread_id').eq('thread_id', threadId).limit(1)
    if (existing && existing.length > 0) {
      router.push('/messages/' + threadId)
    } else {
      await supabase.from('messages').insert({ thread_id: threadId, sender_id: user.id, recipient_id: profileId, text: '👋 Hey!' })
      router.push('/messages/' + threadId)
    }
  }

  const formatDate = (dt: string) => new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const categoryEmoji = (cat: string) =>
    cat === 'Music' ? '🎸' : cat === 'Fitness' ? '🏃' : cat === 'Food & Drink' ? '🍺' : cat === 'Tech' ? '💻' : cat === 'Outdoors' ? '🥾' : '🎉'

  if (loading) return (
    <div className="min-h-screen bg-[#0D110D] flex items-center justify-center">
      <div className="text-[#E8B84B] text-2xl font-bold">Gathr.</div>
    </div>
  )

  if (!profile) return null

  return (
    <div className="min-h-screen bg-[#0D110D] pb-32">

      <div style={{ background: 'linear-gradient(160deg,#1A2E1A 0%,#0D110D 65%)' }}>
        <div className="flex items-start justify-between px-4 pt-14 mb-3">
          <button onClick={() => router.back()}
            className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-[#F0EDE6]">
            ←
          </button>
          <button className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-sm">↑</button>
        </div>
        <div className="px-4 pb-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-2xl border-2 border-[#E8B84B]/35 object-cover mb-3" />
          ) : (
            <div className="w-16 h-16 bg-[#2A4A2A] rounded-2xl border-2 border-[#E8B84B]/35 flex items-center justify-center text-2xl mb-3">🧑</div>
          )}
          <div className="font-bold text-[#F0EDE6] text-lg">{profile.name}</div>
          <div className="text-xs text-white/45 mt-1">@{profile.name?.toLowerCase().replace(/\s/g, '')} · {profile.city || 'Bellingham, WA'}</div>
          {profile.bio_social && (
            <div className="text-sm text-white/60 mt-2 leading-relaxed font-light">{profile.bio_social}</div>
          )}
          <div className="flex gap-2 mt-3">
            {(profile.profile_mode === 'social' || profile.profile_mode === 'both' || !profile.profile_mode) && (
              <span className="text-[10px] px-2.5 py-1 rounded-lg bg-[#2A4A2A]/40 border border-[#7EC87E]/20 text-[#7EC87E]">👋 Social</span>
            )}
            {(profile.profile_mode === 'professional' || profile.profile_mode === 'both') && (
              <span className="text-[10px] px-2.5 py-1 rounded-lg bg-[#2A4A2A]/40 border border-[#7EC87E]/20 text-[#7EC87E]">💼 Professional</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex border-t border-b border-white/10">
        {[
          { num: hostedEvents.length, label: 'Hosted' },
          { num: attendedEvents.length, label: 'Going to' },
          { num: (profile.interests || []).length, label: 'Interests' },
          { num: mutualCount, label: 'Mutual' },
        ].map((stat, i) => (
          <div key={stat.label} className={'flex-1 text-center py-3 ' + (i < 3 ? 'border-r border-white/10' : '')}>
            <div className="font-bold text-[#E8B84B] text-base" style={{ fontFamily: 'sans-serif' }}>{stat.num}</div>
            <div className="text-[9px] text-white/40 mt-0.5 uppercase tracking-wide">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-3">

        {profile.interests && profile.interests.length > 0 && (
          <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5">
            <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2.5 font-medium">Interests</div>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((interest: string) => (
                <span key={interest} className="bg-[#2A4A2A]/35 text-[#7EC87E] text-xs px-2.5 py-1 rounded-lg border border-[#7EC87E]/10">{interest}</span>
              ))}
            </div>
          </div>
        )}

        {mutualCount > 0 && (
          <div className="bg-[#2A4A2A]/15 border border-[#7EC87E]/15 rounded-2xl p-3.5">
            <div className="text-[9px] uppercase tracking-widest text-[#7EC87E] mb-2 font-medium">{mutualCount} mutual connection{mutualCount !== 1 ? 's' : ''}</div>
            <div className="flex items-center gap-2 flex-wrap">
              {mutualProfiles.map(p => (
                <button key={p.id} onClick={() => router.push('/profile/' + p.id)} className="flex items-center gap-1.5 active:opacity-70">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-6 h-6 rounded-lg object-cover" />
                  ) : (
                    <div className="w-6 h-6 bg-[#2A4A2A] rounded-lg flex items-center justify-center text-[10px]">🧑</div>
                  )}
                  <span className="text-xs text-[#7EC87E]/80">{p.name}</span>
                </button>
              ))}
              {mutualCount > 5 && <span className="text-xs text-[#7EC87E]/50">+{mutualCount - 5} more</span>}
            </div>
          </div>
        )}

        {(hostedEvents.length > 0 || attendedEvents.length > 0) && (
          <div className="bg-[#1C241C] border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex border-b border-white/10">
              <button onClick={() => setActiveTab('hosting')}
                className={'flex-1 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ' + (activeTab === 'hosting' ? 'text-[#E8B84B] border-[#E8B84B]' : 'text-white/40 border-transparent')}>
                Hosting ({hostedEvents.length})
              </button>
              <button onClick={() => setActiveTab('going')}
                className={'flex-1 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ' + (activeTab === 'going' ? 'text-[#E8B84B] border-[#E8B84B]' : 'text-white/40 border-transparent')}>
                Going ({attendedEvents.length})
              </button>
            </div>
            <div className="p-3.5">
              {activeTab === 'hosting' && (
                hostedEvents.length === 0 ? (
                  <p className="text-xs text-white/30 text-center py-4">No hosted events yet</p>
                ) : (
                  hostedEvents.map(event => (
                    <div key={event.id} onClick={() => router.push('/events/' + event.id)}
                      className="flex items-center gap-3 py-2.5 border-b border-white/10 last:border-0 cursor-pointer active:opacity-70">
                      <div className="w-10 h-10 bg-[#1E3A1E] rounded-xl flex items-center justify-center text-lg flex-shrink-0">{categoryEmoji(event.category)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[#F0EDE6] truncate">{event.title}</div>
                        <div className="text-xs text-white/40 mt-0.5">{formatDate(event.start_datetime)} · {event.location_name}</div>
                      </div>
                      <span className="text-[9px] bg-[#E8B84B]/10 text-[#E8B84B] px-2 py-0.5 rounded border border-[#E8B84B]/20 flex-shrink-0">Host</span>
                    </div>
                  ))
                )
              )}
              {activeTab === 'going' && (
                attendedEvents.length === 0 ? (
                  <p className="text-xs text-white/30 text-center py-4">No upcoming events</p>
                ) : (
                  attendedEvents.map(event => (
                    <div key={event.id} onClick={() => router.push('/events/' + event.id)}
                      className="flex items-center gap-3 py-2.5 border-b border-white/10 last:border-0 cursor-pointer active:opacity-70">
                      <div className="w-10 h-10 bg-[#1E3A1E] rounded-xl flex items-center justify-center text-lg flex-shrink-0">{categoryEmoji(event.category)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[#F0EDE6] truncate">{event.title}</div>
                        <div className="text-xs text-white/40 mt-0.5">{formatDate(event.start_datetime)} · {event.location_name}</div>
                      </div>
                      <span className="text-[9px] bg-[#7EC87E]/10 text-[#7EC87E] px-2 py-0.5 rounded border border-[#7EC87E]/20 flex-shrink-0">Going</span>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-4 bg-gradient-to-t from-[#0D110D] via-[#0D110D]/95 to-transparent">
        <div className="flex gap-3">
          <button onClick={handleMessage}
            className="flex-1 py-3.5 rounded-2xl bg-[#1C241C] border border-white/10 text-[#F0EDE6] text-sm font-medium text-center active:scale-95 transition-transform">
            💬 Message
          </button>
          <button onClick={handleConnect} disabled={actionLoading || connectionStatus === 'accepted'}
            className={'flex-[2] py-3.5 rounded-2xl text-sm font-bold text-center active:scale-95 transition-transform disabled:opacity-50 ' + (
              connectionStatus === 'accepted' ? 'bg-[#1C241C] border border-[#7EC87E]/30 text-[#7EC87E]'
              : connectionStatus === 'pending' ? 'bg-[#1C241C] border border-[#E8B84B]/30 text-[#E8B84B]'
              : 'bg-[#E8B84B] text-[#0D110D]'
            )}
            style={{ boxShadow: !connectionStatus ? '0 4px 18px rgba(232,184,75,0.28)' : 'none' }}>
            {connectionStatus === 'accepted' ? '✓ Connected' : connectionStatus === 'pending' ? 'Request Sent' : actionLoading ? 'Sending...' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  )
}