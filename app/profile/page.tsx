'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'

const ALL_INTERESTS = [
  'Hiking', 'Coffee', 'Tech', 'Music', 'Art', 'Food', 'Gaming', 'Fitness',
  'Travel', 'Photography', 'Reading', 'Movies', 'Yoga', 'Cycling', 'Cooking',
  'Dancing', 'Volunteering', 'Networking', 'Entrepreneurship', 'Design',
  'Outdoors', 'Sports', 'Wellness', 'Fashion', 'Podcasts',
]

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [hostedEvents, setHostedEvents] = useState<any[]>([])
  const [attendedEvents, setAttendedEvents] = useState<any[]>([])
  const [connections, setConnections] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [editingInterests, setEditingInterests] = useState(false)
  const [savingInterests, setSavingInterests] = useState(false)
  const [savingMode, setSavingMode] = useState(false)
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
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', loadData)
    window.addEventListener('popstate', loadData)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', loadData)
      window.removeEventListener('popstate', loadData)
    }
  }, [])

  const fetchAll = async (userId: string) => {
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (profileData) setProfile(profileData)

    const { data: hosted } = await supabase.from('events').select('*').eq('host_id', userId).order('start_datetime', { ascending: false })
    if (hosted) setHostedEvents(hosted)

    const { data: rsvps } = await supabase.from('rsvps').select('event_id').eq('user_id', userId)
    if (rsvps && rsvps.length > 0) {
      const eventIds = rsvps.map((r: any) => r.event_id)
      const { data: attended } = await supabase.from('events').select('*').in('id', eventIds).order('start_datetime', { ascending: false })
      if (attended) setAttendedEvents(attended)
    }

    const { data: connData } = await supabase.from('connections').select('requester_id, addressee_id')
      .or('requester_id.eq.' + userId + ',addressee_id.eq.' + userId).eq('status', 'accepted')
    if (connData && connData.length > 0) {
      const otherIds = connData.map((c: any) => c.requester_id === userId ? c.addressee_id : c.requester_id)
      const { data: connProfiles } = await supabase.from('profiles').select('id, name, bio_social, city, profile_mode').in('id', otherIds)
      if (connProfiles) setConnections(connProfiles)
    }

    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const handleToggleMode = async (mode: 'social' | 'professional') => {
    if (!user || !profile || savingMode) return
    setSavingMode(true)
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
    setSavingMode(false)
  }

  const handleToggleInterest = async (interest: string) => {
    if (!user || !profile) return
    const current: string[] = profile.interests || []
    const updated = current.includes(interest)
      ? current.filter((i: string) => i !== interest)
      : [...current, interest]
    setProfile((p: any) => ({ ...p, interests: updated }))
    setSavingInterests(true)
    await supabase.from('profiles').update({ interests: updated }).eq('id', user.id)
    setSavingInterests(false)
  }

  const formatDate = (dt: string) => new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const isSocial = profile?.profile_mode === 'social' || profile?.profile_mode === 'both' || !profile?.profile_mode
  const isProfessional = profile?.profile_mode === 'professional' || profile?.profile_mode === 'both'
  const interests: string[] = profile?.interests || []

  const achievements = [
    { icon: '🎉', title: 'First Event', desc: 'Created your first event', unlocked: hostedEvents.length >= 1 },
    { icon: '🎙', title: 'Host with the Most', desc: 'Hosted 5 events', unlocked: hostedEvents.length >= 5 },
    { icon: '🌟', title: 'Community Builder', desc: 'Hosted 10 events', unlocked: hostedEvents.length >= 10 },
    { icon: '🏆', title: 'Super Host', desc: 'Hosted 25 events', unlocked: hostedEvents.length >= 25 },
    { icon: '👟', title: 'First Steps', desc: 'RSVPd to your first event', unlocked: attendedEvents.length >= 1 },
    { icon: '⭐', title: 'Regular', desc: 'Attended 10 events', unlocked: attendedEvents.length >= 10 },
    { icon: '🔥', title: 'Event Veteran', desc: 'Attended 25 events', unlocked: attendedEvents.length >= 25 },
    { icon: '👋', title: 'First Connection', desc: 'Made your first connection', unlocked: connections.length >= 1 },
    { icon: '🤝', title: 'Connector', desc: 'Made 5 connections', unlocked: connections.length >= 5 },
    { icon: '🦋', title: 'Social Butterfly', desc: 'Made 20 connections', unlocked: connections.length >= 20 },
    { icon: '🎨', title: 'Explorer', desc: 'Added 5+ interests', unlocked: interests.length >= 5 },
    { icon: '💎', title: 'All-Rounder', desc: 'Host, attend & connect', unlocked: hostedEvents.length >= 1 && attendedEvents.length >= 1 && connections.length >= 1 },
  ]

  const unlockedCount = achievements.filter(a => a.unlocked).length

  if (loading) return (
    <div className="min-h-screen bg-[#0D110D] flex items-center justify-center">
      <div className="text-[#E8B84B] text-2xl font-bold">Gathr.</div>
    </div>
  )

  const tabs = ['Overview', 'Events', 'Achievements', 'Connections']

  return (
    <div className="min-h-screen bg-[#0D110D] pb-24">

      {/* Hero */}
      <div style={{ background: 'linear-gradient(160deg,#1A2E1A 0%,#0D110D 65%)' }}>
        <div className="flex items-start justify-between px-4 pt-14 mb-3">
          <div></div>
          <div className="flex gap-2">
            <button onClick={() => router.push('/notifications')}
              className="w-8 h-8 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-sm">🔔</button>
            <button onClick={() => router.push('/settings')}
              className="w-8 h-8 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-sm">⚙️</button>
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

          {/* Side-by-side mode toggles */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => handleToggleMode('social')}
              className={'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all active:scale-95 ' + (isSocial ? 'bg-[#2A4A2A]/60 border-[#7EC87E]/30 text-[#7EC87E]' : 'bg-white/5 border-white/10 text-white/30')}>
              👋 Social
            </button>
            <button
              onClick={() => handleToggleMode('professional')}
              className={'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all active:scale-95 ' + (isProfessional ? 'bg-[#2A4A2A]/60 border-[#7EC87E]/30 text-[#7EC87E]' : 'bg-white/5 border-white/10 text-white/30')}>
              💼 Professional
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex border-t border-b border-white/10">
        {[
          { num: hostedEvents.length, label: 'Hosted' },
          { num: attendedEvents.length, label: 'Attended' },
          { num: connections.length, label: 'Connections' },
          { num: unlockedCount + '/' + achievements.length, label: 'Badges' },
        ].map((stat, i) => (
          <div key={stat.label} className={'flex-1 text-center py-3 ' + (i < 3 ? 'border-r border-white/10' : '')}>
            <div className="font-bold text-[#E8B84B] text-base">{stat.num}</div>
            <div className="text-[9px] text-white/40 mt-0.5 uppercase tracking-wide">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {tabs.map((tab, i) => (
          <button key={tab} onClick={() => setActiveTab(i)}
            className={'flex-1 py-2.5 text-[10px] text-center border-b-2 -mb-px transition-colors ' + (activeTab === i ? 'text-[#E8B84B] border-[#E8B84B]' : 'text-white/40 border-transparent')}>
            {tab}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-3">

        {/* Overview */}
        {activeTab === 0 && (
          <>
            {/* Interests with inline edit */}
            <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5">
              <div className="flex items-center justify-between mb-2.5">
                <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium">
                  Interests {savingInterests && <span className="text-[#E8B84B]/50 normal-case tracking-normal">saving…</span>}
                </div>
                <button onClick={() => setEditingInterests(!editingInterests)}
                  className={'text-[10px] px-2.5 py-1 rounded-lg border transition-colors ' + (editingInterests ? 'bg-[#E8B84B]/15 border-[#E8B84B]/25 text-[#E8B84B]' : 'bg-white/5 border-white/10 text-white/40')}>
                  {editingInterests ? 'Done' : '+ Edit'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {interests.map(interest => (
                  <button key={interest}
                    onClick={() => editingInterests && handleToggleInterest(interest)}
                    className={'text-xs px-2.5 py-1 rounded-lg border transition-all ' + (editingInterests ? 'bg-[#E85B5B]/10 border-[#E85B5B]/20 text-[#E85B5B]' : 'bg-[#2A4A2A]/35 border-[#7EC87E]/10 text-[#7EC87E]')}>
                    {interest}{editingInterests && ' ×'}
                  </button>
                ))}
                {interests.length === 0 && !editingInterests && (
                  <button onClick={() => setEditingInterests(true)}
                    className="text-xs text-white/30 border border-dashed border-white/15 px-3 py-1 rounded-lg">
                    + Add interests
                  </button>
                )}
              </div>
              {editingInterests && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="text-[9px] text-white/30 mb-2 uppercase tracking-wider">Add more</div>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_INTERESTS.filter(i => !interests.includes(i)).map(interest => (
                      <button key={interest} onClick={() => handleToggleInterest(interest)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 text-white/50 active:bg-[#7EC87E]/10 active:border-[#7EC87E]/20 active:text-[#7EC87E] transition-colors">
                        + {interest}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {hostedEvents.length > 0 && (
              <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5">
                <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2.5 font-medium">Recent Events</div>
                {hostedEvents.slice(0, 3).map(event => (
                  <div key={event.id} onClick={() => router.push('/events/' + event.id)}
                    className="flex items-center gap-3 py-2 border-b border-white/10 last:border-0 cursor-pointer">
                    <div className="w-9 h-9 bg-[#1E3A1E] rounded-xl flex items-center justify-center text-base flex-shrink-0">🎉</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#F0EDE6] truncate">{event.title}</div>
                      <div className="text-xs text-white/40 mt-0.5">{formatDate(event.start_datetime)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={handleSignOut}
              className="w-full bg-[#1C241C] border border-white/10 rounded-2xl py-4 text-[#E85B5B] text-sm font-medium">
              Sign Out
            </button>
          </>
        )}

        {/* Events */}
        {activeTab === 1 && (
          <>
            {hostedEvents.length > 0 && (
              <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5">
                <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2.5 font-medium">Hosted by you</div>
                {hostedEvents.map(event => (
                  <div key={event.id} onClick={() => router.push('/events/' + event.id)}
                    className="flex items-center gap-3 py-2.5 border-b border-white/10 last:border-0 cursor-pointer">
                    <div className="w-10 h-10 bg-[#1E3A1E] rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                      {event.category === 'Music' ? '🎸' : event.category === 'Fitness' ? '🏃' : event.category === 'Food & Drink' ? '🍺' : '🎉'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#F0EDE6] truncate">{event.title}</div>
                      <div className="text-xs text-white/40 mt-0.5">{formatDate(event.start_datetime)} · {event.location_name}</div>
                    </div>
                    <span className="text-[9px] bg-[#E8B84B]/10 text-[#E8B84B] px-2 py-0.5 rounded border border-[#E8B84B]/20">Host</span>
                  </div>
                ))}
              </div>
            )}

            {attendedEvents.length > 0 && (
              <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5">
                <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2.5 font-medium">RSVPd to</div>
                {attendedEvents.map(event => (
                  <div key={event.id} onClick={() => router.push('/events/' + event.id)}
                    className="flex items-center gap-3 py-2.5 border-b border-white/10 last:border-0 cursor-pointer">
                    <div className="w-10 h-10 bg-[#1E3A1E] rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                      {event.category === 'Music' ? '🎸' : event.category === 'Fitness' ? '🏃' : '🎉'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#F0EDE6] truncate">{event.title}</div>
                      <div className="text-xs text-white/40 mt-0.5">{formatDate(event.start_datetime)} · {event.location_name}</div>
                    </div>
                    <span className="text-[9px] bg-[#7EC87E]/10 text-[#7EC87E] px-2 py-0.5 rounded border border-[#7EC87E]/20">Going</span>
                  </div>
                ))}
              </div>
            )}

            {hostedEvents.length === 0 && attendedEvents.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="text-4xl">📅</div>
                <p className="text-white/40 text-sm text-center">No events yet</p>
                <button onClick={() => router.push('/create')}
                  className="mt-2 bg-[#E8B84B] text-[#0D110D] px-5 py-2.5 rounded-2xl font-semibold text-sm">
                  Create Your First Event
                </button>
              </div>
            )}
          </>
        )}

        {/* Achievements */}
        {activeTab === 2 && (
          <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium">Your Badges</div>
              <div className="text-xs text-[#E8B84B]">{unlockedCount} / {achievements.length}</div>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full mb-4 overflow-hidden">
              <div className="h-full bg-[#E8B84B] rounded-full transition-all"
                style={{ width: (unlockedCount / achievements.length * 100) + '%' }} />
            </div>
            <div className="space-y-2.5">
              {achievements.map(ach => (
                <div key={ach.title}
                  className={'flex items-center gap-3 p-3 rounded-xl border ' + (ach.unlocked
                    ? 'bg-gradient-to-r from-[#2A2010] to-[#1A1408] border-[#E8B84B]/20'
                    : 'bg-[#0D110D] border-white/10 opacity-40')}>
                  <span className="text-xl">{ach.icon}</span>
                  <div className="flex-1">
                    <div className={'text-sm font-semibold ' + (ach.unlocked ? 'text-[#E8B84B]' : 'text-white/40')}>{ach.title}</div>
                    <div className="text-[10px] text-white/40">{ach.desc}</div>
                  </div>
                  {ach.unlocked && (
                    <span className="bg-[#E8B84B]/15 border border-[#E8B84B]/25 text-[#E8B84B] text-[9px] px-2 py-0.5 rounded">✓</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connections */}
        {activeTab === 3 && (
          <>
            {connections.length > 0 ? (
              <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5">
                <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2.5 font-medium">
                  {connections.length} Connection{connections.length !== 1 ? 's' : ''}
                </div>
                {connections.map(conn => (
                  <div key={conn.id} onClick={() => router.push('/profile/' + conn.id)}
                    className="flex items-center gap-3 py-2.5 border-b border-white/10 last:border-0 cursor-pointer">
                    <div className="w-10 h-10 bg-[#2A4A2A] rounded-xl flex items-center justify-center text-base flex-shrink-0">
                      {conn.name?.charAt(0) || '🧑'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#F0EDE6]">{conn.name}</div>
                      <div className="text-xs text-white/40 mt-0.5">{conn.bio_social || conn.city || ''}</div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); router.push('/profile/' + conn.id) }}
                      className="bg-[#1E3A1E] border border-[#E8B84B]/20 text-[#E8B84B] text-[10px] font-semibold px-2.5 py-1 rounded-lg">
                      View
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

      <BottomNav />
    </div>
  )
}