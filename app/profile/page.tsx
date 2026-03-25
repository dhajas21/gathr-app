'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUser(session.user)
      fetchProfile(session.user.id)
    })
  }, [])

  const fetchProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (profileData) setProfile(profileData)

    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .eq('host_id', userId)
      .order('start_datetime', { ascending: false })
    if (eventsData) setEvents(eventsData)

    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0D110D] flex items-center justify-center">
      <div className="text-[#E8B84B] text-2xl font-bold">Gathr.</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0D110D] pb-24">
      <div style={{background:'linear-gradient(160deg,#1A2E1A 0%,#0D110D 65%)'}}>
        <div className="flex items-start justify-between px-4 pt-14 mb-3">
          <div></div>
          <div className="flex gap-2">
            <button onClick={() => router.push('/settings')}
              className="w-8 h-8 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-sm">⚙️</button>
            <button onClick={() => router.push('/profile/edit')} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-[#F0EDE6]">
              ✏️ Edit
            </button>
          </div>
        </div>
        <div className="px-4 pb-4">
          <div className="w-16 h-16 bg-[#2A4A2A] rounded-2xl border-2 border-[#E8B84B]/35 flex items-center justify-center text-2xl mb-3">🧑‍💻</div>
          <div className="font-bold text-[#F0EDE6] text-lg" style={{fontFamily:'sans-serif'}}>{profile?.name || 'Your Name'}</div>
          <div className="text-xs text-white/45 mt-1">{user?.email} · Bellingham, WA</div>
          {profile?.bio_social && (
            <div className="text-sm text-white/60 mt-2 leading-relaxed font-light">{profile.bio_social}</div>
          )}
          <div className="flex gap-2 mt-3">
            <span className="text-[10px] px-2.5 py-1 rounded-lg bg-[#2A4A2A]/40 border border-[#7EC87E]/20 text-[#7EC87E]">👋 Social</span>
            <span className="text-[10px] px-2.5 py-1 rounded-lg bg-[#2A4A2A]/40 border border-[#7EC87E]/20 text-[#7EC87E]">💼 Professional</span>
          </div>
        </div>
      </div>

      <div className="flex border-t border-b border-white/10">
        {[
          { num: profile?.hosted_count || 0, label: 'Hosted' },
          { num: profile?.attended_count || 0, label: 'Attended' },
          { num: 0, label: 'Connections' },
          { num: 0, label: 'Reach' },
        ].map((stat, i) => (
          <div key={stat.label} className={`flex-1 text-center py-3 ${i < 3 ? 'border-r border-white/10' : ''}`}>
            <div className="font-bold text-[#E8B84B] text-base" style={{fontFamily:'sans-serif'}}>{stat.num}</div>
            <div className="text-[9px] text-white/40 mt-0.5 uppercase tracking-wide">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="flex border-b border-white/10">
        {['Overview', 'Events', 'Stats', 'Connections'].map((tab, i) => (
          <button key={tab} className={`flex-1 py-2.5 text-xs text-center border-b-2 -mb-px ${i === 0 ? 'text-[#E8B84B] border-[#E8B84B]' : 'text-white/40 border-transparent'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-3">
        {profile?.interests && profile.interests.length > 0 && (
          <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5">
            <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2.5 font-medium">Interests</div>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((interest: string) => (
                <span key={interest} className="bg-[#2A4A2A]/35 text-[#7EC87E] text-xs px-2.5 py-1 rounded-lg border border-[#7EC87E]/10">{interest}</span>
              ))}
            </div>
          </div>
        )}

        {events.length > 0 && (
          <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5">
            <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2.5 font-medium">Your Events</div>
            <div className="space-y-2">
              {events.slice(0, 3).map(event => (
                <div key={event.id} onClick={() => router.push(`/events/${event.id}`)}
                  className="flex items-center gap-3 py-2 border-b border-white/10 last:border-0 cursor-pointer">
                  <div className="w-9 h-9 bg-[#1E3A1E] rounded-xl flex items-center justify-center text-base flex-shrink-0">🎉</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#F0EDE6] truncate">{event.title}</div>
                    <div className="text-xs text-white/40 mt-0.5">{new Date(event.start_datetime).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={handleSignOut}
          className="w-full bg-[#1C241C] border border-white/10 rounded-2xl py-4 text-[#E85B5B] text-sm font-medium mt-2">
          Sign Out
        </button>
      </div>
      <BottomNav />
    </div>
  )
}