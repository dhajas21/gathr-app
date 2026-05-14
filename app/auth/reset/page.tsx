'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PasswordInput from '@/components/PasswordInput'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [ready, setReady] = useState(false)
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => {
      subscription.unsubscribe()
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current)
    }
  }, [])

  const handleReset = async () => {
    if (!password) { setError('Enter a new password'); return }
    if (password.length < 10) { setError('Password must be at least 10 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }

    setLoading(true)
    setError('')

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      const msg = updateError.message.toLowerCase()
      if (msg.includes('expired') || msg.includes('invalid') || msg.includes('token')) {
        setError('This reset link has expired. Request a new one from the sign-in screen.')
      } else {
        setError(updateError.message)
      }
      setLoading(false)
      return
    }

    setDone(true)
    redirectTimerRef.current = setTimeout(() => router.push('/home'), 2000)
  }

  const inputClass = 'w-full bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-3.5 text-[#F0EDE6] placeholder-white/20 outline-none focus:border-[#E8B84B]/40 text-sm'

  return (
    <div className="min-h-screen bg-[#0D110D] flex flex-col items-center px-6 pt-16 pb-10">
      <div className="mb-7">
        <h1 className="font-display text-3xl font-bold text-[#F0EDE6] tracking-tight">
          Gathr<span className="text-[#E8B84B]">.</span>
        </h1>
      </div>

      {done ? (
        <div className="w-full text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#7EC87E]/10 border border-[#7EC87E]/20 flex items-center justify-center mx-auto mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7EC87E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          </div>
          <p className="text-sm font-medium text-[#7EC87E] mb-1">Password updated!</p>
          <p className="text-xs text-white/40">Taking you home...</p>
        </div>
      ) : !ready ? (
        <div className="w-full text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#1C241C] border border-white/10 flex items-center justify-center mx-auto mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          </div>
          <p className="text-sm text-white/50">Verifying reset link...</p>
          <p className="text-xs text-white/25 mt-2">If this takes too long, try the link in your email again.</p>
        </div>
      ) : (
        <div className="w-full">
          <h2 className="font-display text-lg font-bold text-[#F0EDE6] mb-1">Set new password</h2>
          <p className="text-xs text-white/40 mb-5">Choose something you'll remember.</p>

          <div className="space-y-3">
            <PasswordInput
              className={inputClass}
              placeholder="New password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
            />
            <PasswordInput
              className={inputClass}
              placeholder="Confirm new password"
              value={confirm}
              onChange={setConfirm}
              onKeyDown={e => e.key === 'Enter' && handleReset()}
              autoComplete="new-password"
            />

            {error && (
              <div className="bg-[#E85B5B]/10 border border-[#E85B5B]/20 rounded-2xl px-4 py-3 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E85B5B" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                <span className="text-xs text-[#E85B5B]">{error}</span>
              </div>
            )}

            <button onClick={handleReset} disabled={loading}
              className="w-full bg-[#E8B84B] text-[#0D110D] rounded-2xl py-4 font-bold text-sm disabled:opacity-50 active:scale-95 transition-transform"
              style={{ boxShadow: '0 4px 20px rgba(232,184,75,0.25)' }}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}