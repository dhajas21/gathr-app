'use client'

import { useEffect, useState } from 'react'

export default function OfflineBanner() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    if (typeof navigator === 'undefined') return
    setOnline(navigator.onLine)
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  if (online) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[200] bg-[#3A1E1E] border-b border-red-500/30 text-red-300 text-xs font-medium text-center py-1.5"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 6px)' }}>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
        You're offline — changes will sync when reconnected
      </span>
    </div>
  )
}
