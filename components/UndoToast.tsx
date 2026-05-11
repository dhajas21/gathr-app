'use client'

import { useEffect, useState } from 'react'

interface UndoToastProps {
  /** Visible label shown to the user. Keep short. */
  message: string
  /** Action label for the undo button (defaults to "Undo"). */
  actionLabel?: string
  /** Milliseconds before the toast auto-commits. Defaults to 5000. */
  duration?: number
  /** Called if the user taps Undo before the timer runs out. */
  onUndo: () => void
  /** Called when the timer expires (commit the destructive action). */
  onCommit: () => void
  /** When true, the toast renders and the timer runs. */
  open: boolean
  /** Called when the toast finishes (after either undo or commit). */
  onClose: () => void
}

/**
 * Snackbar-style toast with an Undo affordance for destructive actions.
 * Pattern: caller already removed/modified state optimistically; this toast
 * either commits or rolls back depending on user action.
 */
export default function UndoToast({
  message, actionLabel = 'Undo', duration = 5000,
  onUndo, onCommit, open, onClose,
}: UndoToastProps) {
  const [visible, setVisible] = useState(open)
  const [progress, setProgress] = useState(1)

  useEffect(() => { setVisible(open) }, [open])

  useEffect(() => {
    if (!open) return
    setProgress(1)
    const startedAt = Date.now()
    const tick = () => {
      const elapsed = Date.now() - startedAt
      const remaining = Math.max(0, 1 - elapsed / duration)
      setProgress(remaining)
      if (remaining <= 0) {
        clearInterval(interval)
        clearTimeout(timeout)
      }
    }
    const interval = setInterval(tick, 50)
    const timeout = setTimeout(() => {
      try { onCommit() } finally {
        setVisible(false)
        onClose()
      }
    }, duration)
    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [open, duration, onCommit, onClose])

  if (!visible) return null

  const handleUndo = () => {
    setVisible(false)
    try { onUndo() } finally { onClose() }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 bg-[#1C241C] border border-white/15 rounded-2xl pl-4 pr-2 py-2.5 shadow-2xl backdrop-blur-md min-w-[280px] max-w-[92vw] transition-all duration-300"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 92px)' }}>
      <span className="text-sm text-[#F0EDE6] flex-1">{message}</span>
      <button
        onClick={handleUndo}
        className="relative overflow-hidden bg-[#E8B84B] text-[#0D110D] text-xs font-bold px-3 py-1.5 rounded-xl active:scale-95 transition-transform">
        {/* Progress strip */}
        <span
          className="absolute left-0 bottom-0 h-[2px] bg-[#0D110D]/40 transition-all duration-75 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
        {actionLabel}
      </button>
    </div>
  )
}
