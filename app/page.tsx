'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SplashPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/home')
      } else {
        setChecking(false)
      }
    })
  }, [])

  if (checking) return (
    <div className="min-h-screen bg-[#0D110D] flex items-center justify-center">
      <div className="text-[#E8B84B] text-2xl font-bold">Gathr.</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0D110D] flex flex-col items-center justify-between px-7 py-16 relative overflow-hidden">

      {/* Glow */}
      <div className="absolute top-[-40px] left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(42,74,42,0.3) 0%, transparent 70%)' }} />

      {/* Logo */}
      <div className="flex flex-col items-center mt-16 relative z-10">
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-16 h-16 rounded-full bg-[#1E3A1E] border-[2.5px] border-[#E8B84B] flex items-center justify-center">
            <span className="text-[#E8B84B] text-4xl font-bold" style={{ fontFamily: 'sans-serif' }}>G</span>
          </div>
          <span className="text-[#F0EDE6] text-4xl font-bold tracking-tight" style={{ fontFamily: 'sans-serif' }}>ATHR</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-px w-7 bg-[#E8B84B]/20"></div>
          <span className="text-[10px] tracking-[0.18em] uppercase text-[#E8B84B]/45">Find your people</span>
          <div className="h-px w-7 bg-[#E8B84B]/20"></div>
        </div>
      </div>

      {/* Middle spacer */}
      <div />

      {/* CTAs */}
      <div className="w-full flex flex-col gap-3 relative z-10">
        <button onClick={() => router.push('/onboarding')}
          className="w-full py-4 rounded-2xl bg-[#E8B84B] text-[#0D110D] text-sm font-bold active:scale-95 transition-transform"
          style={{ boxShadow: '0 4px 20px rgba(232,184,75,0.25)' }}>
          Get Started
        </button>
        <button onClick={() => router.push('/auth')}
          className="w-full py-3.5 rounded-2xl bg-transparent border border-white/10 text-white/45 text-sm active:scale-95 transition-transform">
          Sign In
        </button>
      </div>
    </div>
  )
}