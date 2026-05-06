'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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
    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push('/home')
  }

  const handleSignUp = async () => {
    if (!name || !email || !password) { setError('Please fill in all fields'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        name: name.trim(),
        city,
        profile_mode: 'both',
        hosted_count: 0,
        attended_count: 0,
        interests: [],
      })

      if (profileError) {
        console.error('Profile creation error:', profileError)
      }

      router.push('/setup')
    }
  }

  const handleForgotPassword = async () => {
    if (!email) { setError('Enter your email address above'); return }
    setLoading(true)
    setError('')

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + '/auth/reset',
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setResetSent(true)
    setLoading(false)
  }

  const handleSubmit = () => {
    if (isForgot) handleForgotPassword()
    else if (isSignUp) handleSignUp()
    else handleSignIn()
  }

  const inputClass = 'w-full bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-3.5 text-[#F0EDE6] placeholder-white/20 outline-none focus:border-[#E8B84B]/40 text-sm'

  return (
    <div className="min-h-screen bg-[#0D110D] flex flex-col items-center px-6 pt-16 pb-10">

      {/* Logo */}
      <div className="mb-7">
        <h1 className="text-3xl font-bold text-[#F0EDE6] tracking-tight" style={{ fontFamily: 'sans-serif' }}>
          Gathr<span className="text-[#E8B84B]">.</span>
        </h1>
      </div>

      {/* Forgot password view */}
      {isForgot ? (
        <div className="w-full">
          <button onClick={() => { setIsForgot(false); setError(''); setResetSent(false) }}
            className="flex items-center gap-2 text-xs text-white/40 mb-5">
            ← Back to sign in
          </button>

          <h2 className="text-lg font-bold text-[#F0EDE6] mb-1">Reset your password</h2>
          <p className="text-xs text-white/40 mb-5">Enter your email and we'll send you a reset link.</p>

          {resetSent ? (
            <div className="bg-[#1E3A1E]/40 border border-[#7EC87E]/20 rounded-2xl px-4 py-4 text-center">
              <div className="text-2xl mb-2">📬</div>
              <p className="text-sm font-medium text-[#7EC87E] mb-1">Check your email</p>
              <p className="text-xs text-white/40">We sent a reset link to <span className="text-white/60">{email}</span></p>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                className={inputClass}
                placeholder="Email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                maxLength={100}
              />

              {error && (
                <div className="bg-[#E85B5B]/10 border border-[#E85B5B]/20 rounded-2xl px-4 py-3 flex items-center gap-2">
                  <span className="text-sm">⚠️</span>
                  <span className="text-xs text-[#E85B5B]">{error}</span>
                </div>
              )}

              <button onClick={handleSubmit} disabled={loading}
                className="w-full bg-[#E8B84B] text-[#0D110D] rounded-2xl py-4 font-bold text-sm disabled:opacity-50 active:scale-95 transition-transform"
                style={{ boxShadow: '0 4px 20px rgba(232,184,75,0.25)' }}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="w-full flex bg-[#1C241C] rounded-2xl p-1 mb-5">
            <button onClick={() => { setIsSignUp(false); setError('') }}
              className={'flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ' + (!isSignUp ? 'bg-[#E8B84B] text-[#0D110D] font-bold' : 'text-white/45')}>
              Sign In
            </button>
            <button onClick={() => { setIsSignUp(true); setError('') }}
              className={'flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ' + (isSignUp ? 'bg-[#E8B84B] text-[#0D110D] font-bold' : 'text-white/45')}>
              Sign Up
            </button>
          </div>

          {/* Form */}
          <div className="w-full space-y-3">
            {isSignUp && (
              <input
                className={inputClass}
                placeholder="Full name"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={50}
              />
            )}
            <input
              className={inputClass}
              placeholder="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              maxLength={100}
            />
            <input
              className={inputClass}
              placeholder="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              maxLength={72}
            />
            {isSignUp && (
              <select className={inputClass} value={city} onChange={e => setCity(e.target.value)}>
                {['Bellingham', 'Seattle', 'Vancouver', 'Portland', 'San Francisco', 'Los Angeles', 'New York', 'Chicago', 'Austin', 'Denver'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}

            {!isSignUp && (
              <div className="text-right">
                <button onClick={() => { setIsForgot(true); setError('') }}
                  className="text-xs text-[#E8B84B]">
                  Forgot password?
                </button>
              </div>
            )}

            {error && (
              <div className="bg-[#E85B5B]/10 border border-[#E85B5B]/20 rounded-2xl px-4 py-3 flex items-center gap-2">
                <span className="text-sm">⚠️</span>
                <span className="text-xs text-[#E85B5B]">{error}</span>
              </div>
            )}

            <button onClick={handleSubmit} disabled={loading}
              className="w-full bg-[#E8B84B] text-[#0D110D] rounded-2xl py-4 font-bold text-sm disabled:opacity-50 active:scale-95 transition-transform mt-2"
              style={{ boxShadow: '0 4px 20px rgba(232,184,75,0.25)' }}>
              {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-[10px] text-white/20">Google & Apple sign-in coming soon</p>
          </div>

          <div className="mt-8 text-center">
            <p className="text-[10px] text-white/20 leading-relaxed max-w-[260px]">
              By continuing, you agree to Gathr's Terms of Service and Privacy Policy
            </p>
          </div>
        </>
      )}
    </div>
  )
}