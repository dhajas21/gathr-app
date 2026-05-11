'use client'

import { useEffect, useState } from 'react'

interface FadeInProps {
  /** Delay before fade-in begins, in ms. Defaults to 0. */
  delay?: number
  /** Duration of the fade, in ms. Defaults to 300. */
  duration?: number
  className?: string
  children: React.ReactNode
}

/**
 * Wrap the post-skeleton content of a page with this to get a soft fade-in
 * instead of a hard pop. Pure CSS, no framer-motion dependency.
 */
export default function FadeIn({ delay = 0, duration = 300, className, children }: FadeInProps) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(4px)',
        transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
      }}>
      {children}
    </div>
  )
}
