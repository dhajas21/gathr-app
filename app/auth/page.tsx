'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CITY_NAMES } from '@/lib/constants'
import PasswordInput from '@/components/PasswordInput'
import { track } from '@/components/AnalyticsProvider'

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgot, setIsForgot] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [city, setCity] = useState('Bellingham')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const router = useRouter()

  const handleSignIn = async () => {
    if (!email || !password) { setError('Please fill in all fields'); return }
    setLoading(true); setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (authError) { setError(authError.message); setLoading(false); return }
    router.push('/home')
  }

  const handleSignUp = async () => {
    if (!name || !email || !password) { setError('Please fill in all fields'); return }
    if (password.length < 12) { setError('Password must be at least 12 characters'); return }
    setLoading(true); setError('')
    // Pass name + city into raw_user_meta_data so the DB trigger (handle_new_auth_user)
    // picks them up when auto-creating the profile row.
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim(), city } },
    })
    if (authError) { setError(authError.message); setLoading(false); return }
    if (data.session) {
      // Email confirmation disabled — session immediately available, profile already created by trigger
      track('signup_completed', { method: 'email', confirmation_required: false })
      router.push('/setup')
    } else if (data.user) {
      // Email confirmation required — profile gets created when they confirm
      track('signup_started', { method: 'email', confirmation_required: true })
      setError('')
      setLoading(false)
      setResetSent(true)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) { setError('Enter your email address above'); return }
    setLoading(true); setError('')
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + '/auth/reset',
    })
    if (resetError) { setError(resetError.message); setLoading(false); return }
    setResetSent(true); setLoading(false)
  }

  const handleSubmit = () => {
    if (isForgot) handleForgotPassword()
    else if (isSignUp) handleSignUp()
    else handleSignIn()
  }

  const handleGoogle = async () => {
    setLoading(true)
    setError('')
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    })
    if (oauthError) { setError(oauthError.message); setLoading(false) }
  }

  const inputClass = 'w-full bg-[#161E16] border border-white/[0.09] rounded-2xl px-4 py-3.5 text-[#F0EDE6] placeholder-white/20 outline-none focus:border-[#E8B84B]/40 focus:bg-[#1A231A] text-sm transition-colors'

  return (
    <div className="min-h-screen bg-[#0D110D] flex flex-col px-6 pt-16 pb-10 relative overflow-hidden">

      {/* Ambient orbs */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'var(--gradient-auth-green)' }} />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'var(--gradient-auth-gold)' }} />

      {/* Logo */}
      <div className="flex flex-col items-center mb-10 relative z-10">
        <h1 className="text-6xl font-extrabold text-[#F0EDE6] tracking-tight leading-none font-display">
          Gathr<span className="text-[#E8B84B]">.</span>
        </h1>
        <p className="text-white/30 text-sm mt-3 tracking-wide">Find your people. Find your vibe.</p>
      </div>

      <div className="relative z-10 w-full max-w-sm mx-auto flex-1 flex flex-col">

        {isForgot ? (
          <div className="flex flex-col min-h-[60vh] justify-center">
            <button onClick={() => { setIsForgot(false); setError(''); setResetSent(false) }}
              className="flex items-center gap-1.5 text-xs text-white/35 mb-8 self-start">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              Back to sign in
            </button>

            {resetSent ? (
              <div className="text-center">
                <div className="text-5xl mb-5">📬</div>
                <h2 className="text-xl font-bold text-[#F0EDE6] mb-2">Check your inbox</h2>
                <p className="text-sm text-white/40 mb-1">Reset link sent to</p>
                <p className="text-sm font-medium text-white/60 mb-6">{email}</p>
                <p className="text-xs text-white/25 leading-relaxed">Didn't get it? Check your spam folder or{' '}
                  <button onClick={() => setResetSent(false)} className="text-[#E8B84B]/70 underline">try again</button>.
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-[#F0EDE6] mb-1">Reset password</h2>
                <p className="text-sm text-white/35 mb-7">We'll send a link to your email. Check your spam if it doesn't arrive in a minute.</p>
                <div className="space-y-3">
                  <input className={inputClass} placeholder="Email address" type="email" value={email}
                    onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} maxLength={100}
                    autoComplete="email" inputMode="email" autoFocus />
                  {error && <ErrorBox message={error} />}
                  <CTA onClick={handleSubmit} loading={loading} label="Send Reset Link" />
                </div>
              </>
            )}
          </div>
        ) : isSignUp && resetSent ? (
          <div className="flex flex-col min-h-[60vh] justify-center text-center">
            <div className="text-5xl mb-5">📬</div>
            <h2 className="text-xl font-bold text-[#F0EDE6] mb-2">Check your inbox</h2>
            <p className="text-sm text-white/40 mb-1">Confirmation link sent to</p>
            <p className="text-sm font-medium text-white/60 mb-6">{email}</p>
            <p className="text-xs text-white/25 leading-relaxed">
              Click the link in the email to activate your account, then{' '}
              <button onClick={() => { setResetSent(false); setIsSignUp(false) }} className="text-[#E8B84B]/70 underline">
                sign in
              </button>.
            </p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex bg-[#161E16] border border-white/[0.07] rounded-2xl p-1 mb-5">
              {(['Sign In', 'Sign Up'] as const).map((tab, i) => (
                <button key={tab} onClick={() => { setIsSignUp(i === 1); setError('') }}
                  className={'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ' +
                    ((isSignUp ? i === 1 : i === 0) ? 'bg-[#E8B84B] text-[#0D110D]' : 'text-white/35')}>
                  {tab}
                </button>
              ))}
            </div>

            {/* Form */}
            <div className="space-y-2.5">
              {isSignUp && (
                <input className={inputClass} placeholder="Full name" value={name}
                  onChange={e => setName(e.target.value)} maxLength={50}
                  autoComplete="name"/>
              )}
              <input className={inputClass} placeholder="Email" type="email" value={email}
                onChange={e => setEmail(e.target.value)} maxLength={100}
                autoComplete="email" inputMode="email"/>
              <PasswordInput
                className={inputClass}
                placeholder="Password"
                value={password}
                onChange={setPassword}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}/>
              {isSignUp && (
                <select className={inputClass + ' appearance-none'} value={city} onChange={e => setCity(e.target.value)}>
                  {CITY_NAMES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}

              {!isSignUp && (
                <div className="text-right">
                  <button onClick={() => { setIsForgot(true); setError('') }}
                    className="text-xs text-[#E8B84B]/70 hover:text-[#E8B84B] transition-colors">
                    Forgot password?
                  </button>
                </div>
              )}

              {error && <ErrorBox message={error} />}

              <CTA onClick={handleSubmit} loading={loading}
                label={isSignUp ? 'Create Account' : 'Sign In'} />
            </div>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-white/[0.07]" />
              <span className="text-[10px] text-white/20 uppercase tracking-widest">or</span>
              <div className="flex-1 h-px bg-white/[0.07]" />
            </div>

            <button onClick={handleGoogle} disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-[#161E16] border border-white/[0.09] rounded-2xl py-3.5 text-sm font-semibold text-[#F0EDE6] active:scale-[0.98] transition-transform disabled:opacity-50">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <p className="text-[10px] text-white/15 text-center mt-6 leading-relaxed">
              By continuing you agree to Gathr's{' '}
              <a href="/terms" className="underline text-white/25">Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" className="underline text-white/25">Privacy Policy</a>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="bg-[#E85B5B]/8 border border-[#E85B5B]/20 rounded-2xl px-4 py-3 flex items-center gap-2.5">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E85B5B" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
      <span className="text-xs text-[#E85B5B]">{message}</span>
    </div>
  )
}

function CTA({ onClick, loading, label }: { onClick: () => void; loading: boolean; label: string }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="w-full bg-[#E8B84B] text-[#0D110D] rounded-2xl py-4 font-bold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform mt-1"
      style={{ boxShadow: '0 4px 24px rgba(232,184,75,0.28)' }}>
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
            <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Loading…
        </span>
      ) : label}
    </button>
  )
}
