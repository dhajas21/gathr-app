'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [ready, setReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
  }, [])

  const handleReset = async () => {
    if (!password) { setError('Enter a new password'); return }
    if (password.length < 12) { setError('Password must be at least 12 characters'); return }
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
    setTimeout(() => router.push('/home'), 2000)
  }

  const inputClass = 'w-full bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-3.5 text-[#F0EDE6] placeholder-white/20 outline-none focus:border-[#E8B84B]/40 text-sm'

  return (
    <div className="min-h-screen bg-[#0D110D] flex flex-col items-center px-6 pt-16 pb-10">
      <div className="mb-7">
        <h1 className="text-3xl font-bold text-[#F0EDE6] tracking-tight" style={{ fontFamily: 'sans-serif' }}>
          Gathr<span className="text-[#E8B84B]">.</span>
        </h1>
      </div>

      {done ? (
        <div className="w-full text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-sm font-medium text-[#7EC87E] mb-1">Password updated!</p>
          <p className="text-xs text-white/40">Taking you home...</p>
        </div>
      ) : !ready ? (
        <div className="w-full text-center">
          <div className="text-4xl mb-3">🔗</div>
          <p className="text-sm text-white/50">Verifying reset link...</p>
          <p className="text-xs text-white/25 mt-2">If this takes too long, try the link in your email again.</p>
        </div>
      ) : (
        <div className="w-full">
          <h2 className="text-lg font-bold text-[#F0EDE6] mb-1">Set new password</h2>
          <p className="text-xs text-white/40 mb-5">Choose something you'll remember.</p>

          <div className="space-y-3">
            <input
              className={inputClass}
              placeholder="New password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              maxLength={72}
            />
            <input
              className={inputClass}
              placeholder="Confirm new password"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleReset()}
              maxLength={72}
            />

            {error && (
              <div className="bg-[#E85B5B]/10 border border-[#E85B5B]/20 rounded-2xl px-4 py-3 flex items-center gap-2">
                <span className="text-sm">⚠️</span>
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