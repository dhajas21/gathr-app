'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import ThemeToggle from '@/components/ThemeToggle'
import PasswordInput from '@/components/PasswordInput'
import { useTheme } from '@/hooks/useTheme'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { optimizedImgSrc } from '@/lib/utils'

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [discoverable, setDiscoverable] = useState(true)
  const [matchingEnabled, setMatchingEnabled] = useState(true)
  const [notifyOnRsvp, setNotifyOnRsvp] = useState(true)
  const [savingNotifyOnRsvp, setSavingNotifyOnRsvp] = useState(false)
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
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackCategory, setFeedbackCategory] = useState<'bug' | 'idea' | 'praise' | 'other'>('idea')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackSending, setFeedbackSending] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')
  const [feedbackSent, setFeedbackSent] = useState(false)
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [gathrPlus, setGathrPlus] = useState(false)
  const [gathrPlusExpiresAt, setGathrPlusExpiresAt] = useState<string | null>(null)
  const [openToDating, setOpenToDating] = useState(false)
  const [savingDating, setSavingDating] = useState(false)
  const [showDatingNote, setShowDatingNote] = useState(false)
  const [datingError, setDatingError] = useState('')
  const passwordSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUser(session.user)
      ;(async () => {
        try {
          const { data } = await supabase.from('profiles').select('name, avatar_url, profile_mode, is_discoverable, matching_enabled, notify_on_rsvp, city, gathr_plus, gathr_plus_expires_at, open_to_dating').eq('id', session.user.id).maybeSingle()
          if (data) {
            setProfile(data)
            setProfileMode(data.profile_mode || 'both')
            setDiscoverable(data.is_discoverable !== false)
            setMatchingEnabled(data.matching_enabled !== false)
            setNotifyOnRsvp((data as any).notify_on_rsvp !== false)
            const trialActive = data.gathr_plus_expires_at ? new Date(data.gathr_plus_expires_at) > new Date() : false
            setGathrPlus(data.gathr_plus === true || trialActive)
            setGathrPlusExpiresAt(trialActive && !data.gathr_plus ? data.gathr_plus_expires_at : null)
            setOpenToDating(data.open_to_dating === true)
          }
        } catch (e) {
          console.error(e)
        } finally {
          setLoading(false)
        }
      })()
    })
    return () => {
      if (passwordSuccessTimerRef.current) clearTimeout(passwordSuccessTimerRef.current)
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    }
  }, [])

  const handleSendFeedback = async () => {
    if (!user || feedbackSending) return
    const trimmed = feedbackMessage.trim()
    if (!trimmed) { setFeedbackError('Tell us what you wanted to share.'); return }
    if (trimmed.length > 2000) { setFeedbackError('Please keep it under 2000 characters.'); return }
    setFeedbackSending(true)
    setFeedbackError('')
    const { error } = await supabase.from('feedback').insert({
      user_id: user.id,
      category: feedbackCategory,
      message: trimmed,
      page_path: typeof window !== 'undefined' ? window.location.pathname : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
    })
    if (error) {
      // 23505 is our rate-limit code (raised in the BEFORE trigger)
      setFeedbackError(
        (error as any).code === '23505'
          ? 'You\'ve sent a few already — please wait an hour before sending more.'
          : 'Something went wrong. Try again in a minute.',
      )
      setFeedbackSending(false)
      return
    }
    setFeedbackSent(true)
    setFeedbackMessage('')
    feedbackTimerRef.current = setTimeout(() => {
      setShowFeedback(false)
      setFeedbackSent(false)
    }, 1800)
    setFeedbackSending(false)
  }

  const handleToggleMode = async (mode: 'social' | 'professional') => {
    if (savingMode) return
    setSavingMode(true)
    const current = profileMode
    const hasSocial = current === 'social' || current === 'both'
    const hasProfessional = current === 'professional' || current === 'both'
    let nextSocial = hasSocial
    let nextPro = hasProfessional
    if (mode === 'social') nextSocial = !hasSocial
    else nextPro = !hasProfessional
    if (!nextSocial && !nextPro) nextSocial = true
    const next = nextSocial && nextPro ? 'both' : nextPro ? 'professional' : 'social'
    setProfileMode(next)
    const { error } = await supabase.from('profiles').update({ profile_mode: next }).eq('id', user.id)
    if (error) setProfileMode(current)
    setSavingMode(false)
  }

  const handleToggleDiscoverable = async () => {
    if (savingDiscoverable) return
    setSavingDiscoverable(true)
    const next = !discoverable
    setDiscoverable(next)
    const { error } = await supabase.from('profiles').update({ is_discoverable: next }).eq('id', user.id)
    if (error) setDiscoverable(!next)
    setSavingDiscoverable(false)
  }

  const handleToggleNotifyOnRsvp = async () => {
    if (savingNotifyOnRsvp || !user) return
    setSavingNotifyOnRsvp(true)
    const next = !notifyOnRsvp
    setNotifyOnRsvp(next)
    const { error } = await supabase.from('profiles').update({ notify_on_rsvp: next }).eq('id', user.id)
    if (error) setNotifyOnRsvp(!next)
    setSavingNotifyOnRsvp(false)
  }

  const handleToggleDating = async () => {
    if (savingDating) return
    if (!gathrPlus) { router.push('/gathr-plus'); return }
    setDatingError('')
    const next = !openToDating
    setOpenToDating(next)
    if (next) setShowDatingNote(true)
    setSavingDating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/toggle-dating-intent`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const msg = res.status === 429 ? 'Too many toggles — try again tomorrow.' : (body?.error || 'Something went wrong.')
        setDatingError(msg)
        setOpenToDating(!next)
        setShowDatingNote(false)
      }
    } catch {
      setDatingError('Could not reach server — check your connection.')
      setOpenToDating(!next)
      setShowDatingNote(false)
    } finally {
      setSavingDating(false)
    }
  }

  const handleToggleMatching = async () => {
    if (savingMatching) return
    setSavingMatching(true)
    const next = !matchingEnabled
    setMatchingEnabled(next)
    const { error } = await supabase.from('profiles').update({ matching_enabled: next }).eq('id', user.id)
    if (error) setMatchingEnabled(!next)
    setSavingMatching(false)
  }

  const handleChangePassword = async () => {
    setPasswordError('')
    if (!newPassword) { setPasswordError('Enter a new password'); return }
    if (newPassword.length < 10) { setPasswordError('Password must be at least 10 characters'); return }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match'); return }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
      passwordSuccessTimerRef.current = setTimeout(() => { setPasswordSuccess(false); setShowPasswordSection(false) }, 2000)
    }
    setSavingPassword(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const handleDeleteAccount = async () => {
    setDeletingAccount(true)
    setDeleteError('')
    try {
      const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' })
      if (error) throw new Error((error as any)?.error || error.message || 'Deletion failed')
      await supabase.auth.signOut()
      router.push('/auth')
    } catch (e: any) {
      setDeleteError(e.message || 'Something went wrong')
      setDeletingAccount(false)
    }
  }

  const { theme, toggleTheme } = useTheme()
  const { status: pushStatus, enable: enablePush, disable: disablePush } = usePushNotifications(user?.id ?? null)

  const isSocial = profileMode === 'social' || profileMode === 'both'
  const isProfessional = profileMode === 'professional' || profileMode === 'both'

  const inputClass = 'w-full bg-[#0D110D] border border-white/10 rounded-2xl px-4 py-3 text-[#F0EDE6] placeholder-white/20 outline-none focus:border-[#E8B84B]/40 text-sm'

  if (loading) return (
    <div className="min-h-screen bg-[#0D110D] pb-28">
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 border-b border-white/10">
        <div className="w-9 h-9 bg-white/[0.07] rounded-xl animate-pulse flex-shrink-0" />
        <div>
          <div className="h-6 w-20 bg-white/[0.07] rounded-xl animate-pulse mb-1" />
          <div className="h-3 w-36 bg-white/[0.05] rounded-xl animate-pulse" />
        </div>
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

      <div className="flex items-center gap-3 px-4 pt-14 pb-4 border-b border-white/10">
        <button onClick={() => router.back()}
          className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-[#F0EDE6] active:scale-95 transition-transform flex-shrink-0">
          ←
        </button>
        <div>
          <h1 className="font-display font-bold text-[#F0EDE6] text-xl">Settings</h1>
          <p className="text-xs text-white/40 mt-0.5">Account, privacy & preferences</p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">

        <div
          onClick={() => router.push('/profile/edit')}
          className="bg-[#1C241C] border border-white/10 rounded-2xl p-4 flex items-center gap-3 cursor-pointer active:opacity-75 transition-opacity"
        >
          {optimizedImgSrc(profile?.avatar_url, 96) ? (
            <img src={optimizedImgSrc(profile.avatar_url, 96)!} alt="" className="w-12 h-12 rounded-2xl object-cover border border-[#E8B84B]/20 flex-shrink-0"  loading="lazy" />
          ) : (
            <div className="w-12 h-12 bg-[#1E3A1E] rounded-2xl flex items-center justify-center border border-[#E8B84B]/20 flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="rgba(232,184,75,0.4)">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6"/>
              </svg>
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
              <div className="text-sm font-bold text-[#E8B84B]">
                {gathrPlusExpiresAt ? 'Gathr+ Preview' : 'Gathr+ Active'}
              </div>
              <div className="text-[10px] text-white/35 mt-0.5">
                {gathrPlusExpiresAt
                  ? (() => {
                      const ms = new Date(gathrPlusExpiresAt).getTime() - Date.now()
                      const hrs = Math.floor(ms / 3600000)
                      return hrs >= 24
                        ? `${Math.floor(hrs / 24)}d ${hrs % 24}h remaining · Earned from level up`
                        : `${hrs}h remaining · Earned from level up`
                    })()
                  : 'Mystery matches, waves, and priority ranking are on'}
              </div>
            </div>
            {gathrPlusExpiresAt && (
              <button onClick={() => router.push('/gathr-plus')}
                className="text-[9px] text-[#E8B84B]/60 border border-[#E8B84B]/20 rounded-lg px-2 py-1 flex-shrink-0">
                Subscribe →
              </button>
            )}
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
            <span className="text-white/35 text-sm">{showPasswordSection ? '↑' : '›'}</span>
          </button>

          {showPasswordSection && (
            <div className="px-4 pb-4 space-y-2.5 border-t border-white/[0.06] pt-3">
              <PasswordInput
                className={inputClass}
                placeholder="New password (min. 10 characters)"
                value={newPassword}
                onChange={setNewPassword}
                autoComplete="new-password"
              />
              {newPassword.length > 0 && (() => {
                const score = [
                  newPassword.length >= 8,
                  newPassword.length >= 10,
                  /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword),
                  /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword),
                ].filter(Boolean).length
                const labels = ['Weak', 'Fair', 'Good', 'Strong']
                const colors = ['#E85B5B', '#E8A84B', '#E8D44B', '#7EC87E']
                return (
                  <div className="space-y-1.5">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map(i => (
                        <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
                          style={{ background: i < score ? colors[score - 1] : 'rgba(255,255,255,0.08)' }} />
                      ))}
                    </div>
                    <p className="text-[10px]" style={{ color: score > 0 ? colors[score - 1] : 'rgba(255,255,255,0.3)' }}>
                      {score === 0 ? 'Too short' : labels[score - 1]}
                      {score < 4 && ' · '}
                      {score === 1 && 'use 10+ characters'}
                      {score === 2 && 'add uppercase & lowercase'}
                      {score === 3 && 'add a number and symbol'}
                    </p>
                  </div>
                )
              })()}
              <PasswordInput
                className={inputClass}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
                autoComplete="new-password"
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
                disabled={savingPassword || newPassword.length < 10 || newPassword !== confirmPassword}
                className="w-full bg-[#E8B84B] text-[#0D110D] rounded-xl py-3 text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
              >
                {savingPassword ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2"/>
                      <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Saving…
                  </span>
                ) : 'Update Password'}
              </button>
            </div>
          )}
        </div>

        <div className="bg-[#1C241C] border border-white/10 rounded-2xl overflow-hidden">
          <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium px-4 pt-3.5 pb-1">
            Profile Mode{savingMode && <span className="text-[#E8B84B]/50 normal-case tracking-normal ml-1">saving…</span>}
          </div>
          <div className="px-4 pb-3.5">
            <p className="text-[10px] text-white/40 mb-3">Controls how you appear to others and what you see.</p>
            <div className="space-y-2">
              {([
                {
                  value: 'social' as const, label: 'Social', desc: 'Meet people, attend events', active: isSocial,
                  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
                },
                {
                  value: 'professional' as const, label: 'Professional', desc: 'Network, find collaborators', active: isProfessional,
                  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
                },
              ]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleToggleMode(opt.value)}
                  className={'w-full flex items-center gap-3 p-3 rounded-2xl border transition-all ' +
                    (opt.active ? 'border-[#E8B84B]/30 bg-[#E8B84B]/5' : 'border-white/10 bg-[#0D110D]')}
                >
                  <span className={opt.active ? 'text-[#E8B84B]' : 'text-white/35'}>{opt.icon}</span>
                  <div className="text-left flex-1">
                    <div className={'text-sm font-medium ' + (opt.active ? 'text-[#F0EDE6]' : 'text-white/45')}>{opt.label}</div>
                    <div className="text-[10px] text-white/40">{opt.desc}</div>
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
            onClick={() => pushStatus === 'active' ? disablePush() : enablePush()}
            disabled={pushStatus === 'unsupported' || pushStatus === 'denied' || pushStatus === 'pending'}
            className="w-full flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06] active:bg-white/[0.03] transition-colors disabled:opacity-60"
          >
            <div className="text-left flex-1 pr-3">
              <div className="text-sm text-[#F0EDE6]">Push Notifications</div>
              <div className="text-[10px] text-white/35 mt-0.5">
                {pushStatus === 'unsupported' ? 'Not supported on this browser'
                  : pushStatus === 'denied' ? 'Blocked — enable in your browser settings'
                  : pushStatus === 'pending' ? 'Asking for permission…'
                  : pushStatus === 'active' ? 'Event reminders, matches & messages'
                  : 'Get notified when matches and messages arrive'}
              </div>
            </div>
            <div className={'w-11 h-6 rounded-full transition-all flex-shrink-0 relative ' + (pushStatus === 'active' ? 'bg-[#7EC87E]' : 'bg-white/15')}>
              <div className={'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ' + (pushStatus === 'active' ? 'left-[22px]' : 'left-0.5')} />
            </div>
          </button>

          <button
            onClick={handleToggleNotifyOnRsvp}
            disabled={savingNotifyOnRsvp}
            className="w-full flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06] active:bg-white/[0.03] transition-colors"
          >
            <div className="text-left flex-1 pr-3">
              <div className="text-sm text-[#F0EDE6]">Notify me when people RSVP</div>
              <div className="text-[10px] text-white/35 mt-0.5">
                Pushes once per event every 30 minutes — never spammy, even for popular events
              </div>
            </div>
            <div className={'w-11 h-6 rounded-full transition-all flex-shrink-0 relative ' + (notifyOnRsvp ? 'bg-[#7EC87E]' : 'bg-white/15')}>
              <div className={'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ' + (notifyOnRsvp ? 'left-[22px]' : 'left-0.5')} />
            </div>
          </button>

          <button
            onClick={handleToggleDating}
            disabled={savingDating}
            className="w-full flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06] active:bg-white/[0.03] transition-colors"
          >
            <div className="text-left flex-1 pr-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#F0EDE6]">Open to dating connections</span>
                {!gathrPlus && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#E8B84B]/15 border border-[#E8B84B]/25 text-[#E8B84B] font-semibold tracking-wide">GATHR+</span>
                )}
              </div>
              <div className="text-[10px] text-white/35 mt-0.5">
                {gathrPlus
                  ? 'Only visible to other Gathr+ members who\'ve also opted in'
                  : 'Upgrade to Gathr+ to enable'}
              </div>
              {showDatingNote && openToDating && (
                <div className="mt-1.5 text-[10px] text-[#E8B84B]/70 bg-[#E8B84B]/6 border border-[#E8B84B]/15 rounded-lg px-2 py-1 leading-snug">
                  ✓ Enabled — only mutual Gathr+ opt-ins can see this
                </div>
              )}
              {datingError && (
                <div className="mt-1.5 text-[10px] text-[#E85B5B] bg-[#E85B5B]/8 border border-[#E85B5B]/20 rounded-lg px-2 py-1 leading-snug">
                  {datingError}
                </div>
              )}
            </div>
            <div className={'w-11 h-6 rounded-full transition-all flex-shrink-0 relative ' + (openToDating && gathrPlus ? 'bg-[#E8B84B]' : 'bg-white/15')}>
              <div className={'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ' + (openToDating && gathrPlus ? 'left-[22px]' : 'left-0.5')} />
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
            <span className="text-white/35 text-sm">›</span>
          </button>
        </div>

        <div className="bg-[#1C241C] border border-white/10 rounded-2xl overflow-hidden">
          <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium px-4 pt-3.5 pb-2">App</div>

          <button
            onClick={() => router.push('/tour')}
            className="w-full flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06] active:bg-white/[0.03] transition-colors"
          >
            <span className="text-sm text-[#F0EDE6]">Take the App Tour</span>
            <span className="text-white/35 text-sm">›</span>
          </button>

          <button
            onClick={() => router.push('/notifications')}
            className="w-full flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06] active:bg-white/[0.03] transition-colors"
          >
            <span className="text-sm text-[#F0EDE6]">Notifications</span>
            <span className="text-white/35 text-sm">›</span>
          </button>

          <button
            onClick={() => { setShowFeedback(true); setFeedbackError(''); setFeedbackSent(false) }}
            className="w-full flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06] active:bg-white/[0.03] transition-colors"
          >
            <div className="text-left">
              <div className="text-sm text-[#F0EDE6]">Send Feedback</div>
              <div className="text-[10px] text-white/35 mt-0.5">Report a bug, share an idea, or say hi</div>
            </div>
            <span className="text-white/35 text-sm">›</span>
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

      {showFeedback && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center" onClick={() => !feedbackSending && setShowFeedback(false)}>
          <div className="w-full max-w-md bg-[#1C241C] rounded-t-3xl p-5 pb-10" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />
            {feedbackSent ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-[#7EC87E]/10 border border-[#7EC87E]/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7EC87E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5"/>
                  </svg>
                </div>
                <h3 className="text-base font-bold text-[#F0EDE6] mb-1">Got it — thank you</h3>
                <p className="text-xs text-white/40">We read every message. We may reach out if we need more detail.</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-5">
                  <div className="w-11 h-11 bg-[#1E3A1E] border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-[#F0EDE6] mb-1">Send feedback</h3>
                  <p className="text-xs text-white/40">Bug, idea, praise, or anything else — we'd love to hear it.</p>
                </div>

                {/* Category chips */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { value: 'bug', label: 'Bug' },
                    { value: 'idea', label: 'Idea' },
                    { value: 'praise', label: 'Love' },
                    { value: 'other', label: 'Other' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setFeedbackCategory(opt.value as 'bug' | 'idea' | 'praise' | 'other')}
                      className={'py-2 rounded-xl text-[11px] font-medium border transition-all ' +
                        (feedbackCategory === opt.value
                          ? 'bg-[#E8B84B]/10 border-[#E8B84B]/35 text-[#E8B84B]'
                          : 'bg-[#0D110D] border-white/10 text-white/45')}>
                      {opt.label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={feedbackMessage}
                  onChange={e => setFeedbackMessage(e.target.value)}
                  rows={5}
                  maxLength={2000}
                  placeholder="What's on your mind? The more specific the better."
                  className="w-full bg-[#0D110D] border border-white/10 rounded-2xl px-4 py-3 text-sm text-[#F0EDE6] placeholder-white/25 outline-none focus:border-[#E8B84B]/40 resize-none"
                />
                <div className="text-[10px] text-white/25 mt-1 text-right">{feedbackMessage.length} / 2000</div>

                {feedbackError && (
                  <div className="mt-2 text-xs text-[#E85B5B] bg-[#E85B5B]/8 border border-[#E85B5B]/20 rounded-xl px-3 py-2">
                    {feedbackError}
                  </div>
                )}

                <button
                  onClick={handleSendFeedback}
                  disabled={feedbackSending || !feedbackMessage.trim()}
                  className="w-full mt-4 py-3.5 rounded-2xl bg-[#E8B84B] text-[#0D110D] font-bold text-sm disabled:opacity-40 active:scale-[0.98] transition-transform">
                  {feedbackSending ? 'Sending…' : 'Send feedback'}
                </button>
                <p className="text-[9px] text-white/20 text-center mt-2 leading-relaxed">
                  Sent with your user ID and the page you're on. No screenshots are captured automatically.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center" onClick={() => !deletingAccount && (setShowDeleteConfirm(false), setDeleteConfirmText(''))}>
          <div className="w-full max-w-md bg-[#1C241C] rounded-t-3xl p-5 pb-10" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />
            <div className="text-center mb-5">
              <div className="w-11 h-11 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <h3 className="text-base font-bold text-[#F0EDE6] mb-2">Delete your account?</h3>
              <p className="text-xs text-white/40 leading-relaxed mb-4">
                This will permanently delete your profile, events, connections, messages, and Gathr+ status. This cannot be undone.
              </p>
              <p className="text-[10px] text-white/35 mb-2">
                Type <span className="font-bold text-white/60">DELETE</span> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full text-center bg-[#0D110D] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-[#F0EDE6] placeholder-white/20 outline-none focus:border-red-500/40 tracking-widest"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
            {deleteError && (
              <div className="text-xs text-[#E85B5B] bg-[#E85B5B]/8 border border-[#E85B5B]/20 rounded-xl px-3 py-2 mb-4 text-center">
                {deleteError}
              </div>
            )}
            <div className="space-y-2">
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount || deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                className="w-full py-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-40"
              >
                {deletingAccount ? 'Deleting…' : 'Yes, Delete My Account'}
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}
                disabled={deletingAccount}
                className="w-full py-3.5 rounded-2xl bg-[#0D110D] border border-white/10 text-white/60 font-medium text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
