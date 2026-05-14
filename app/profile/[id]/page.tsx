'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, connectionPairOr } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { PublicProfileSkeleton } from '@/components/Skeleton'
import SafetyBadge from '@/components/SafetyBadge'
import { isValidUUID, formatDateLong, optimizedImgSrc } from '@/lib/utils'
import { cityToTimezone } from '@/lib/constants'

import { FOUNDER_ID } from '@/lib/constants'

const ACHIEVEMENT_LOOKUP: Record<string, { icon: string; tier: 'bronze' | 'silver' | 'gold' }> = {
  'First Event': { icon: '🎉', tier: 'bronze' }, 'Rising Host': { icon: '🎙', tier: 'silver' },
  'Host with the Most': { icon: '🏆', tier: 'gold' }, 'Community Builder': { icon: '🌆', tier: 'gold' },
  'First Steps': { icon: '👟', tier: 'bronze' }, 'Scene Regular': { icon: '📅', tier: 'silver' },
  'Event Veteran': { icon: '⭐', tier: 'gold' }, 'Gathr Legend': { icon: '🌟', tier: 'gold' },
  'First Connection': { icon: '🤝', tier: 'bronze' }, 'Networker': { icon: '📡', tier: 'silver' },
  'Social Butterfly': { icon: '🦋', tier: 'gold' }, 'Connector': { icon: '👑', tier: 'gold' },
  'Explorer': { icon: '🗺', tier: 'bronze' }, 'Passionate': { icon: '🎯', tier: 'silver' },
  'Dual Mode': { icon: '🔀', tier: 'silver' }, 'All-Rounder': { icon: '💎', tier: 'gold' },
  'On Fire': { icon: '🔥', tier: 'gold' }, 'Power User': { icon: '🚀', tier: 'gold' },
  'Avatar': { icon: '📸', tier: 'bronze' }, 'Storyteller': { icon: '✍️', tier: 'bronze' },
  'Curious': { icon: '🎪', tier: 'bronze' }, 'Scene Explorer': { icon: '🌈', tier: 'silver' },
  'Renaissance Person': { icon: '🎭', tier: 'gold' }, 'Versatile Host': { icon: '🎨', tier: 'silver' },
  'Group Member': { icon: '🏘️', tier: 'bronze' }, 'Community Regular': { icon: '🌿', tier: 'silver' },
  'Trusted Member': { icon: '🛡️', tier: 'silver' }, 'Community Pillar': { icon: '💠', tier: 'gold' },
}

export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [hostedEvents, setHostedEvents] = useState<any[]>([])
  const [attendedEvents, setAttendedEvents] = useState<any[]>([])
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null)
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [mutualCount, setMutualCount] = useState(0)
  const [profileConnCount, setProfileConnCount] = useState(0)
  const [totalRsvpCount, setTotalRsvpCount] = useState(0)
  const [mutualProfiles, setMutualProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [profileId, setProfileId] = useState('')
  const [activeTab, setActiveTab] = useState<'hosting' | 'going'>('hosting')
  const router = useRouter()

  useEffect(() => {
    params.then(({ id }) => {
      if (!isValidUUID(id)) { router.push('/home'); return }
      setProfileId(id)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) { router.push('/auth'); return }
        if (session.user.id === id) { router.push('/profile'); return }
        setUser(session.user)
        fetchProfile(id, session.user.id)
      })
    })
  }, [params, router])

  const fetchProfile = async (id: string, userId: string) => {
    const [profileRes, hostedRes, connectionRes, myConnsRes, theirConnsRes, rsvpCountRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('events').select('*').eq('host_id', id).eq('visibility', 'public').order('start_datetime', { ascending: false }).limit(10),
      supabase.from('connections').select('*')
        .or('and(requester_id.eq.' + userId + ',addressee_id.eq.' + id + '),and(requester_id.eq.' + id + ',addressee_id.eq.' + userId + ')')
        .limit(1).maybeSingle(),
      supabase.from('connections').select('requester_id, addressee_id').or(connectionPairOr(userId)).eq('status', 'accepted'),
      supabase.from('connections').select('requester_id, addressee_id').or(connectionPairOr(id)).eq('status', 'accepted'),
      supabase.from('rsvps').select('*', { count: 'exact', head: true }).eq('user_id', id),
    ])

    if (!profileRes.data) { router.push('/home'); return }
    setProfile(profileRes.data)
    if (hostedRes.data) setHostedEvents(hostedRes.data)

    if (connectionRes.data) {
      setConnectionStatus(connectionRes.data.status)
      setConnectionId(connectionRes.data.id)
    }

    if (theirConnsRes.data) setProfileConnCount(theirConnsRes.data.length)
    if (rsvpCountRes.count !== null) setTotalRsvpCount(rsvpCountRes.count)

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
        .order('start_datetime', { ascending: false }).limit(20)
      if (attended) setAttendedEvents(attended)
    }

    setLoading(false)
  }

  const handleConnect = async () => {
    if (!user || actionLoading) return
    setActionLoading(true)
    if (connectionStatus === null) {
      const { data } = await supabase.from('connections').insert({
        requester_id: user.id, addressee_id: profileId,
      }).select().single()
      if (data) {
        setConnectionStatus('pending')
        setConnectionId(data.id)
      }
    } else if (connectionStatus === 'pending' && connectionId) {
      await supabase.from('connections').delete().eq('id', connectionId)
      setConnectionStatus(null)
      setConnectionId(null)
    }
    setActionLoading(false)
  }

  const handleMessage = () => {
    if (!user) return
    const threadId = [user.id, profileId].sort().join('_')
    const from = searchParams?.get('from')
    router.push('/messages/' + threadId + (from ? '?from=' + from : ''))
  }

  const categoryEmoji = (cat: string) =>
    cat === 'Music' ? '🎸' : cat === 'Fitness' ? '🏃' : cat === 'Food & Drink' ? '🍺' : cat === 'Tech' ? '💻' : cat === 'Outdoors' ? '🥾' : '🎉'

  if (loading) return <PublicProfileSkeleton />

  if (!profile) return null

  const profileXp = (hostedEvents.length * 10) + (totalRsvpCount * 5) + (profileConnCount * 3) + ((profile.interests || []).length * 2)
  const profileLevel = Math.floor(profileXp / 50) + 1
  const profileTier = profileLevel >= 10 ? { name: 'Legend', icon: '👑' }
    : profileLevel >= 6 ? { name: 'Veteran', icon: '🔥' }
    : profileLevel >= 3 ? { name: 'Regular', icon: '⭐' }
    : { name: 'Newcomer', icon: '🌱' }

  const [showAvatarExpanded, setShowAvatarExpanded] = useState(false)

  return (
    <div className="min-h-screen bg-[#0D110D] pb-56">

      <div style={{ background: 'var(--gradient-profile-header)' }}>
        <div className="flex items-start justify-between px-4 pt-14 mb-3">
          <button onClick={() => router.back()}
            className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-[#F0EDE6]">
            {'←'}
          </button>
          <button
            onClick={() => {
              const url = window.location.href
              if (navigator.share) {
                navigator.share({ title: profile?.name, url })
              } else {
                navigator.clipboard.writeText(url)
              }
            }}
            className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-sm active:scale-95 transition-transform">↑</button>
        </div>
        <div className="px-4 pb-4">
          {optimizedImgSrc(profile.avatar_url, 128) ? (
            <button onClick={() => setShowAvatarExpanded(true)} className="mb-3 active:scale-95 transition-transform">
              <img src={optimizedImgSrc(profile.avatar_url, 128)!} alt="" className="w-16 h-16 rounded-2xl border-2 border-[#E8B84B]/35 object-cover" loading="lazy" />
            </button>
          ) : (
            <div className="w-16 h-16 bg-[#2A4A2A] rounded-2xl border-2 border-[#E8B84B]/35 flex items-center justify-center text-xl font-bold text-[#E8B84B] mb-3">
              {profile.name ? profile.name.trim().split(' ').filter(Boolean).slice(0, 2).map((n: string) => n[0].toUpperCase()).join('') : '?'}
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-bold text-[#F0EDE6] text-lg">{profile.name}</div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8B84B]/10 border border-[#E8B84B]/20 text-[#E8B84B] font-medium">
              {profileTier.icon} {profileTier.name}
            </span>
            <SafetyBadge tier={profile.safety_tier || 'new'} reviewCount={profile.review_count} size="sm" />
          </div>
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
          {(profile.id === FOUNDER_ID || (profile.pinned_badges && profile.pinned_badges.length > 0)) && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {profile.id === FOUNDER_ID && (
                <span className="text-[10px] px-2 py-1 rounded-lg border font-medium text-[#E8B84B] border-[#E8B84B]/50 bg-gradient-to-r from-[#2A1E04] to-[#100C02] shadow-[0_0_10px_rgba(232,184,75,0.25)]">
                  ✦ Gathr Founder
                </span>
              )}
              {(profile.pinned_badges || []).map((title: string) => {
                const meta = ACHIEVEMENT_LOOKUP[title]
                if (!meta) return null
                const style = meta.tier === 'gold'
                  ? 'text-[#E8B84B] border-[#E8B84B]/25 bg-gradient-to-br from-[#2A2010] to-[#1A1408]'
                  : meta.tier === 'silver'
                  ? 'text-[#A0AEC0] border-[#A0AEC0]/25 bg-gradient-to-br from-[#1E2024] to-[#141618]'
                  : 'text-[#CD7F32] border-[#CD7F32]/25 bg-gradient-to-br from-[#241A0E] to-[#16100A]'
                return (
                  <span key={title} className={`text-[10px] px-2 py-1 rounded-lg border ${style}`}>
                    {meta.icon} {title}
                  </span>
                )
              })}
            </div>
          )}
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
            <div className="font-display font-bold text-[#E8B84B] text-base">{stat.num}</div>
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
                  {optimizedImgSrc(p.avatar_url, 64) ? (
                    <img src={optimizedImgSrc(p.avatar_url, 64)!} alt="" className="w-6 h-6 rounded-lg object-cover"  loading="lazy" />
                  ) : (
                    <div className="w-6 h-6 bg-[#2A4A2A] rounded-lg flex items-center justify-center text-[9px] font-bold text-[#E8B84B]">{p.name ? p.name.trim()[0].toUpperCase() : '?'}</div>
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
                        <div className="text-xs text-white/40 mt-0.5">{formatDateLong(event.start_datetime, cityToTimezone(event.city))} · {event.location_name}</div>
                      </div>
                      <span className="text-[9px] bg-[#E8B84B]/10 text-[#E8B84B] px-2 py-0.5 rounded border border-[#E8B84B]/20 flex-shrink-0">Host</span>
                    </div>
                  ))
                )
              )}
              {activeTab === 'going' && (
                attendedEvents.length === 0 ? (
                  <p className="text-xs text-white/30 text-center py-4">No events yet</p>
                ) : (
                  attendedEvents.map(event => {
                    const isPast = new Date(event.start_datetime) < new Date()
                    return (
                      <div key={event.id} onClick={() => router.push('/events/' + event.id)}
                        className="flex items-center gap-3 py-2.5 border-b border-white/10 last:border-0 cursor-pointer active:opacity-70">
                        <div className="w-10 h-10 bg-[#1E3A1E] rounded-xl flex items-center justify-center text-lg flex-shrink-0">{categoryEmoji(event.category)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-[#F0EDE6] truncate">{event.title}</div>
                          <div className="text-xs text-white/40 mt-0.5">{formatDateLong(event.start_datetime, cityToTimezone(event.city))} · {event.location_name}</div>
                        </div>
                        {isPast
                          ? <span className="text-[9px] bg-white/5 text-white/30 px-2 py-0.5 rounded border border-white/10 flex-shrink-0">Attended</span>
                          : <span className="text-[9px] bg-[#7EC87E]/10 text-[#7EC87E] px-2 py-0.5 rounded border border-[#7EC87E]/20 flex-shrink-0">Going</span>
                        }
                      </div>
                    )
                  })
                )
              )}
            </div>
          </div>
        )}
      </div>

      {showAvatarExpanded && profile?.avatar_url && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm" onClick={() => setShowAvatarExpanded(false)}>
          <img src={optimizedImgSrc(profile.avatar_url, 600) ?? profile.avatar_url} alt="" className="w-72 h-72 rounded-3xl object-cover border-2 border-[#E8B84B]/40 shadow-2xl" style={{ boxShadow: '0 0 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(232,184,75,0.2)' }} />
        </div>
      )}

      <BottomNav />

      <div className="fixed bottom-24 left-0 right-0 px-4 pb-2 pt-4 bg-gradient-to-t from-[#0D110D] via-[#0D110D]/95 to-transparent">
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
            {actionLoading ? '...' : connectionStatus === 'accepted' ? '✓ Connected' : connectionStatus === 'pending' ? 'Withdraw Request' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  )
}
