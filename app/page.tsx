'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BrandLoader from '@/components/BrandLoader'

type Mode = 'checking' | 'splash-first' | 'splash-returning'

export default function SplashPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('checking')

  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      if (session) {
        router.push('/home')
        return
      }
      // No session — show splash. First visit ever gets the full sequence;
      // every return gets the 600ms speedrun.
      try {
        const seen = localStorage.getItem('gathr_splash_seen')
        if (seen) {
          setMode('splash-returning')
        } else {
          setMode('splash-first')
          localStorage.setItem('gathr_splash_seen', '1')
        }
      } catch {
        // localStorage unavailable (private mode, etc.) — default to first-run.
        setMode('splash-first')
      }
    })
    return () => { cancelled = true }
  }, [router])

  if (mode === 'checking') return <BrandLoader />

  const variantClass = mode === 'splash-first' ? 'first-run' : 'returning'

  return (
    <div className={`gathr-splash ${variantClass}`}>
      {/* Ambient washes */}
      <div className="green-wash" />
      <div className="gold-wash" />

      {/* Radar */}
      <div className="radar" aria-hidden="true">
        <div className="radar-sweep" />
        <div className="radar-ping" />
        <svg viewBox="0 0 580 580" style={{ overflow: 'visible' }}>
          <circle className="radar-ring-1" cx="290" cy="290" r="280" stroke="rgba(232,184,75,.85)" strokeWidth="1.2" fill="none" style={{ transformOrigin: '290px 290px', opacity: 0.07 }} />
          <circle className="radar-ring-2" cx="290" cy="290" r="215" stroke="rgba(232,184,75,.85)" strokeWidth="1.2" fill="none" style={{ transformOrigin: '290px 290px', opacity: 0.06 }} />
          <circle className="radar-ring-3" cx="290" cy="290" r="150" stroke="rgba(232,184,75,.85)" strokeWidth="1.2" fill="none" style={{ transformOrigin: '290px 290px', opacity: 0.05 }} />
          <circle className="radar-ring-4" cx="290" cy="290" r="85"  stroke="rgba(232,184,75,.85)" strokeWidth="1.2" fill="none" style={{ transformOrigin: '290px 290px', opacity: 0.04 }} />
        </svg>
      </div>

      {/* Centered stack: eyebrow / wordmark / tagline */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 z-10">
        <div className="splash-eyebrow font-mono-ui text-[9.5px] uppercase text-[#E8B84B]/60 mb-4 flex items-center gap-2.5"
             style={{ letterSpacing: '.32em' }}>
          <span className="eyebrow-pulse" />
          Right now, near you
        </div>

        <h1
          className="splash-wordmark font-display font-extrabold text-[#F0EDE6] leading-none flex items-baseline"
          style={{
            fontSize: 'clamp(72px, 22vw, 108px)',
            letterSpacing: '-0.055em',
            textShadow: '0 0 40px rgba(232,184,75,0.15)',
          }}>
          Gathr<span style={{ color: '#E8B84B', textShadow: '0 0 24px rgba(232,184,75,0.7)' }}>.</span>
        </h1>

        <p
          className="splash-tagline font-editorial mt-6 text-[17px] text-[#F0EDE6]/70 text-center max-w-[280px] leading-snug font-medium"
          style={{ fontStyle: 'italic', letterSpacing: '-0.01em' }}>
          The room is filling up.
        </p>
      </div>

      {/* CTAs */}
      <div className="splash-ctas absolute bottom-[62px] left-6 right-6 flex flex-col gap-2.5 z-20">
        <button
          onClick={() => router.push('/onboarding')}
          className="w-full py-4 rounded-full bg-[#E8B84B] text-[#0D110D] font-bold text-[13.5px] uppercase active:scale-[0.98] transition-transform font-display"
          style={{ boxShadow: '0 0 32px rgba(232,184,75,.35)', letterSpacing: '.02em' }}>
          Get started
        </button>
        <button
          onClick={() => router.push('/auth')}
          className="w-full py-3.5 rounded-full bg-transparent border border-white/[0.14] text-white/55 text-[13px] active:scale-[0.98] transition-transform">
          Sign in
        </button>
      </div>

      {/* Legal */}
      <p className="splash-legal absolute bottom-[34px] left-6 right-6 text-[9.5px] text-white/[0.18] text-center leading-relaxed z-20">
        By continuing you agree to Gathr's{' '}
        <a href="/terms" className="underline text-white/[0.32]">Terms of Service</a>
        {' '}and{' '}
        <a href="/privacy" className="underline text-white/[0.32]">Privacy Policy</a>
      </p>
    </div>
  )
}
