'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { ProfilePageSkeleton } from '@/components/Skeleton'

const CATEGORY_EMOJI: Record<string, string> = {
  Music: '🎸', Fitness: '🏃', 'Food & Drink': '🍺', Tech: '💻',
  Outdoors: '🥾', Art: '🎨', Gaming: '🎮', Film: '🎬',
}
const catEmoji = (cat: string) => CATEGORY_EMOJI[cat] || '🎉'

function computeAchievements(hostedCount: number, attendedCount: number, connCount: number, interests: string[], profile: any, level: number) {
  return [
    { icon: '🎉', title: 'First Event', desc: 'Host your first event', tier: 'bronze', val: hostedCount, req: 1 },
    { icon: '🎙', title: 'Rising Host', desc: 'Host 3 events', tier: 'silver', val: hostedCount, req: 3 },
    { icon: '🏆', title: 'Host with the Most', desc: 'Host 10 events', tier: 'gold', val: hostedCount, req: 10 },
    { icon: '🌆', title: 'Community Builder', desc: 'Host 25 events', tier: 'gold', val: hostedCount, req: 25 },
    { icon: '👟', title: 'First Steps', desc: 'Attend your first event', tier: 'bronze', val: attendedCount, req: 1 },
    { icon: '📅', title: 'Scene Regular', desc: 'Attend 5 events', tier: 'silver', val: attendedCount, req: 5 },
    { icon: '⭐', title: 'Event Veteran', desc: 'Attend 20 events', tier: 'gold', val: attendedCount, req: 20 },
    { icon: '🌟', title: 'Gathr Legend', desc: 'Attend 50 events', tier: 'gold', val: attendedCount, req: 50 },
    { icon: '🤝', title: 'First Connection', desc: 'Make your first connection', tier: 'bronze', val: connCount, req: 1 },
    { icon: '📡', title: 'Networker', desc: 'Make 10 connections', tier: 'silver', val: connCount, req: 10 },
    { icon: '🦋', title: 'Social Butterfly', desc: 'Make 25 connections', tier: 'gold', val: connCount, req: 25 },
    { icon: '👑', title: 'Connector', desc: 'Make 50 connections', tier: 'gold', val: connCount, req: 50 },
    { icon: '🗺', title: 'Explorer', desc: 'Add 5 interests', tier: 'bronze', val: interests.length, req: 5 },
    { icon: '🎯', title: 'Passionate', desc: 'Add 10 interests', tier: 'silver', val: interests.length, req: 10 },
    { icon: '🔀', title: 'Dual Mode', desc: 'Activate Professional mode', tier: 'silver', val: (profile?.profile_mode === 'both' || profile?.profile_mode === 'professional') ? 1 : 0, req: 1 },
    { icon: '💎', title: 'All-Rounder', desc: 'Host, attend & connect (5 each)', tier: 'gold', val: Math.min(hostedCount, attendedCount, connCount), req: 5 },
    { icon: '🔥', title: 'On Fire', desc: 'Reach level 5', tier: 'gold', val: level, req: 5 },
    { icon: '🚀', title: 'Power User', desc: 'Reach level 10', tier: 'gold', val: level, req: 10 },
    { icon: '📸', title: 'Avatar', desc: 'Add a profile photo', tier: 'bronze', val: profile?.avatar_url ? 1 : 0, req: 1 },
    { icon: '✍️', title: 'Storyteller', desc: 'Write your bio', tier: 'bronze', val: profile?.bio_social ? 1 : 0, req: 1 },
  ]
}

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [hostedEvents, setHostedEvents] = useState<any[]>([])
  const [attendedEvents, setAttendedEvents] = useState<any[]>([])
  const [connections, setConnections] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [celebrateLevel, setCelebrateLevel] = useState(0)
  const [xpBarWidth, setXpBarWidth] = useState(0)
  const [newAchievements, setNewAchievements] = useState<any[]>([])
  const [showAchievementUnlock, setShowAchievementUnlock] = useState(false)
  const [pinnedBadges, setPinnedBadges] = useState<string[]>([])
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

  useEffect(() => {
    if (loading) return
    try {
      const interests = profile?.interests || []
      const xpVal = (hostedEvents.length * 10) + (attendedEvents.length * 5) + (connections.length * 3) + (interests.length * 2)
      const levelVal = Math.floor(xpVal / 50) + 1

      const storedLevel = parseInt(localStorage.getItem('gathr_user_level') || '0')
      if (storedLevel > 0 && levelVal > storedLevel) {
        setCelebrateLevel(levelVal)
        setShowLevelUp(true)
      }
      localStorage.setItem('gathr_user_level', String(levelVal))

      const allAch = computeAchievements(hostedEvents.length, attendedEvents.length, connections.length, interests, profile, levelVal)
      const seenRaw = localStorage.getItem('gathr_seen_achievements')
      const seen: string[] | null = seenRaw ? JSON.parse(seenRaw) : null
      if (seen !== null) {
        const fresh = allAch.filter(a => a.val >= a.req && !seen.includes(a.title))
        if (fresh.length > 0) {
          setNewAchievements(fresh)
          setShowAchievementUnlock(true)
        }
      }
      localStorage.setItem('gathr_seen_achievements', JSON.stringify(allAch.filter(a => a.val >= a.req).map(a => a.title)))
    } catch {}
  }, [loading, hostedEvents.length, attendedEvents.length, connections.length, profile])

  useEffect(() => {
    if (activeTab !== 2) return
    setXpBarWidth(0)
    const t = setTimeout(() => {
      const xpVal = (hostedEvents.length * 10) + (attendedEvents.length * 5) + (connections.length * 3) + ((profile?.interests || []).length * 2)
      setXpBarWidth(Math.round(((xpVal % 50) / 50) * 100))
    }, 120)
    return () => clearTimeout(t)
  }, [activeTab, hostedEvents.length, attendedEvents.length, connections.length, profile])

  useEffect(() => {
    if (!showLevelUp) return
    import('canvas-confetti').then(({ default: confetti }) => {
      confetti({ particleCount: 160, spread: 75, origin: { y: 0.55 }, colors: ['#E8B84B', '#7EC87E', '#F0EDE6', '#E8B84B', '#FFD700'] })
    })
  }, [showLevelUp])

  useEffect(() => {
    if (!showAchievementUnlock) return
    import('canvas-confetti').then(({ default: confetti }) => {
      confetti({ particleCount: 100, spread: 55, origin: { y: 0.6 }, colors: ['#7EC87E', '#E8B84B', '#F0EDE6'] })
    })
  }, [showAchievementUnlock])

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

    if (profileRes.data) {
      setProfile(profileRes.data)
      setPinnedBadges(profileRes.data.pinned_badges || [])
    }
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
    const hasSocial = current === 'social' || current === 'both'
    const hasProfessional = current === 'professional' || current === 'both'
    let nextSocial = hasSocial
    let nextPro = hasProfessional
    if (mode === 'social') nextSocial = !hasSocial
    else nextPro = !hasProfessional
    // Keep at least one active
    if (!nextSocial && !nextPro) nextSocial = true
    const next = nextSocial && nextPro ? 'both' : nextPro ? 'professional' : 'social'
    setProfile((p: any) => ({ ...p, profile_mode: next }))
    await supabase.from('profiles').update({ profile_mode: next }).eq('id', user.id)
  }

  const handleTogglePin = async (title: string) => {
    if (!user) return
    let next: string[]
    if (pinnedBadges.includes(title)) {
      next = pinnedBadges.filter(t => t !== title)
    } else {
      if (pinnedBadges.length >= 3) return
      next = [...pinnedBadges, title]
    }
    setPinnedBadges(next)
    await supabase.from('profiles').update({ pinned_badges: next }).eq('id', user.id)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const formatDate = (dt: string) => new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  if (loading) return <ProfilePageSkeleton />

  const interests: string[] = profile?.interests || []
  const isSocial = profile?.profile_mode === 'social' || profile?.profile_mode === 'both' || !profile?.profile_mode
  const isProfessional = profile?.profile_mode === 'professional' || profile?.profile_mode === 'both'

  const xp = (hostedEvents.length * 10) + (attendedEvents.length * 5) + (connections.length * 3) + (interests.length * 2)
  const level = Math.floor(xp / 50) + 1
  const xpInLevel = xp % 50
  const xpToNext = 50

  const ACHIEVEMENTS = computeAchievements(hostedEvents.length, attendedEvents.length, connections.length, interests, profile, level)

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
          <button onClick={() => router.push('/settings')}
            className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white/50 active:scale-95 transition-transform">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <line x1="4" y1="6" x2="20" y2="6"/>
              <circle cx="9" cy="6" r="2.25" fill="#0D110D" stroke="currentColor" strokeWidth="1.75"/>
              <line x1="4" y1="12" x2="20" y2="12"/>
              <circle cx="16" cy="12" r="2.25" fill="#0D110D" stroke="currentColor" strokeWidth="1.75"/>
              <line x1="4" y1="18" x2="20" y2="18"/>
              <circle cx="11" cy="18" r="2.25" fill="#0D110D" stroke="currentColor" strokeWidth="1.75"/>
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/bookmarks')}
              className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white/45 active:scale-95 transition-transform">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 3h14a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z"/>
              </svg>
            </button>
            <button onClick={() => router.push('/profile/edit')}
              className="bg-[#E8B84B] text-[#0D110D] text-xs font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-transform"
              style={{ boxShadow: '0 2px 12px rgba(232,184,75,0.28)' }}>
              Edit
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
          {pinnedBadges.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {pinnedBadges.map(title => {
                const ach = ACHIEVEMENTS.find(a => a.title === title)
                if (!ach) return null
                return (
                  <span key={title} className={'text-[10px] px-2 py-1 rounded-lg border ' + tierBg(ach.tier, true) + ' ' + tierBorder(ach.tier, true) + ' ' + tierColor(ach.tier, true)}>
                    {ach.icon} {ach.title}
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
          { num: attendedEvents.length, label: 'RSVPs' },
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
                <button onClick={() => router.push('/profile/edit')}
                  className="text-[10px] px-2 py-0.5 rounded-lg border bg-white/5 border-white/10 text-white/40">
                  Manage →
                </button>
              </div>
              {interests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {interests.map((interest: string) => (
                    <span key={interest} className="bg-[#2A4A2A]/35 text-[#7EC87E] text-xs px-2.5 py-1 rounded-lg border border-[#7EC87E]/10">{interest}</span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-white/30 py-1">
                  No interests yet ·{' '}
                  <button onClick={() => router.push('/profile/edit')} className="text-[#E8B84B]">Add some →</button>
                </p>
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

            <button onClick={() => router.push('/host')}
              className="w-full bg-[#1C241C] border border-white/10 rounded-2xl p-3.5 flex items-center justify-between active:bg-white/5 transition-colors">
              <div className="text-left">
                <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium mb-1">Host Dashboard</div>
                <div className="text-sm text-[#F0EDE6]">Events · RSVPs · Insights</div>
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
                <div className="h-full bg-[#E8B84B] rounded-full transition-all duration-700 ease-out"
                  style={{ width: xpBarWidth + '%' }} />
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
                          <div className="flex flex-col items-end gap-1">
                            <span className={'text-[9px] px-2 py-0.5 rounded border font-medium ' + tierColor(ach.tier, true) + ' ' + tierBorder(ach.tier, true)}>
                              {ach.tier === 'gold' ? '🥇' : ach.tier === 'silver' ? '🥈' : '🥉'}
                            </span>
                            <button onClick={() => handleTogglePin(ach.title)}
                              className={'text-[8px] px-1.5 py-0.5 rounded border transition-all ' + (pinnedBadges.includes(ach.title) ? 'border-[#E8B84B]/40 text-[#E8B84B] bg-[#E8B84B]/10' : 'border-white/10 text-white/25')}>
                              {pinnedBadges.includes(ach.title) ? '📌 Pinned' : pinnedBadges.length >= 3 ? '—' : 'Pin'}
                            </button>
                          </div>
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
                  <div key={conn.id} className="flex items-center gap-3 py-2.5 border-b border-white/10 last:border-0">
                    <div onClick={() => router.push('/profile/' + conn.id)} className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer active:opacity-70">
                      {conn.avatar_url ? (
                        <img src={conn.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 bg-[#2A4A2A] rounded-xl flex items-center justify-center text-base flex-shrink-0">
                          {conn.name?.charAt(0) || '🧑'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#F0EDE6]">{conn.name}</div>
                        <div className="text-xs text-white/40 mt-0.5 truncate">{conn.bio_social || conn.city || ''}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const threadId = [user?.id, conn.id].sort().join('_')
                        router.push('/messages/' + threadId)
                      }}
                      className="w-8 h-8 bg-[#1E3A1E] border border-[#7EC87E]/20 rounded-xl flex items-center justify-center text-sm flex-shrink-0 active:scale-95 transition-transform">
                      💬
                    </button>
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

      {showAchievementUnlock && (
        <div className="fixed inset-0 bg-black/85 z-[60] flex items-center justify-center p-6" onClick={() => setShowAchievementUnlock(false)}>
          <div className="bg-gradient-to-br from-[#1A2A1A] to-[#0D110D] border border-[#7EC87E]/30 rounded-3xl p-7 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="text-5xl mb-3" style={{ filter: 'drop-shadow(0 0 16px rgba(126,200,126,0.5))' }}>
                {newAchievements.length === 1 ? newAchievements[0].icon : '🏅'}
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#7EC87E]/60 mb-1">
                {newAchievements.length === 1 ? 'Achievement Unlocked' : newAchievements.length + ' Achievements Unlocked'}
              </div>
              <div className="text-2xl font-bold text-[#F0EDE6]">
                {newAchievements.length === 1 ? newAchievements[0].title : 'Keep it up!'}
              </div>
              {newAchievements.length === 1 && (
                <div className="text-sm text-white/40 mt-1">{newAchievements[0].desc}</div>
              )}
            </div>
            {newAchievements.length === 1 && (
              <div className="flex justify-center mb-5">
                <span className={'text-xs px-3 py-1 rounded-full border font-medium ' +
                  (newAchievements[0].tier === 'gold' ? 'text-[#E8B84B] border-[#E8B84B]/30 bg-[#E8B84B]/10' :
                   newAchievements[0].tier === 'silver' ? 'text-[#A0AEC0] border-[#A0AEC0]/30 bg-[#A0AEC0]/10' :
                   'text-[#CD7F32] border-[#CD7F32]/30 bg-[#CD7F32]/10')}>
                  {newAchievements[0].tier === 'gold' ? '🥇 Gold' : newAchievements[0].tier === 'silver' ? '🥈 Silver' : '🥉 Bronze'}
                </span>
              </div>
            )}
            {newAchievements.length > 1 && (
              <div className="space-y-2 mb-5">
                {newAchievements.map(a => (
                  <div key={a.title} className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/10">
                    <span className="text-xl">{a.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-[#F0EDE6]">{a.title}</div>
                      <div className="text-[10px] text-white/40">{a.desc}</div>
                    </div>
                    <span className="text-sm">{a.tier === 'gold' ? '🥇' : a.tier === 'silver' ? '🥈' : '🥉'}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setShowAchievementUnlock(false)}
              className="w-full py-3 rounded-2xl bg-[#7EC87E] text-[#0D110D] text-sm font-bold active:scale-95 transition-transform">
              Awesome! 🎉
            </button>
          </div>
        </div>
      )}

      {showLevelUp && (() => {
        const tier = celebrateLevel >= 10 ? { name: 'Legend', icon: '👑', tagline: 'You\'ve reached the top. Gathr royalty.' }
          : celebrateLevel >= 6 ? { name: 'Veteran', icon: '🔥', tagline: 'A fixture in the scene. People notice.' }
          : celebrateLevel >= 3 ? { name: 'Regular', icon: '⭐', tagline: 'You\'re showing up. Keep the momentum.' }
          : { name: 'Newcomer', icon: '🌱', tagline: 'Your journey on Gathr is just getting started.' }
        return (
          <div className="fixed inset-0 bg-black/85 z-[60] flex items-center justify-center p-6" onClick={() => setShowLevelUp(false)}>
            <div className="bg-gradient-to-br from-[#2A2010] to-[#1A1408] border border-[#E8B84B]/35 rounded-3xl p-7 w-full max-w-sm text-center shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="text-7xl mb-4" style={{ filter: 'drop-shadow(0 0 20px rgba(232,184,75,0.5))' }}>{tier.icon}</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#E8B84B]/50 mb-1">Level Up</div>
              <div className="text-4xl font-bold text-[#E8B84B] mb-1">Level {celebrateLevel}</div>
              <div className="inline-block bg-[#E8B84B]/10 border border-[#E8B84B]/20 rounded-full px-3 py-0.5 text-xs font-semibold text-[#E8B84B] mb-3">{tier.name}</div>
              <div className="text-sm text-white/45 mb-7 leading-relaxed">{tier.tagline}</div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const msg = `🎉 Just hit Level ${celebrateLevel} (${tier.name}) on Gathr! ${tier.icon}`
                    if (navigator.share) navigator.share({ title: 'Gathr Level Up!', text: msg })
                    else navigator.clipboard.writeText(msg)
                  }}
                  className="flex-1 py-3 rounded-2xl bg-[#1C241C] border border-white/10 text-white/60 text-sm font-medium active:scale-95 transition-transform">
                  Share 🔗
                </button>
                <button onClick={() => setShowLevelUp(false)}
                  className="flex-1 py-3 rounded-2xl bg-[#E8B84B] text-[#0D110D] text-sm font-bold active:scale-95 transition-transform">
                  Let's Go!
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      <BottomNav />
    </div>
  )
}
