'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CITY_NAMES } from '@/lib/constants'

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
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true); setError('')
    const { data, error: authError } = await supabase.auth.signUp({ email: email.trim(), password })
    if (authError) { setError(authError.message); setLoading(false); return }
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id, name: name.trim(), city,
        profile_mode: 'both', hosted_count: 0, attended_count: 0, interests: [],
      })
      router.push('/setup')
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

  const inputClass = 'w-full bg-[#161E16] border border-white/[0.09] rounded-2xl px-4 py-3.5 text-[#F0EDE6] placeholder-white/20 outline-none focus:border-[#E8B84B]/40 focus:bg-[#1A231A] text-sm transition-colors'

  return (
    <div className="min-h-screen bg-[#0D110D] flex flex-col px-6 pt-16 pb-10 relative overflow-hidden">

      {/* Ambient orbs */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle at center, rgba(46,110,60,0.18) 0%, transparent 65%)' }} />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle at center, rgba(232,184,75,0.12) 0%, transparent 65%)' }} />

      {/* Logo */}
      <div className="flex flex-col items-center mb-10 relative z-10">
        <h1 className="text-6xl font-extrabold text-[#F0EDE6] tracking-tight leading-none font-display">
          Gathr<span className="text-[#E8B84B]">.</span>
        </h1>
        <p className="text-white/30 text-sm mt-3 tracking-wide">Find your people. Find your vibe.</p>
      </div>

      <div className="relative z-10 w-full max-w-sm mx-auto flex-1 flex flex-col">

        {isForgot ? (
          <div>
            <button onClick={() => { setIsForgot(false); setError(''); setResetSent(false) }}
              className="flex items-center gap-1.5 text-xs text-white/35 mb-6">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              Back to sign in
            </button>
            <h2 className="text-xl font-bold text-[#F0EDE6] mb-1 font-display">Reset password</h2>
            <p className="text-xs text-white/35 mb-5">We'll send a reset link to your email.</p>

            {resetSent ? (
              <div className="bg-[#1E3A1E]/50 border border-[#7EC87E]/20 rounded-2xl p-5 text-center">
                <div className="text-3xl mb-3">📬</div>
                <p className="text-sm font-semibold text-[#7EC87E] mb-1">Check your inbox</p>
                <p className="text-xs text-white/35">Reset link sent to <span className="text-white/55">{email}</span></p>
              </div>
            ) : (
              <div className="space-y-3">
                <input className={inputClass} placeholder="Email" type="email" value={email}
                  onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} maxLength={100}/>
                {error && <ErrorBox message={error} />}
                <CTA onClick={handleSubmit} loading={loading} label="Send Reset Link" />
              </div>
            )}
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
                  onChange={e => setName(e.target.value)} maxLength={50}/>
              )}
              <input className={inputClass} placeholder="Email" type="email" value={email}
                onChange={e => setEmail(e.target.value)} maxLength={100}/>
              <input className={inputClass} placeholder="Password" type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()} maxLength={72}/>
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

            <p className="text-[10px] text-white/15 text-center mt-8 leading-relaxed">
              By continuing you agree to Gathr's Terms of Service and Privacy Policy
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
          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
          Loading...
        </span>
      ) : label}
    </button>
  )
}
