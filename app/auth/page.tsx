'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSignUp = async () => {
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    if (data.user) {
      await supabase.from('profiles').insert({ id: data.user.id, name })
      router.push('/home')
    }
    setLoading(false)
  }

  const handleSignIn = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/home')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0D110D] flex flex-col items-center justify-center px-8">
      <div className="mb-10 text-center">
        <h1 className="text-5xl font-bold text-[#E8B84B]">Gathr.</h1>
        <p className="text-[#F0EDE6] mt-2 opacity-50 text-sm">Find your people. For real.</p>
      </div>

      <div className="w-full max-w-sm">
        <div className="flex bg-[#1C241C] rounded-2xl p-1 mb-6">
          <button
            onClick={() => setMode('signin')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${mode === 'signin' ? 'bg-[#E8B84B] text-[#0D110D]' : 'text-[#F0EDE6] opacity-50'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${mode === 'signup' ? 'bg-[#E8B84B] text-[#0D110D]' : 'text-[#F0EDE6] opacity-50'}`}
          >
            Sign Up
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-4 text-[#F0EDE6] placeholder-white/20 outline-none focus:border-[#E8B84B]/40 text-sm"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-4 text-[#F0EDE6] placeholder-white/20 outline-none focus:border-[#E8B84B]/40 text-sm"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-4 text-[#F0EDE6] placeholder-white/20 outline-none focus:border-[#E8B84B]/40 text-sm"
          />

          {error && <p className="text-red-400 text-xs px-1">{error}</p>}

          <button
            onClick={mode === 'signup' ? handleSignUp : handleSignIn}
            disabled={loading}
            className="w-full bg-[#E8B84B] text-[#0D110D] rounded-2xl py-4 font-semibold text-sm mt-1 active:scale-95 transition-transform disabled:opacity-50"
          >
            {loading ? 'Loading...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  )
}