'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

const SKIP_PATHS = ['/', '/auth', '/onboarding', '/tour', '/waitlist']

export default function AppResumeRadar() {
  const [active, setActive] = useState(false)
  const pathname = usePathname()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (SKIP_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
      setActive(false)
      return
    }

    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return
      if (timerRef.current) clearTimeout(timerRef.current)
      setActive(true)
      timerRef.current = setTimeout(() => setActive(false), 750)
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [pathname])

  if (!active) return null

  return (
    <div className="resume-radar-overlay" aria-hidden="true">
      <div className="resume-radar">
        <div className="resume-radar-sweep" />
        <svg viewBox="0 0 220 220" className="resume-radar-svg">
          <circle cx="110" cy="110" r="106" stroke="rgba(232,184,75,.45)" strokeWidth="1" fill="none" />
          <circle cx="110" cy="110" r="70"  stroke="rgba(232,184,75,.3)"  strokeWidth="1" fill="none" />
          <circle cx="110" cy="110" r="35"  stroke="rgba(232,184,75,.18)" strokeWidth="1" fill="none" />
        </svg>
      </div>
    </div>
  )
}
