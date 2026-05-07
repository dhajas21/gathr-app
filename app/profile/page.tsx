'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'

const ALL_INTERESTS = [
  'Music', 'Fitness', 'Food & Drink', 'Tech', 'Outdoors', 'Art', 'Gaming',
  'Film', 'Books', 'Travel', 'Photography', 'Cooking', 'Sports', 'Yoga',
  'Dance', 'Comedy', 'Volunteering', 'Networking', 'Entrepreneurship', 'Wellness',
]

const CATEGORY_EMOJI: Record<string, string> = {
  Music: '🎸', Fitness: '🏃', 'Food & Drink': '🍺', Tech: '💻',
  Outdoors: '🥾', Art: '🎨', Gaming: '🎮', Film: '🎬',
}
const catEmoji = (cat: string) => CATEGORY_EMOJI[cat] || '🎉'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [hostedEvents, setHostedEvents] = useState<any[]>([])
  const [attendedEvents, setAttendedEvents] = useState<any[]>([])
  const [connections, setConnections] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState(0)
  const [editingInterests, setEditingInterests] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadData = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) { router.push('/auth'); return }
        setUser(session.user)
        fetchAll(session.user.id)
      })
    }

    loadData()

    const handleVisibility = () => { if (document.visibilityState === 'visible') loadData() }
    const handlePageShow = () => loadData()
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', loadData)
    window.addEventListener('popstate', loadData)
    window.addEventListener('pageshow', handlePageShow)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', loadData)
      window.removeEventListener('popstate', loadData)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [])

  const fetchAll = async (userId: string) => {
    const [profileRes, hostedRes, rsvpRes, connRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('events').select('*').eq('host_id', userId).order('start_datetime', { ascending: false }),
      supabase.from('rsvps').select('event_id').eq('user_id', userId),
      supabase.from('connections')
        .select('requester_id, addressee_id')
        .or('requester_id.eq.' + userId + ',addressee_id.eq.' + userId)
        .eq('status', 'accepted'),
    ])

    if (profileRes.data) setProfile(profileRes.data)
    if (hostedRes.data) setHostedEvents(hostedRes.data)

    if (rsvpRes.data && rsvpRes.data.length > 0) {
      const eventIds = rsvpRes.data.map((r: any) => r.event_id)
      const { data: attended } = await supabase
        .from('events').select('*').in('id', eventIds).order('start_datetime', { ascending: false })
      if (attended) setAttendedEvents(attended)
    }

    if (connRes.data && connRes.data.length > 0) {
      const otherIds = connRes.data.map((c: any) => c.requester_id === userId ? c.addressee_id : c.requester_id)
      const { data: connProfiles } = await supabase
        .from('profiles').select('id, name, bio_social, city, avatar_url').in('id', otherIds)
      if (connProfiles) setConnections(connProfiles)
    }

    setLoading(false)
  }

  const handleToggleMode = async (mode: 'social' | 'professional') => {
    if (!user || !profile) return
    const current = profile.profile_mode || 'social'
    let next: string
    if (current === 'both') {
      next = mode === 'social' ? 'professional' : 'social'
    } else if (current === mode) {
      next = mode === 'social' ? 'professional' : 'social'
    } else {
      next = 'both'
    }
    setProfile((p: any) => ({ ...p, profile_mode: next }))
    await supabase.from('profiles').update({ profile_mode: next }).eq('id', user.id)
  }

  const handleToggleInterest = async (interest: string) => {
    if (!user || !profile) return
    const current: string[] = profile.interests || []
    const next = current.includes(interest)
      ? current.filter((i: string) => i !== interest)
      : [...current, interest]
    setProfile((p: any) => ({ ...p, interests: next }))
    await supabase.from('profiles').update({ interests: next }).eq('id', user.id)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const formatDate = (dt: string) => new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  if (loading) return (
    <div className="min-h-screen bg-[#0D110D] flex items-center justify-center">
      <div className="text-[#E8B84B] text-2xl font-bold">Gathr.</div>
    </div>
  )

  const interests: string[] = profile?.interests || []
  const isSocial = profile?.profile_mode === 'social' || profile?.profile_mode === 'both' || !profile?.profile_mode
  const isProfessional = profile?.profile_mode === 'professional' || profile?.profile_mode === 'both'

  const xp = (hostedEvents.length * 10) + (attendedEvents.length * 5) + (connections.length * 3) + (interests.length * 2)
  const level = Math.floor(xp / 50) + 1
  const xpInLevel = xp % 50
  const xpToNext = 50

  const ACHIEVEMENTS = [
    { icon: '🎉', title: 'First Event', desc: 'Host your first event', tier: 'bronze', val: hostedEvents.length, req: 1 },
    { icon: '🎙', title: 'Rising Host', desc: 'Host 3 events', tier: 'silver', val: hostedEvents.length, req: 3 },
    { icon: '🏆', title: 'Host with the Most', desc: 'Host 10 events', tier: 'gold', val: hostedEvents.length, req: 10 },
    { icon: '🌆', title: 'Community Builder', desc: 'Host 25 events', tier: 'gold', val: hostedEvents.length, req: 25 },
    { icon: '👟', title: 'First Steps', desc: 'Attend your first event', tier: 'bronze', val: attendedEvents.length, req: 1 },
    { icon: '📅', title: 'Scene Regular', desc: 'Attend 5 events', tier: 'silver', val: attendedEvents.length, req: 5 },
    { icon: '⭐', title: 'Event Veteran', desc: 'Attend 20 events', tier: 'gold', val: attendedEvents.length, req: 20 },
    { icon: '🌟', title: 'Gathr Legend', desc: 'Attend 50 events', tier: 'gold', val: attendedEvents.length, req: 50 },
    { icon: '🤝', title: 'First Connection', desc: 'Make your first connection', tier: 'bronze', val: connections.length, req: 1 },
    { icon: '📡', title: 'Networker', desc: 'Make 10 connections', tier: 'silver', val: connections.length, req: 10 },
    { icon: '🦋', title: 'Social Butterfly', desc: 'Make 25 connections', tier: 'gold', val: connections.length, req: 25 },
    { icon: '🗺', title: 'Explorer', desc: 'Add 5 interests', tier: 'bronze', val: interests.length, req: 5 },
    { icon: '🔀', title: 'Dual Mode', desc: 'Enable both Social & Professional', tier: 'silver', val: profile?.profile_mode === 'both' ? 1 : 0, req: 1 },
    { icon: '💎', title: 'All-Rounder', desc: 'Host, attend & connect (5 each)', tier: 'gold', val: Math.min(hostedEvents.length, attendedEvents.length, connections.length), req: 5 },
    { icon: '🔥', title: 'On Fire', desc: 'Reach level 5', tier: 'gold', val: level, req: 5 },
  ]

  const tierColor = (tier: string, unlocked: boolean) =>
    !unlocked ? 'text-white/20' :
    tier === 'gold' ? 'text-[#E8B84B]' :
    tier === 'silver' ? 'text-[#A0AEC0]' :
    'text-[#CD7F32]'

  const tierBorder = (tier: string, unlocked: boolean) =>
    !unlocked ? 'border-white/5' :
    tier === 'gold' ? 'border-[#E8B84B]/25' :
    tier === 'silver' ? 'border-[#A0AEC0]/25' :
    'border-[#CD7F32]/25'

  const tierBg = (tier: string, unlocked: boolean) =>
    !unlocked ? 'bg-[#0D110D]' :
    tier === 'gold' ? 'bg-gradient-to-br from-[#2A2010] to-[#1A1408]' :
    tier === 'silver' ? 'bg-gradient-to-br from-[#1E2024] to-[#141618]' :
    'bg-gradient-to-br from-[#241A0E] to-[#16100A]'

  const tabs = ['Overview', 'Events', 'Stats', 'Connections']
  const unlockedCount = ACHIEVEMENTS.filter(a => a.val >= a.req).length

  return (
    <div className="min-h-screen bg-[#0D110D] pb-24">

      <div style={{ background: 'linear-gradient(160deg,#1A2E1A 0%,#0D110D 65%)' }}>
        <div className="flex items-start justify-between px-4 pt-14 mb-3">
          <div />
          <div className="flex gap-2">
            <button onClick={() => router.push('/notifications')}
              className="w-8 h-8 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-sm">🔔</button>
            <button onClick={() => router.push('/settings')}
              className="w-8 h-8 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-sm">⚙️</button>
            <button onClick={() => router.push('/host')}
              className="w-8 h-8 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-sm">📊</button>
            <button onClick={() => router.push('/profile/edit')}
              className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-[#F0EDE6]">
              ✏️ Edit
            </button>
          </div>
        </div>
        <div className="px-4 pb-4">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-2xl border-2 border-[#E8B84B]/35 object-cover mb-3" />
          ) : (
            <div className="w-16 h-16 bg-[#2A4A2A] rounded-2xl border-2 border-[#E8B84B]/35 flex items-center justify-center text-2xl mb-3">🧑‍💻</div>
          )}
          <div className="font-bold text-[#F0EDE6] text-lg">{profile?.name || 'Your Name'}</div>
          <div className="text-xs text-white/45 mt-1">@{profile?.name?.toLowerCase().replace(/\s/g, '')} · {profile?.city || 'Bellingham, WA'}</div>
          {profile?.bio_social && (
            <div className="text-sm text-white/60 mt-2 leading-relaxed font-light">{profile.bio_social}</div>
          )}
          <div className="flex gap-2 mt-3">
            <button onClick={() => handleToggleMode('social')}
              className={'text-[10px] px-2.5 py-1 rounded-lg border transition-all active:scale-95 ' +
                (isSocial ? 'bg-[#2A4A2A]/60 border-[#7EC87E]/40 text-[#7EC87E]' : 'bg-white/5 border-white/10 text-white/30')}>
              👋 Social
            </button>
            <button onClick={() => handleToggleMode('professional')}
              className={'text-[10px] px-2.5 py-1 rounded-lg border transition-all active:scale-95 ' +
                (isProfessional ? 'bg-[#2A4A2A]/60 border-[#7EC87E]/40 text-[#7EC87E]' : 'bg-white/5 border-white/10 text-white/30')}>
              💼 Professional
            </button>
            <div className="ml-auto flex items-center gap-1.5 bg-[#2A2010]/60 border border-[#E8B84B]/20 rounded-lg px-2.5 py-1">
              <span className="text-[10px] text-[#E8B84B] font-bold">Lv.{level}</span>
              <span className="text-[9px] text-white/30">{xp} XP</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex border-t border-b border-white/10">
        {[
          { num: hostedEvents.length, label: 'Hosted' },
          { num: attendedEvents.length, label: 'Attended' },
          { num: connections.length, label: 'Connections' },
          { num: unlockedCount, label: 'Achievements' },
        ].map((stat, i) => (
          <div key={stat.label} className={'flex-1 text-center py-3 ' + (i < 3 ? 'border-r border-white/10' : '')}>
            <div className="font-bold text-[#E8B84B] text-base">{stat.num}</div>
            <div className="text-[9px] text-white/40 mt-0.5 uppercase tracking-wide">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="flex border-b border-white/10">
        {tabs.map((tab, i) => (
          <button key={tab} onClick={() => setActiveTab(i)}
            className={'flex-1 py-2.5 text-xs text-center border-b-2 -mb-px transition-colors ' +
              (activeTab === i ? 'text-[#E8B84B] border-[#E8B84B]' : 'text-white/40 border-transparent')}>
            {tab}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-3">

        {activeTab === 0 && (
          <>
            <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5">
              <div className="flex items-center justify-between mb-2.5">
                <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium">Interests</div>
                <button onClick={() => setEditingInterests(e => !e)}
                  className={'text-[10px] px-2 py-0.5 rounded-lg border transition-colors ' +
                    (editingInterests ? 'bg-[#E8B84B]/15 border-[#E8B84B]/30 text-[#E8B84B]' : 'bg-white/5 border-white/10 text-white/40')}>
                  {editingInterests ? 'Done' : 'Edit'}
                </button>
              </div>
              {editingInterests ? (
                <div className="flex flex-wrap gap-2">
                  {ALL_INTERESTS.map(interest => {
                    const selected = interests.includes(interest)
                    return (
                      <button key={interest} onClick={() => handleToggleInterest(interest)}
                        className={'text-xs px-2.5 py-1 rounded-lg border transition-all active:scale-95 ' +
                          (selected
                            ? 'bg-[#2A4A2A]/60 border-[#7EC87E]/40 text-[#7EC87E]'
                            : 'bg-white/5 border-white/10 text-white/40')}>
                        {interest}
                      </button>
                    )
                  })}
                </div>
              ) : (
                interests.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {interests.map((interest: string) => (
                      <span key={interest} className="bg-[#2A4A2A]/35 text-[#7EC87E] text-xs px-2.5 py-1 rounded-lg border border-[#7EC87E]/10">{interest}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/30 py-1">Tap Edit to add your interests</p>
                )
              )}
            </div>

            <button onClick={() => router.push('/settings')}
              className="w-full bg-[#1C241C] border border-white/10 rounded-2xl p-3.5 flex items-center justify-between active:bg-white/5 transition-colors">
              <div className="text-left">
                <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium mb-1">Visibility & Privacy</div>
                <div className="text-sm text-[#F0EDE6]">Manage in Settings</div>
              </div>
              <span className="text-white/20 text-lg">›</span>
            </button>

            {hostedEvents.length > 0 && (
              <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5">
                <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2.5 font-medium">Recent Events</div>
                {hostedEvents.slice(0, 3).map(event => (
                  <div key={event.id} onClick={() => router.push('/events/' + event.id)}
                    className="flex items-center gap-3 py-2 border-b border-white/10 last:border-0 cursor-pointer active:opacity-70">
                    <div className="w-9 h-9 bg-[#1E3A1E] rounded-xl flex items-center justify-center text-base flex-shrink-0">
                      {catEmoji(event.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#F0EDE6] truncate">{event.title}</div>
                      <div className="text-xs text-white/40 mt-0.5">{formatDate(event.start_datetime)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={handleSignOut}
              className="w-full bg-[#1C241C] border border-white/10 rounded-2xl py-4 text-[#E85B5B] text-sm font-medium active:scale-[0.98] transition-transform">
              Sign Out
            </button>
          </>
        )}

        {activeTab === 1 && (
          <>
            {hostedEvents.length > 0 && (
              <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5">
                <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2.5 font-medium">Hosted by you</div>
                {hostedEvents.map(event => (
                  <div key={event.id} onClick={() => router.push('/events/' + event.id)}
                    className="flex items-center gap-3 py-2.5 border-b border-white/10 last:border-0 cursor-pointer active:opacity-70">
                    <div className="w-10 h-10 bg-[#1E3A1E] rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                      {catEmoji(event.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#F0EDE6] truncate">{event.title}</div>
                      <div className="text-xs text-white/40 mt-0.5">{formatDate(event.start_datetime)} · {event.location_name}</div>
                    </div>
                    <span className="text-[9px] bg-[#E8B84B]/10 text-[#E8B84B] px-2 py-0.5 rounded border border-[#E8B84B]/20 flex-shrink-0">Host</span>
                  </div>
                ))}
              </div>
            )}

            {attendedEvents.length > 0 && (
              <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5">
                <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2.5 font-medium">RSVPd to</div>
                {attendedEvents.map(event => (
                  <div key={event.id} onClick={() => router.push('/events/' + event.id)}
                    className="flex items-center gap-3 py-2.5 border-b border-white/10 last:border-0 cursor-pointer active:opacity-70">
                    <div className="w-10 h-10 bg-[#1E3A1E] rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                      {catEmoji(event.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#F0EDE6] truncate">{event.title}</div>
                      <div className="text-xs text-white/40 mt-0.5">{formatDate(event.start_datetime)} · {event.location_name}</div>
                    </div>
                    <span className="text-[9px] bg-[#7EC87E]/10 text-[#7EC87E] px-2 py-0.5 rounded border border-[#7EC87E]/20 flex-shrink-0">Going</span>
                  </div>
                ))}
              </div>
            )}

            {hostedEvents.length === 0 && attendedEvents.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="text-4xl">📅</div>
                <p className="text-white/40 text-sm">No events yet</p>
                <button onClick={() => router.push('/create')}
                  className="mt-2 bg-[#E8B84B] text-[#0D110D] px-5 py-2.5 rounded-2xl font-semibold text-sm">
                  Create Your First Event
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === 2 && (
          <>
            <div className="bg-gradient-to-br from-[#2A2010] to-[#1A1408] border border-[#E8B84B]/20 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-[9px] uppercase tracking-widest text-[#E8B84B]/50 font-medium mb-1">Your Level</div>
                  <div className="text-3xl font-bold text-[#E8B84B]">Level {level}</div>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-[#E8B84B]/10 border border-[#E8B84B]/20 flex items-center justify-center">
                  <span className="text-2xl">{level >= 10 ? '👑' : level >= 5 ? '🔥' : level >= 3 ? '⭐' : '🌱'}</span>
                </div>
              </div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] text-white/40">{xpInLevel} / {xpToNext} XP to Level {level + 1}</span>
                <span className="text-[10px] text-[#E8B84B]">{xp} total XP</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#E8B84B] rounded-full transition-all"
                  style={{ width: Math.round((xpInLevel / xpToNext) * 100) + '%' }} />
              </div>
            </div>

            <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-4">
              <div className="text-[9px] uppercase tracking-widest text-white/20 mb-3 font-medium">Activity</div>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { icon: '🎉', num: hostedEvents.length, label: 'Events Hosted', xp: hostedEvents.length * 10 },
                  { icon: '📅', num: attendedEvents.length, label: 'Events Attended', xp: attendedEvents.length * 5 },
                  { icon: '🤝', num: connections.length, label: 'Connections', xp: connections.length * 3 },
                  { icon: '✦', num: interests.length, label: 'Interests', xp: interests.length * 2 },
                ].map(item => (
                  <div key={item.label} className="bg-[#0D110D] border border-white/10 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-base">{item.icon}</span>
                      <span className="text-[9px] text-[#E8B84B]/60">+{item.xp} XP</span>
                    </div>
                    <div className="text-xl font-bold text-[#E8B84B]">{item.num}</div>
                    <div className="text-[10px] text-white/40 mt-0.5">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium">Achievements</div>
                <span className="text-[10px] text-[#E8B84B]">{unlockedCount} / {ACHIEVEMENTS.length}</span>
              </div>
              <div className="space-y-2.5">
                {ACHIEVEMENTS.map(ach => {
                  const unlocked = ach.val >= ach.req
                  const progress = Math.min(ach.val / ach.req, 1)
                  return (
                    <div key={ach.title}
                      className={'flex items-center gap-3 p-3 rounded-xl border transition-all ' + tierBg(ach.tier, unlocked) + ' ' + tierBorder(ach.tier, unlocked)}>
                      <span className={'text-xl ' + (unlocked ? '' : 'opacity-25')}>{ach.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className={'text-sm font-semibold ' + tierColor(ach.tier, unlocked)}>{ach.title}</div>
                        <div className="text-[10px] text-white/35 mt-0.5">{ach.desc}</div>
                        {!unlocked && (
                          <div className="mt-1.5 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-white/25 rounded-full" style={{ width: Math.round(progress * 100) + '%' }} />
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        {unlocked ? (
                          <span className={'text-[9px] px-2 py-0.5 rounded border font-medium ' + tierColor(ach.tier, true) + ' ' + tierBorder(ach.tier, true)}>
                            {ach.tier === 'gold' ? '🥇' : ach.tier === 'silver' ? '🥈' : '🥉'}
                          </span>
                        ) : (
                          <span className="text-[9px] text-white/20">{ach.val}/{ach.req}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {activeTab === 3 && (
          <>
            {connections.length > 0 ? (
              <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5">
                <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2.5 font-medium">
                  {connections.length} Connection{connections.length !== 1 ? 's' : ''}
                </div>
                {connections.map(conn => (
                  <div key={conn.id} onClick={() => router.push('/profile/' + conn.id)}
                    className="flex items-center gap-3 py-2.5 border-b border-white/10 last:border-0 cursor-pointer active:opacity-70">
                    {conn.avatar_url ? (
                      <img src={conn.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 bg-[#2A4A2A] rounded-xl flex items-center justify-center text-base flex-shrink-0">
                        {conn.name?.charAt(0) || '🧑'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#F0EDE6]">{conn.name}</div>
                      <div className="text-xs text-white/40 mt-0.5 truncate">{conn.bio_social || conn.city || ''}</div>
                    </div>
                    <span className="text-white/20 text-sm flex-shrink-0">›</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="text-4xl">🤝</div>
                <p className="text-white/40 text-sm text-center">No connections yet</p>
                <p className="text-white/25 text-xs text-center max-w-[220px]">Find people at events and communities and connect with them</p>
                <button onClick={() => router.push('/communities')}
                  className="mt-2 bg-[#E8B84B] text-[#0D110D] px-5 py-2.5 rounded-2xl font-semibold text-sm">
                  Find People
                </button>
              </div>
            )}
          </>
        )}

      </div>

      <BottomNav />
    </div>
  )
}