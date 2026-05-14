'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, connectionPairOr } from '@/lib/supabase'
// canvas-confetti is dynamic-imported in the handlers below to keep it
// out of the main bundle. It's only used on level-up / achievement moments.
type ConfettiFn = (opts: Record<string, unknown>) => void
let confettiCache: ConfettiFn | null = null
const fireConfetti = (opts: Record<string, unknown>) => {
  if (confettiCache) { try { confettiCache(opts) } catch {} ; return }
  import('canvas-confetti').then(mod => {
    confettiCache = (mod.default as unknown) as ConfettiFn
    try { confettiCache(opts) } catch {}
  }).catch(() => {})
}
import BottomNav from '@/components/BottomNav'
import { ProfilePageSkeleton } from '@/components/Skeleton'
import ThemeToggle from '@/components/ThemeToggle'
import UndoToast from '@/components/UndoToast'
import FadeIn from '@/components/FadeIn'
import { optimizedImgSrc, formatDateLong } from '@/lib/utils'
import { cityToTimezone, CAT_GRADIENT, FOUNDER_ID } from '@/lib/constants'



function computeAchievements(
  hostedCount: number,
  attendedCount: number,
  connCount: number,
  interests: string[],
  profile: any,
  level: number,
  uniqueAttendedCats: number,
  uniqueHostedCats: number,
  communityCount: number,
  ownedCommunityCount: number,
  bookmarkCount: number,
) {
  const safetyTier = profile?.safety_tier || 'new'
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
    { icon: '🔀', title: 'Dual Mode', desc: 'Enable both Social & Professional mode', tier: 'silver', val: profile?.profile_mode === 'both' ? 1 : 0, req: 1 },
    { icon: '💎', title: 'All-Rounder', desc: 'Host, attend & connect (5 each)', tier: 'gold', val: Math.min(hostedCount, attendedCount, connCount), req: 5 },
    { icon: '🔥', title: 'On Fire', desc: 'Reach level 5', tier: 'gold', val: level, req: 5 },
    { icon: '🚀', title: 'Power User', desc: 'Reach level 10', tier: 'gold', val: level, req: 10 },
    { icon: '📸', title: 'Avatar', desc: 'Add a profile photo', tier: 'bronze', val: profile?.avatar_url ? 1 : 0, req: 1 },
    { icon: '✍️', title: 'Storyteller', desc: 'Write your bio', tier: 'bronze', val: profile?.bio_social ? 1 : 0, req: 1 },
    // Category variety
    { icon: '🎪', title: 'Curious', desc: 'Attend events across 3 different categories', tier: 'bronze', val: uniqueAttendedCats, req: 3 },
    { icon: '🌈', title: 'Scene Explorer', desc: 'Attend events across 5 different categories', tier: 'silver', val: uniqueAttendedCats, req: 5 },
    { icon: '🎭', title: 'Renaissance Person', desc: 'Attend events across 8 different categories', tier: 'gold', val: uniqueAttendedCats, req: 8 },
    { icon: '🎨', title: 'Versatile Host', desc: 'Host events across 3 different categories', tier: 'silver', val: uniqueHostedCats, req: 3 },
    // Community
    { icon: '🏘️', title: 'Group Member', desc: 'Join your first community', tier: 'bronze', val: communityCount, req: 1 },
    { icon: '🌿', title: 'Community Regular', desc: 'Join 3 communities', tier: 'silver', val: communityCount, req: 3 },
    { icon: '🌐', title: 'Town Square', desc: 'Join 5 communities', tier: 'gold', val: communityCount, req: 5 },
    { icon: '🏛️', title: 'Community Founder', desc: 'Create your first community', tier: 'bronze', val: ownedCommunityCount, req: 1 },
    // Bookmarks
    { icon: '🔖', title: 'First Save', desc: 'Bookmark your first event', tier: 'bronze', val: bookmarkCount, req: 1 },
    { icon: '🗂️', title: 'Curator', desc: 'Bookmark 5 events', tier: 'silver', val: bookmarkCount, req: 5 },
    // Safety tier
    { icon: '🛡️', title: 'Trusted Member', desc: 'Reach Verified safety tier', tier: 'silver', val: (safetyTier === 'verified' || safetyTier === 'trusted') ? 1 : 0, req: 1 },
    { icon: '💠', title: 'Community Pillar', desc: 'Reach Trusted safety tier', tier: 'gold', val: safetyTier === 'trusted' ? 1 : 0, req: 1 },
  ]
}

function TierIcon({ level, size = 24 }: { level: number; size?: number }) {
  if (level >= 10) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24"
        style={{ filter: 'drop-shadow(0 0 7px rgba(232,184,75,0.9)) drop-shadow(0 0 14px rgba(232,184,75,0.4))' }}>
        <path d="M2 20h20v-2H2z" fill="#E8B84B"/>
        <path d="M3 18L4 9l5 5.5 3-9.5 3 9.5L20 9l1 9H3z" fill="#E8B84B"/>
        <path d="M7 18l1-5 4 4.5 4-4.5 1 5" fill="rgba(255,255,255,0.15)"/>
      </svg>
    )
  }
  if (level >= 5) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24"
        style={{ filter: 'drop-shadow(0 0 6px rgba(232,184,75,0.85)) drop-shadow(0 0 12px rgba(232,184,75,0.35))' }}>
        <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" fill="#E8B84B"/>
        <polygon points="13,2 8,14 12,14 11.5,18 15,10 12,10" fill="rgba(255,255,255,0.2)"/>
      </svg>
    )
  }
  if (level >= 3) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24"
        style={{ filter: 'drop-shadow(0 0 5px rgba(232,184,75,0.80)) drop-shadow(0 0 10px rgba(232,184,75,0.30))' }}>
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="#E8B84B"/>
        <polygon points="12,2 13.5,8.26 17,9.27 14,13 12,17.77 10,13 7,9.27 10.5,8.26" fill="rgba(255,255,255,0.18)"/>
      </svg>
    )
  }
  // Level 1–2: sprout
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      style={{ filter: 'drop-shadow(0 0 4px rgba(126,200,126,0.70))' }}>
      <path d="M12 22v-9" stroke="#7EC87E" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M12 13c-2.5-2.5-7-1.5-7 2s3.5 5 7 5 7-1.5 7-5-4.5-4.5-7-2z" fill="#7EC87E"/>
      <path d="M12 13c0-3-3-5-3-8a3 3 0 0 1 6 0c0 3-3 5-3 8z" fill="#7EC87E"/>
    </svg>
  )
}

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [hostedEvents, setHostedEvents] = useState<any[]>([])
  const [attendedEvents, setAttendedEvents] = useState<any[]>([])
  const [connections, setConnections] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState(() => {
    try { return parseInt(sessionStorage.getItem('gathr_profile_tab') || '0') || 0 } catch { return 0 }
  })
  const [loading, setLoading] = useState(true)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [celebrateLevel, setCelebrateLevel] = useState(0)
  const [trialGranted, setTrialGranted] = useState<{ level: number; hours: number; label: string } | null>(null)
  const [xpBarWidth, setXpBarWidth] = useState(0)
  const [newAchievements, setNewAchievements] = useState<any[]>([])
  const [showAchievementUnlock, setShowAchievementUnlock] = useState(false)
  const [communityCount, setCommunityCount] = useState(0)
  const [ownedCommunityCount, setOwnedCommunityCount] = useState(0)
  const [bookmarkCount, setBookmarkCount] = useState(0)
  const [pinnedBadges, setPinnedBadges] = useState<string[]>([])
  const [hasDraft, setHasDraft] = useState(false)
  const [showDraftUndo, setShowDraftUndo] = useState(false)
  const [showAvatarExpanded, setShowAvatarExpanded] = useState(false)
  const confettiTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const router = useRouter()

  const lastLoadAtRef = useRef<number>(0)
  useEffect(() => {
    const loadData = () => {
      lastLoadAtRef.current = Date.now()
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) { router.push('/auth'); return }
        setUser(session.user)
        fetchAll(session.user.id)
      })
    }

    loadData()

    // Only refetch on visibility change if the data is at least 60s stale.
    // Previously this refetched on every tab focus which was wasteful for users
    // who switch back to Gathr every few seconds.
    const STALE_MS = 60_000
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastLoadAtRef.current < STALE_MS) return
      loadData()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => { document.removeEventListener('visibilitychange', handleVisibility) }
  }, [router])

  useEffect(() => {
    if (loading) return
    try {
      const interests = profile?.interests || []
      const hostedCount = profile?.hosted_count ?? hostedEvents.length
      const attendedCount = profile?.attended_count ?? attendedEvents.length
      const xpVal = (hostedCount * 10) + (attendedCount * 5) + (connections.length * 3) + (interests.length * 2)
      const levelVal = Math.floor(xpVal / 50) + 1

      const storedLevel = parseInt(localStorage.getItem('gathr_user_level') || '0')
      if (storedLevel > 0 && levelVal > storedLevel) {
        // Server validates eligibility and writes gathr_plus_expires_at — no localStorage bypass possible
        supabase.functions.invoke('claim-level-trial').then(({ data }) => {
          if (data?.granted) setTrialGranted(data.granted)
        }).catch(() => {})
        setCelebrateLevel(levelVal)
        setShowLevelUp(true)
        confettiTimersRef.current.push(setTimeout(() => fireConfetti({ zIndex: 9999, particleCount: 160, spread: 75, origin: { y: 0.55 }, colors: ['#E8B84B', '#7EC87E', '#F0EDE6', '#E8B84B', '#FFD700'] }), 50))
      }
      localStorage.setItem('gathr_user_level', String(levelVal))

      const uniqueAttendedCats = new Set(attendedEvents.map((e: any) => e.category)).size
      const uniqueHostedCats = new Set(hostedEvents.map((e: any) => e.category)).size
      const allAch = computeAchievements(hostedCount, attendedCount, connections.length, interests, profile, levelVal, uniqueAttendedCats, uniqueHostedCats, communityCount, ownedCommunityCount, bookmarkCount)
      const seenRaw = localStorage.getItem('gathr_seen_achievements')
      const seen: string[] = seenRaw ? JSON.parse(seenRaw) : []
      const fresh = allAch.filter(a => a.val >= a.req && !seen.includes(a.title))
      if (fresh.length > 0) {
        setNewAchievements(fresh)
        setShowAchievementUnlock(true)
        const count = Math.min(fresh.length, 4)
        for (let i = 0; i < count; i++) {
          confettiTimersRef.current.push(setTimeout(() => fireConfetti({ zIndex: 9999, particleCount: 80, spread: 50, origin: { y: 0.6 }, colors: ['#7EC87E', '#E8B84B', '#F0EDE6'] }), i * 450 + 50))
        }
      } else if (!seenRaw) {
        localStorage.setItem('gathr_seen_achievements', JSON.stringify([]))
      }
      // Seen list is updated only when the modal is dismissed (see dismiss handler) so achievements
      // re-show if the user navigates away without tapping the button.
    } catch {}
    return () => { confettiTimersRef.current.forEach(clearTimeout); confettiTimersRef.current = [] }
  }, [loading, hostedEvents.length, attendedEvents.length, connections.length, communityCount, profile?.interests?.length, profile?.profile_mode, !!profile?.avatar_url, !!profile?.bio_social])

  useEffect(() => {
    if (activeTab !== 2) return
    setXpBarWidth(0)
    const t = setTimeout(() => {
      const hc = profile?.hosted_count ?? hostedEvents.length
      const ac = profile?.attended_count ?? attendedEvents.length
      const xpVal = (hc * 10) + (ac * 5) + (connections.length * 3) + ((profile?.interests || []).length * 2)
      setXpBarWidth(Math.round(((xpVal % 50) / 50) * 100))
    }, 120)
    return () => clearTimeout(t)
  }, [activeTab, profile?.hosted_count, profile?.attended_count, hostedEvents.length, attendedEvents.length, connections.length, profile?.interests?.length])


  const fetchAll = async (userId: string) => {
    const [profileRes, hostedRes, rsvpRes, connRes, communityRes, draftRes, ownedRes, bmRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('events').select('id,title,category,start_datetime,location_name,cover_url,spots_left,capacity,city').eq('host_id', userId).order('start_datetime', { ascending: false }).limit(50),
      supabase.from('rsvps').select('event_id').eq('user_id', userId).limit(200),
      supabase.from('connections')
        .select('requester_id, addressee_id')
        .or(connectionPairOr(userId))
        .eq('status', 'accepted'),
      supabase.from('community_members').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('event_drafts').select('id').eq('user_id', userId).limit(1),
      supabase.from('community_members').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('role', 'owner'),
      supabase.from('event_bookmarks').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    ])
    setHasDraft((draftRes.data?.length ?? 0) > 0)
    if (communityRes.count !== null) setCommunityCount(communityRes.count)
    if (ownedRes.count !== null) setOwnedCommunityCount(ownedRes.count)
    if (bmRes.count !== null) setBookmarkCount(bmRes.count)

    if (profileRes.data) {
      setProfile(profileRes.data)
      setPinnedBadges(profileRes.data.pinned_badges || [])
    }
    if (hostedRes.data) setHostedEvents(hostedRes.data)

    if (rsvpRes.data && rsvpRes.data.length > 0) {
      const eventIds = rsvpRes.data.map((r: any) => r.event_id)
      const { data: attended } = await supabase
        .from('events').select('id,title,category,start_datetime,location_name,cover_url,spots_left,capacity,city').in('id', eventIds).order('start_datetime', { ascending: false }).limit(200)
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
    const { error } = await supabase.from('profiles').update({ profile_mode: next }).eq('id', user.id)
    if (error) setProfile((p: any) => ({ ...p, profile_mode: current }))
  }

  const handleTogglePin = async (title: string) => {
    if (!user) return
    const prev = pinnedBadges
    let next: string[]
    if (pinnedBadges.includes(title)) {
      next = pinnedBadges.filter(t => t !== title)
    } else {
      if (pinnedBadges.length >= 3) return
      next = [...pinnedBadges, title]
    }
    setPinnedBadges(next)
    const { error } = await supabase.from('profiles').update({ pinned_badges: next }).eq('id', user.id)
    if (error) setPinnedBadges(prev)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const handleDiscardDraft = () => {
    // Optimistic hide; the actual delete happens when the undo toast commits
    if (!user) return
    setHasDraft(false)
    setShowDraftUndo(true)
  }

  const commitDraftDelete = async () => {
    if (!user) return
    await supabase.from('event_drafts').delete().eq('user_id', user.id)
    const { data: files } = await supabase.storage.from('event-covers').list(`drafts/${user.id}`)
    if (files && files.length > 0) {
      await supabase.storage.from('event-covers').remove(files.map((f: any) => `drafts/${user.id}/${f.name}`))
    }
  }

  const undoDraftDelete = () => { setHasDraft(true) }


  if (loading) return <ProfilePageSkeleton />

  const interests: string[] = profile?.interests || []
  const isSocial = profile?.profile_mode === 'social' || profile?.profile_mode === 'both' || !profile?.profile_mode
  const isProfessional = profile?.profile_mode === 'professional' || profile?.profile_mode === 'both'

  const hostedCount = profile?.hosted_count ?? hostedEvents.length
  const attendedCount = profile?.attended_count ?? attendedEvents.length
  const xp = (hostedCount * 10) + (attendedCount * 5) + (connections.length * 3) + (interests.length * 2)
  const level = Math.floor(xp / 50) + 1
  const xpInLevel = xp % 50
  const xpToNext = 50

  const uniqueAttendedCats = new Set(attendedEvents.map((e: any) => e.category)).size
  const uniqueHostedCats = new Set(hostedEvents.map((e: any) => e.category)).size
  const ACHIEVEMENTS = computeAchievements(hostedCount, attendedCount, connections.length, interests, profile, level, uniqueAttendedCats, uniqueHostedCats, communityCount, ownedCommunityCount, bookmarkCount)

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
    <FadeIn className="min-h-screen bg-[#0D110D] pb-24">

      <div style={{ background: 'var(--gradient-profile-header)' }}>
        <div className="flex items-start justify-between px-4 pt-14 mb-3">
          <div className="flex items-center gap-2">
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
            <ThemeToggle className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white/50 active:scale-95 transition-transform" />
          </div>
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
          {optimizedImgSrc(profile?.avatar_url, 128) ? (
            <button onClick={() => setShowAvatarExpanded(true)} className="mb-3 active:scale-95 transition-transform">
              <img src={optimizedImgSrc(profile?.avatar_url, 128)!} alt="" className="w-16 h-16 rounded-2xl border-2 border-[#E8B84B]/35 object-cover" loading="lazy" />
            </button>
          ) : (
            <div className="w-16 h-16 bg-[#2A4A2A] rounded-2xl border-2 border-[#E8B84B]/35 flex items-center justify-center mb-3">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(126,200,126,0.5)" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6"/></svg>
            </div>
          )}
          <div className="font-bold text-[#F0EDE6] text-lg">{profile?.name || 'Your Name'}</div>
          <div className="text-xs text-white/45 mt-1">@{profile?.name?.toLowerCase().replace(/\s/g, '')} · {profile?.city || 'Bellingham, WA'}</div>
          {profile?.bio_social && (
            <div className="text-sm text-white/60 mt-2 leading-relaxed font-light">{profile.bio_social}</div>
          )}
          <div className="flex gap-2 mt-3">
            <button onClick={() => handleToggleMode('social')}
              className={'flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg border transition-all active:scale-95 ' +
                (isSocial ? 'bg-[#2A4A2A]/60 border-[#7EC87E]/40 text-[#7EC87E]' : 'bg-white/5 border-white/10 text-white/30')}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Social
            </button>
            <button onClick={() => handleToggleMode('professional')}
              className={'flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg border transition-all active:scale-95 ' +
                (isProfessional ? 'bg-[#2A4A2A]/60 border-[#7EC87E]/40 text-[#7EC87E]' : 'bg-white/5 border-white/10 text-white/30')}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
              Professional
            </button>
            <div className="ml-auto flex items-center gap-1.5 bg-[#2A2010]/60 border border-[#E8B84B]/20 rounded-lg px-2.5 py-1">
              <span className="text-[10px] text-[#E8B84B] font-bold">Lv.{level}</span>
              <span className="text-[9px] text-white/30">{xp} XP</span>
            </div>
          </div>
          {(user?.id === FOUNDER_ID || pinnedBadges.length > 0) && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {user?.id === FOUNDER_ID && (
                <span className="founder-badge-pill text-[10px] px-2.5 py-1 rounded-lg border font-bold text-[#E8B84B] border-[#E8B84B]/60">
                  ✦ Gathr Founder
                </span>
              )}
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
          { num: hostedCount, label: 'Hosted' },
          { num: attendedCount, label: 'RSVPs' },
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
          <button key={tab} onClick={() => { setActiveTab(i); try { sessionStorage.setItem('gathr_profile_tab', String(i)) } catch {} }}
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
                    <div className="category-gradient-card w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden relative"
                      style={{ '--cat-bg': CAT_GRADIENT[event.category] || CAT_GRADIENT['Social'] } as React.CSSProperties} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#F0EDE6] truncate">{event.title}</div>
                      <div className="text-xs text-white/40 mt-0.5">{formatDateLong(event.start_datetime, cityToTimezone(event.city))}</div>
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
            {hasDraft && (
              <div className="w-full bg-[#1C1E10] border border-[#E8B84B]/25 rounded-2xl p-3.5 flex items-center gap-2">
                <button onClick={() => router.push('/create')} className="flex items-center gap-3 flex-1 min-w-0 active:opacity-70 transition-opacity text-left">
                  <div className="w-9 h-9 bg-[#E8B84B]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E8B84B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-[#E8B84B]/60 font-medium mb-0.5">Unsaved Draft</div>
                    <div className="text-sm text-[#F0EDE6]">Resume creating your event</div>
                  </div>
                </button>
                <button
                  onClick={handleDiscardDraft}
                  className="w-8 h-8 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center text-red-400/70 active:scale-95 transition-transform flex-shrink-0"
                  title="Delete draft">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
              </div>
            )}
            {hostedEvents.length > 0 && (
              <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5">
                <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2.5 font-medium">Hosted by you</div>
                {hostedEvents.map(event => (
                  <div key={event.id} onClick={() => router.push('/events/' + event.id)}
                    className="flex items-center gap-3 py-2.5 border-b border-white/10 last:border-0 cursor-pointer active:opacity-70">
                    <div className="category-gradient-card w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden relative"
                      style={{ '--cat-bg': CAT_GRADIENT[event.category] || CAT_GRADIENT['Social'] } as React.CSSProperties} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#F0EDE6] truncate">{event.title}</div>
                      <div className="text-xs text-white/40 mt-0.5">{formatDateLong(event.start_datetime, cityToTimezone(event.city))} · {event.location_name}</div>
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
                    <div className="category-gradient-card w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden relative"
                      style={{ '--cat-bg': CAT_GRADIENT[event.category] || CAT_GRADIENT['Social'] } as React.CSSProperties} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#F0EDE6] truncate">{event.title}</div>
                      <div className="text-xs text-white/40 mt-0.5">{formatDateLong(event.start_datetime, cityToTimezone(event.city))} · {event.location_name}</div>
                    </div>
                    <span className="text-[9px] bg-[#7EC87E]/10 text-[#7EC87E] px-2 py-0.5 rounded border border-[#7EC87E]/20 flex-shrink-0">Going</span>
                  </div>
                ))}
              </div>
            )}

            {hostedEvents.length === 0 && attendedEvents.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-14 h-14 bg-[#1C241C] border border-white/10 rounded-2xl flex items-center justify-center mx-auto">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
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
                  <TierIcon level={level} size={32} />
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
                {([
                  {
                    num: hostedCount, label: 'Events Hosted', xp: hostedCount * 10,
                    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(232,184,75,0.55)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M12 14v4M10 16h4"/></svg>,
                  },
                  {
                    num: attendedCount, label: 'Events Attended', xp: attendedCount * 5,
                    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(232,184,75,0.55)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/></svg>,
                  },
                  {
                    num: connections.length, label: 'Connections', xp: connections.length * 3,
                    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(232,184,75,0.55)" strokeWidth="1.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
                  },
                  {
                    num: interests.length, label: 'Interests', xp: interests.length * 2,
                    icon: <span style={{ fontSize: 15, color: 'rgba(232,184,75,0.55)', lineHeight: 1 }}>✦</span>,
                  },
                ] as { num: number; label: string; xp: number; icon: React.ReactNode }[]).map(item => (
                  <div key={item.label} className="bg-[#0D110D] border border-white/10 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      {item.icon}
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
                {user?.id === FOUNDER_ID && (
                  <div className="founder-badge-card flex items-center gap-3 p-3.5 rounded-2xl border border-[#E8B84B]/60">
                    <div className="founder-badge-icon w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#E8B84B">
                        <path d="M12 2L14.4 8.9H21.7L16 13.1L18.4 20L12 15.8L5.6 20L8 13.1L2.3 8.9H9.6L12 2Z"/>
                        <path d="M12 2L14.4 8.9H21.7L16 13.1L18.4 20L12 15.8L5.6 20L8 13.1L2.3 8.9H9.6L12 2Z" fill="rgba(255,255,255,0.18)"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-[#E8B84B] tracking-wide">Gathr Founder</div>
                      <div className="text-[10px] text-[#E8B84B]/50 mt-0.5">Founder &amp; CEO · Exclusive Badge</div>
                    </div>
                    <span className="text-[8px] px-2 py-1 rounded-lg border font-bold text-[#E8B84B] border-[#E8B84B]/40 uppercase tracking-widest flex-shrink-0">OG</span>
                  </div>
                )}
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
                              {ach.tier === 'gold' ? 'Gold' : ach.tier === 'silver' ? 'Silver' : 'Bronze'}
                            </span>
                            <button onClick={() => handleTogglePin(ach.title)}
                              className={'text-[8px] px-1.5 py-0.5 rounded border transition-all ' + (pinnedBadges.includes(ach.title) ? 'border-[#E8B84B]/40 text-[#E8B84B] bg-[#E8B84B]/10' : 'border-white/10 text-white/25')}>
                              {pinnedBadges.includes(ach.title) ? 'Pinned' : pinnedBadges.length >= 3 ? '—' : 'Pin'}
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
                      {optimizedImgSrc(conn.avatar_url, 96) ? (
                        <img src={optimizedImgSrc(conn.avatar_url, 96)!} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0"  loading="lazy" />
                      ) : (
                        <div className="w-10 h-10 bg-[#2A4A2A] rounded-xl flex items-center justify-center text-base font-semibold text-[#7EC87E] flex-shrink-0">
                          {conn.name?.charAt(0) || '?'}
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
                <div className="w-14 h-14 bg-[#1C241C] border border-white/10 rounded-2xl flex items-center justify-center mx-auto">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
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
                {newAchievements.length === 1 ? newAchievements[0].icon : (
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(126,200,126,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
                  </svg>
                )}
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
                  {newAchievements[0].tier === 'gold' ? 'Gold' : newAchievements[0].tier === 'silver' ? 'Silver' : 'Bronze'}
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
                    <span className={'text-[9px] px-2 py-0.5 rounded font-semibold ' + (a.tier === 'gold' ? 'text-[#E8B84B]' : a.tier === 'silver' ? 'text-[#A0AEC0]' : 'text-[#CD7F32]')}>
                      {a.tier === 'gold' ? 'Gold' : a.tier === 'silver' ? 'Silver' : 'Bronze'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => {
              setShowAchievementUnlock(false)
              try {
                const allUnlocked = computeAchievements(hostedCount, attendedCount, connections.length, profile?.interests || [], profile, Math.floor(((hostedCount * 10) + (attendedCount * 5) + (connections.length * 3) + ((profile?.interests || []).length * 2)) / 50) + 1, new Set(attendedEvents.map((e: any) => e.category)).size, new Set(hostedEvents.map((e: any) => e.category)).size, communityCount, ownedCommunityCount, bookmarkCount).filter(a => a.val >= a.req).map(a => a.title)
                localStorage.setItem('gathr_seen_achievements', JSON.stringify(allUnlocked))
              } catch {}
            }}
              className="w-full py-3 rounded-2xl bg-[#7EC87E] text-[#0D110D] text-sm font-bold active:scale-95 transition-transform">
              Awesome!
            </button>
          </div>
        </div>
      )}

      {showLevelUp && (() => {
        const tier = celebrateLevel >= 10 ? { name: 'Legend', tagline: 'You\'ve reached the top. Gathr royalty.' }
          : celebrateLevel >= 6 ? { name: 'Veteran', tagline: 'A fixture in the scene. People notice.' }
          : celebrateLevel >= 3 ? { name: 'Regular', tagline: 'You\'re showing up. Keep the momentum.' }
          : { name: 'Newcomer', tagline: 'Your journey on Gathr is just getting started.' }
        return (
          <div className="fixed inset-0 bg-black/85 z-[60] flex items-center justify-center p-6" onClick={() => { setShowLevelUp(false); setTrialGranted(null) }}>
            <div className="bg-gradient-to-br from-[#2A2010] to-[#1A1408] border border-[#E8B84B]/35 rounded-3xl p-7 w-full max-w-sm text-center shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="mb-4 flex justify-center" style={{ filter: 'drop-shadow(0 0 20px rgba(232,184,75,0.5))' }}>
                <TierIcon level={celebrateLevel} size={72} />
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#E8B84B]/50 mb-1">Level Up</div>
              <div className="text-4xl font-bold text-[#E8B84B] mb-1">Level {celebrateLevel}</div>
              <div className="inline-block bg-[#E8B84B]/10 border border-[#E8B84B]/20 rounded-full px-3 py-0.5 text-xs font-semibold text-[#E8B84B] mb-3">{tier.name}</div>
              <div className="text-sm text-white/45 mb-4 leading-relaxed">{tier.tagline}</div>
              {trialGranted && (
                <div className="bg-[#E8B84B]/10 border border-[#E8B84B]/25 rounded-2xl p-3.5 mb-5 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">✦</span>
                    <span className="text-xs font-bold text-[#E8B84B]">Gathr+ Preview Unlocked</span>
                  </div>
                  <p className="text-[11px] text-white/45 leading-relaxed">
                    You've earned a {trialGranted.label} Gathr+ preview — mystery matches, waves, and full match lists are now on.
                  </p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const msg = `Just hit Level ${celebrateLevel} (${tier.name}) on Gathr!`
                    if (navigator.share) navigator.share({ title: 'Gathr Level Up!', text: msg })
                    else navigator.clipboard.writeText(msg)
                  }}
                  className="flex-1 py-3 rounded-2xl bg-[#1C241C] border border-white/10 text-white/60 text-sm font-medium active:scale-95 transition-transform">
                  Share
                </button>
                <button onClick={() => { setShowLevelUp(false); setTrialGranted(null) }}
                  className="flex-1 py-3 rounded-2xl bg-[#E8B84B] text-[#0D110D] text-sm font-bold active:scale-95 transition-transform">
                  Let's Go!
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      <UndoToast
        open={showDraftUndo}
        message="Draft deleted"
        onUndo={() => undoDraftDelete()}
        onCommit={() => { commitDraftDelete() }}
        onClose={() => setShowDraftUndo(false)}
      />

      {showAvatarExpanded && profile?.avatar_url && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm" onClick={() => setShowAvatarExpanded(false)}>
          <img src={optimizedImgSrc(profile.avatar_url, 600) ?? profile.avatar_url} alt="" className="w-72 h-72 rounded-3xl object-cover border-2 border-[#E8B84B]/40 shadow-2xl" style={{ boxShadow: '0 0 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(232,184,75,0.2)' }} />
        </div>
      )}

      <BottomNav />
    </FadeIn>
  )
}
