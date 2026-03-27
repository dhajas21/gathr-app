'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [notifications, setNotifications] = useState({
    push: true,
    events: true,
    community: false,
    achievements: true,
  })
  const [privacy, setPrivacy] = useState({
    discoverable: true,
    profileVisibility: 'Everyone',
  })
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUser(session.user)
      fetchProfile(session.user.id)
    })
  }, [])

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) setProfile(data)
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const handleDeleteAccount = async () => {
    if (!user) return
    // Delete profile (cascades to connections, messages, etc.)
    await supabase.from('profiles').delete().eq('id', user.id)
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0D110D] flex items-center justify-center">
      <div className="text-[#E8B84B] text-2xl font-bold">Gathr.</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0D110D] pb-10">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-3 border-b border-white/10">
        <button onClick={() => router.back()}
          className="w-9 h-9 bg-[#1C241C] border border-white/10 rounded-xl flex items-center justify-center text-[#F0EDE6]">
          ←
        </button>
        <h1 className="text-lg font-bold text-[#F0EDE6]" style={{ fontFamily: 'sans-serif' }}>Settings</h1>
      </div>

      <div className="px-4 py-4 space-y-5">

        {/* Profile card */}
        <div onClick={() => router.push('/profile/edit')}
          className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform">
          <div className="w-11 h-11 bg-[#2A4A2A] rounded-2xl border-[1.5px] border-[#E8B84B]/25 flex items-center justify-center text-lg">
            🧑‍💻
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-[#F0EDE6]">{profile?.name || 'Your Name'}</div>
            <div className="text-xs text-white/40 mt-0.5">@{profile?.name?.toLowerCase().replace(/\s/g, '')} · Edit your profile</div>
          </div>
          <span className="text-white/20">›</span>
        </div>

        {/* Account */}
        <div>
          <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2 font-medium">Account</div>
          <div className="bg-[#1C241C] border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-3.5 py-3 border-b border-white/10">
              <div className="w-7 h-7 rounded-lg bg-[#1E2E1E] flex items-center justify-center text-xs">✉️</div>
              <span className="text-sm text-[#F0EDE6] flex-1">Email</span>
              <span className="text-xs text-white/40 mr-1">{user?.email}</span>
              <span className="text-white/20 text-xs">›</span>
            </div>
            <div className="flex items-center gap-3 px-3.5 py-3 border-b border-white/10">
              <div className="w-7 h-7 rounded-lg bg-[#1E1E2E] flex items-center justify-center text-xs">🔑</div>
              <span className="text-sm text-[#F0EDE6] flex-1">Password</span>
              <span className="text-xs text-white/40 mr-1">••••••••</span>
              <span className="text-white/20 text-xs">›</span>
            </div>
            <div className="flex items-center gap-3 px-3.5 py-3">
              <div className="w-7 h-7 rounded-lg bg-[#2A1E0E] flex items-center justify-center text-xs">📍</div>
              <span className="text-sm text-[#F0EDE6] flex-1">City</span>
              <span className="text-xs text-white/40 mr-1">{profile?.city || 'Bellingham'}</span>
              <span className="text-white/20 text-xs">›</span>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div>
          <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2 font-medium">Notifications</div>
          <div className="bg-[#1C241C] border border-white/10 rounded-2xl overflow-hidden">
            {[
              { key: 'push', icon: '🔔', label: 'Push notifications', bg: '#2A1E1A' },
              { key: 'events', icon: '📅', label: 'Event reminders', bg: '#1E2A1E' },
              { key: 'community', icon: '👥', label: 'Community activity', bg: '#1A2A1A' },
              { key: 'achievements', icon: '🏆', label: 'Achievements', bg: '#2A1A2A' },
            ].map((item, i) => (
              <div key={item.key} className={'flex items-center gap-3 px-3.5 py-3 ' + (i < 3 ? 'border-b border-white/10' : '')}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs" style={{ background: item.bg }}>{item.icon}</div>
                <span className="text-sm text-[#F0EDE6] flex-1">{item.label}</span>
                <button
                  onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                  className={'w-10 h-[22px] rounded-full relative transition-colors ' + (notifications[item.key as keyof typeof notifications] ? 'bg-[#E8B84B]' : 'bg-white/15')}>
                  <div className={'w-4 h-4 rounded-full bg-white absolute top-[3px] transition-all ' + (notifications[item.key as keyof typeof notifications] ? 'left-[21px]' : 'left-[3px]')} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy */}
        <div>
          <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2 font-medium">Privacy & Visibility</div>
          <div className="bg-[#1C241C] border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-3.5 py-3 border-b border-white/10">
              <div className="w-7 h-7 rounded-lg bg-[#1E2E1E] flex items-center justify-center text-xs">✦</div>
              <span className="text-sm text-[#F0EDE6] flex-1">Discoverable by others</span>
              <button
                onClick={() => setPrivacy(prev => ({ ...prev, discoverable: !prev.discoverable }))}
                className={'w-10 h-[22px] rounded-full relative transition-colors ' + (privacy.discoverable ? 'bg-[#E8B84B]' : 'bg-white/15')}>
                <div className={'w-4 h-4 rounded-full bg-white absolute top-[3px] transition-all ' + (privacy.discoverable ? 'left-[21px]' : 'left-[3px]')} />
              </button>
            </div>
            <div className="flex items-center gap-3 px-3.5 py-3 border-b border-white/10">
              <div className="w-7 h-7 rounded-lg bg-[#2A1E1A] flex items-center justify-center text-xs">🔒</div>
              <span className="text-sm text-[#F0EDE6] flex-1">Profile visibility</span>
              <span className="text-xs text-white/40 mr-1">Everyone</span>
              <span className="text-white/20 text-xs">›</span>
            </div>
            <div className="flex items-center gap-3 px-3.5 py-3">
              <div className="w-7 h-7 rounded-lg bg-[#2A1A1A] flex items-center justify-center text-xs">🚫</div>
              <span className="text-sm text-[#F0EDE6] flex-1">Blocked users</span>
              <span className="text-xs text-white/40 mr-1">0</span>
              <span className="text-white/20 text-xs">›</span>
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div>
          <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2 font-medium">Account Actions</div>
          <div className="bg-[#E85B5B]/5 border border-[#E85B5B]/15 rounded-2xl overflow-hidden">
            <button onClick={handleSignOut}
              className="flex items-center gap-3 px-3.5 py-3 border-b border-[#E85B5B]/10 w-full">
              <div className="w-7 h-7 rounded-lg bg-[#E85B5B]/10 flex items-center justify-center text-xs">🚪</div>
              <span className="text-sm text-[#E85B5B] flex-1 text-left">Sign out</span>
              <span className="text-[#E85B5B] text-xs">›</span>
            </button>
            <button onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-3 px-3.5 py-3 w-full">
              <div className="w-7 h-7 rounded-lg bg-[#E85B5B]/10 flex items-center justify-center text-xs">🗑</div>
              <span className="text-sm text-[#E85B5B] flex-1 text-left">Delete account</span>
              <span className="text-[#E85B5B] text-xs">›</span>
            </button>
          </div>
        </div>

        <div className="text-center pt-4 pb-2 text-[10px] text-white/20">
          Gathr · Version 1.0.0 · Made with ♥ in Bellingham
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-8" onClick={() => setShowDeleteConfirm(false)}>
          <div className="w-full max-w-sm bg-[#1C241C] rounded-3xl p-6" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="text-3xl mb-3">⚠️</div>
              <h3 className="text-lg font-bold text-[#F0EDE6] mb-2">Delete Account?</h3>
              <p className="text-sm text-white/45 leading-relaxed">This will permanently delete your profile, events, messages, and all data. This cannot be undone.</p>
            </div>
            <div className="space-y-2">
              <button onClick={handleDeleteAccount}
                className="w-full py-3.5 rounded-2xl bg-[#E85B5B] text-white text-sm font-bold active:scale-95 transition-transform">
                Yes, Delete Everything
              </button>
              <button onClick={() => setShowDeleteConfirm(false)}
                className="w-full py-3.5 rounded-2xl bg-[#0D110D] border border-white/10 text-white/50 text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}