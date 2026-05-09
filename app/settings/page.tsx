'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import ThemeToggle from '@/components/ThemeToggle'
import { useTheme } from '@/hooks/useTheme'

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [discoverable, setDiscoverable] = useState(true)
  const [matchingEnabled, setMatchingEnabled] = useState(true)
  const [profileMode, setProfileMode] = useState('both')
  const [savingMode, setSavingMode] = useState(false)
  const [savingDiscoverable, setSavingDiscoverable] = useState(false)
  const [savingMatching, setSavingMatching] = useState(false)
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [gathrPlus, setGathrPlus] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUser(session.user)
      supabase.from('profiles').select('name, avatar_url, profile_mode, discoverable, matching_enabled, city, gathr_plus').eq('id', session.user.id).single()
        .then(({ data }) => {
          if (data) {
            setProfile(data)
            setProfileMode(data.profile_mode || 'both')
            setDiscoverable(data.discoverable !== false)
            setMatchingEnabled(data.matching_enabled !== false)
            setGathrPlus(data.gathr_plus || false)
          }
          setLoading(false)
        })
    })
  }, [])

  const handleToggleMode = async (mode: 'social' | 'professional') => {
    if (savingMode) return
    setSavingMode(true)
    const current = profileMode
    let next: string
    if (current === 'both') {
      next = mode === 'social' ? 'professional' : 'social'
    } else if (current === mode) {
      next = mode === 'social' ? 'professional' : 'social'
    } else {
      next = 'both'
    }
    setProfileMode(next)
    await supabase.from('profiles').update({ profile_mode: next }).eq('id', user.id)
    setSavingMode(false)
  }

  const handleToggleDiscoverable = async () => {
    if (savingDiscoverable) return
    setSavingDiscoverable(true)
    const next = !discoverable
    setDiscoverable(next)
    await supabase.from('profiles').update({ discoverable: next }).eq('id', user.id)
    setSavingDiscoverable(false)
  }

  const handleToggleMatching = async () => {
    if (savingMatching) return
    setSavingMatching(true)
    const next = !matchingEnabled
    setMatchingEnabled(next)
    await supabase.from('profiles').update({ matching_enabled: next }).eq('id', user.id)
    setSavingMatching(false)
  }

  const handleChangePassword = async () => {
    setPasswordError('')
    if (!newPassword) { setPasswordError('Enter a new password'); return }
    if (newPassword.length < 6) { setPasswordError('Password must be at least 6 characters'); return }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match'); return }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => { setPasswordSuccess(false); setShowPasswordSection(false) }, 2000)
    }
    setSavingPassword(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const { theme, toggleTheme } = useTheme()

  const isSocial = profileMode === 'social' || profileMode === 'both'
  const isProfessional = profileMode === 'professional' || profileMode === 'both'

  const inputClass = 'w-full bg-[#0D110D] border border-white/10 rounded-2xl px-4 py-3 text-[#F0EDE6] placeholder-white/20 outline-none focus:border-[#E8B84B]/40 text-sm'

  if (loading) return (
    <div className="min-h-screen bg-[#0D110D] pb-28">
      <div className="px-4 pt-14 pb-4 border-b border-white/10">
        <div className="h-6 w-20 bg-white/[0.07] rounded-xl animate-pulse mb-1" />
        <div className="h-3 w-36 bg-white/[0.05] rounded-xl animate-pulse" />
      </div>
      <div className="px-4 pt-4 space-y-3">
        <div className="h-20 w-full bg-white/[0.07] rounded-2xl animate-pulse" />
        <div className="h-32 w-full bg-white/[0.07] rounded-2xl animate-pulse" />
        <div className="h-40 w-full bg-white/[0.07] rounded-2xl animate-pulse" />
        <div className="h-28 w-full bg-white/[0.07] rounded-2xl animate-pulse" />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0D110D] pb-28">

      <div className="px-4 pt-14 pb-4 border-b border-white/10">
        <h1 className="font-bold text-[#F0EDE6] text-xl">Settings</h1>
        <p className="text-xs text-white/35 mt-0.5">Account, privacy & preferences</p>
      </div>

      <div className="px-4 pt-4 space-y-3">

        <div
          onClick={() => router.push('/profile/edit')}
          className="bg-[#1C241C] border border-white/10 rounded-2xl p-4 flex items-center gap-3 cursor-pointer active:opacity-75 transition-opacity"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-12 h-12 rounded-2xl object-cover border border-[#E8B84B]/20 flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 bg-[#1E3A1E] rounded-2xl flex items-center justify-center text-xl border border-[#E8B84B]/20 flex-shrink-0">
              🧑
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-[#F0EDE6]">{profile?.name || 'Your Profile'}</div>
            <div className="text-xs text-white/40 mt-0.5">{profile?.city || 'Set your city'}</div>
          </div>
          <div className="text-xs text-[#E8B84B] bg-[#E8B84B]/10 border border-[#E8B84B]/20 px-2.5 py-1 rounded-lg flex-shrink-0">
            Edit ›
          </div>
        </div>

        {/* Gathr+ */}
        {gathrPlus ? (
          <div className="bg-gradient-to-br from-[#E8B84B]/10 to-[#C49A35]/5 border border-[#E8B84B]/25 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[#E8B84B] flex items-center justify-center flex-shrink-0">
              <span className="text-lg">✦</span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-[#E8B84B]">Gathr+ Active</div>
              <div className="text-[10px] text-white/35 mt-0.5">Mystery matches, waves, and priority ranking are on</div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => router.push('/gathr-plus')}
            className="w-full bg-gradient-to-br from-[#E8B84B]/8 to-[#C49A35]/4 border border-[#E8B84B]/20 rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform text-left">
            <div className="w-10 h-10 rounded-[14px] bg-[#E8B84B]/15 border border-[#E8B84B]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">✦</span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-[#E8B84B]">Unlock Gathr+</div>
              <div className="text-[10px] text-white/35 mt-0.5">See matches before events, send waves, and more</div>
            </div>
            <span className="text-[10px] text-[#E8B84B]/60 font-semibold flex-shrink-0">$4.99/mo →</span>
          </button>
        )}

        <div className="bg-[#1C241C] border border-white/10 rounded-2xl overflow-hidden">
          <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium px-4 pt-3.5 pb-2">Appearance</div>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-3.5 active:bg-white/[0.03] transition-colors"
          >
            <div className="flex items-center gap-3">
              <ThemeToggle className="w-8 h-8 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white/50 pointer-events-none" />
              <span className="text-sm text-[#F0EDE6]">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
            </div>
            <div className={`w-10 h-6 rounded-full transition-colors ${theme === 'light' ? 'bg-[#E8B84B]' : 'bg-white/10'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm mt-0.5 transition-transform ${theme === 'light' ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
            </div>
          </button>
        </div>

        <div className="bg-[#1C241C] border border-white/10 rounded-2xl overflow-hidden">
          <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium px-4 pt-3.5 pb-2">Account</div>

          <div className="px-4 pb-3.5 border-b border-white/[0.06]">
            <div className="text-[10px] text-white/35 mb-1">Email address</div>
            <div className="text-sm text-[#F0EDE6]/70">{user?.email}</div>
          </div>

          <button
            onClick={() => { setShowPasswordSection(!showPasswordSection); setPasswordError(''); setPasswordSuccess(false) }}
            className="w-full flex items-center justify-between px-4 py-3.5 active:bg-white/[0.03] transition-colors"
          >
            <span className="text-sm text-[#F0EDE6]">Change Password</span>
            <span className="text-white/30 text-sm">{showPasswordSection ? '↑' : '›'}</span>
          </button>

          {showPasswordSection && (
            <div className="px-4 pb-4 space-y-2.5 border-t border-white/[0.06] pt-3">
              <input
                className={inputClass}
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                maxLength={72}
              />
              <input
                className={inputClass}
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
                maxLength={72}
              />
              {passwordError && (
                <div className="text-xs text-[#E85B5B] bg-[#E85B5B]/8 border border-[#E85B5B]/20 rounded-xl px-3 py-2">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="text-xs text-[#7EC87E] bg-[#7EC87E]/8 border border-[#7EC87E]/20 rounded-xl px-3 py-2">
                  ✓ Password updated
                </div>
              )}
              <button
                onClick={handleChangePassword}
                disabled={savingPassword}
                className="w-full bg-[#E8B84B] text-[#0D110D] rounded-xl py-3 text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
              >
                {savingPassword ? 'Saving…' : 'Update Password'}
              </button>
            </div>
          )}
        </div>

        <div className="bg-[#1C241C] border border-white/10 rounded-2xl overflow-hidden">
          <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium px-4 pt-3.5 pb-1">
            Profile Mode{savingMode && <span className="text-[#E8B84B]/50 normal-case tracking-normal ml-1">saving…</span>}
          </div>
          <div className="px-4 pb-3.5">
            <p className="text-[10px] text-white/35 mb-3">Controls how you appear to others and what you see.</p>
            <div className="space-y-2">
              {[
                { value: 'social', icon: '👋', label: 'Social', desc: 'Meet people, attend events', active: isSocial },
                { value: 'professional', icon: '💼', label: 'Professional', desc: 'Network, find collaborators', active: isProfessional },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleToggleMode(opt.value as 'social' | 'professional')}
                  className={'w-full flex items-center gap-3 p-3 rounded-2xl border transition-all ' +
                    (opt.active ? 'border-[#E8B84B]/30 bg-[#E8B84B]/5' : 'border-white/10 bg-[#0D110D]')}
                >
                  <span className="text-base">{opt.icon}</span>
                  <div className="text-left flex-1">
                    <div className={'text-sm font-medium ' + (opt.active ? 'text-[#F0EDE6]' : 'text-white/45')}>{opt.label}</div>
                    <div className="text-[10px] text-white/30">{opt.desc}</div>
                  </div>
                  <div className={'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ' +
                    (opt.active ? 'border-[#E8B84B]' : 'border-white/20')}>
                    {opt.active && <div className="w-2 h-2 rounded-full bg-[#E8B84B]" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[#1C241C] border border-white/10 rounded-2xl overflow-hidden">
          <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium px-4 pt-3.5 pb-2">Privacy</div>

          <button
            onClick={handleToggleDiscoverable}
            disabled={savingDiscoverable}
            className="w-full flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06] active:bg-white/[0.03] transition-colors"
          >
            <div className="text-left flex-1 pr-3">
              <div className="text-sm text-[#F0EDE6]">Discoverable</div>
              <div className="text-[10px] text-white/35 mt-0.5">Others can find you in search and communities</div>
            </div>
            <div className={'w-11 h-6 rounded-full transition-all flex-shrink-0 relative ' + (discoverable ? 'bg-[#7EC87E]' : 'bg-white/15')}>
              <div className={'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ' + (discoverable ? 'left-[22px]' : 'left-0.5')} />
            </div>
          </button>

          <button
            onClick={handleToggleMatching}
            disabled={savingMatching}
            className="w-full flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06] active:bg-white/[0.03] transition-colors"
          >
            <div className="text-left flex-1 pr-3">
              <div className="text-sm text-[#F0EDE6]">People Matching</div>
              <div className="text-[10px] text-white/35 mt-0.5">Show me people I might like at events I'm going to</div>
            </div>
            <div className={'w-11 h-6 rounded-full transition-all flex-shrink-0 relative ' + (matchingEnabled ? 'bg-[#7EC87E]' : 'bg-white/15')}>
              <div className={'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ' + (matchingEnabled ? 'left-[22px]' : 'left-0.5')} />
            </div>
          </button>

          <button
            onClick={() => router.push('/profile/edit')}
            className="w-full flex items-center justify-between px-4 py-3.5 active:bg-white/[0.03] transition-colors"
          >
            <div className="text-left">
              <div className="text-sm text-[#F0EDE6]">Edit Public Profile</div>
              <div className="text-[10px] text-white/35 mt-0.5">Name, photo, bio, interests, city</div>
            </div>
            <span className="text-white/30 text-sm">›</span>
          </button>
        </div>

        <div className="bg-[#1C241C] border border-white/10 rounded-2xl overflow-hidden">
          <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium px-4 pt-3.5 pb-2">App</div>

          <button
            onClick={() => router.push('/tour')}
            className="w-full flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06] active:bg-white/[0.03] transition-colors"
          >
            <span className="text-sm text-[#F0EDE6]">Take the App Tour</span>
            <span className="text-white/30 text-sm">›</span>
          </button>

          <button
            onClick={() => router.push('/notifications')}
            className="w-full flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06] active:bg-white/[0.03] transition-colors"
          >
            <span className="text-sm text-[#F0EDE6]">Notifications</span>
            <span className="text-white/30 text-sm">›</span>
          </button>

          <div className="px-4 py-3.5 border-b border-white/[0.06]">
            <div className="text-sm text-white/35">Version</div>
            <div className="text-[10px] text-white/20 mt-0.5">Gathr 1.0</div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-between px-4 py-3.5 active:bg-white/[0.03] transition-colors"
          >
            <span className="text-sm text-[#E85B5B]">Sign Out</span>
            <span className="text-[#E85B5B]/40 text-sm">›</span>
          </button>
        </div>

        <div className="bg-[#1C241C] border border-red-500/10 rounded-2xl overflow-hidden">
          <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium px-4 pt-3.5 pb-2">Danger Zone</div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-between px-4 py-3.5 active:bg-red-500/5 transition-colors"
          >
            <div className="text-left">
              <div className="text-sm text-red-400/70">Delete Account</div>
              <div className="text-[10px] text-white/25 mt-0.5">Permanently remove your account and all data</div>
            </div>
            <span className="text-red-400/40 text-sm">›</span>
          </button>
        </div>

      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center" onClick={() => setShowDeleteConfirm(false)}>
          <div className="w-full max-w-md bg-[#1C241C] rounded-t-3xl p-5 pb-10" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />
            <div className="text-center mb-6">
              <div className="text-3xl mb-3">⚠️</div>
              <h3 className="text-base font-bold text-[#F0EDE6] mb-2">Delete your account?</h3>
              <p className="text-xs text-white/40 leading-relaxed">
                This will permanently delete your profile, events, connections, and messages. This cannot be undone.
              </p>
            </div>
            <p className="text-xs text-white/35 text-center mb-5">
              To delete your account, email us at{' '}
              <span className="text-[#E8B84B]">support@gathr.app</span>
            </p>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="w-full py-3.5 rounded-2xl bg-[#0D110D] border border-white/10 text-white/60 font-medium text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
