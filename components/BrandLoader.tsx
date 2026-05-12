'use client'

interface Props {
  /** Loader size — sm for inline/card use, md for page-level, lg for splash-adjacent moments. Default md. */
  size?: 'sm' | 'md' | 'lg'
  /** Optional small label below the loader. Use sparingly — silence is on-brand. */
  label?: string
  /** When true, fills the full viewport. When false, fills its parent. Default true. */
  fullscreen?: boolean
}

/**
 * Branded loader. Replaces the emoji-row pulse used previously.
 *
 * Used by:
 *  - Page-level fetches that take >150ms (home, profile, event detail, etc.)
 *  - The session check on the splash page
 *
 * Renders the Bricolage wordmark with a breathing gold period and a sweeping
 * progress pill underneath. Brand-native, theme-safe, motion-respectful.
 *
 * NOTE: keep this silent by default. Adding a label every time turns the
 * brand moment into a chore screen.
 */
export default function BrandLoader({ size = 'md', label, fullscreen = true }: Props) {
  const wordmarkSize =
    size === 'sm' ? 'text-3xl' :
    size === 'lg' ? 'text-[64px]' :
    'text-5xl'

  return (
    <div className={
      (fullscreen ? 'min-h-screen ' : 'h-full ') +
      'bg-[#0D110D] flex flex-col items-center justify-center gap-5 relative overflow-hidden'
    }>
      {/* Soft gold ambient wash — matches the splash family */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1/2 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center bottom, rgba(232,184,75,.12) 0%, transparent 60%)' }}
      />

      <div
        className={
          'font-display font-extrabold text-[#F0EDE6] leading-none flex items-baseline relative z-10 ' +
          wordmarkSize
        }
        style={{
          letterSpacing: '-0.05em',
          textShadow: '0 0 24px rgba(232,184,75,0.15)',
        }}>
        Gathr<span className="gathr-loader-dot">.</span>
      </div>

      <div className="gathr-loader-pill relative z-10" />

      {label && (
        <div className="font-mono-ui text-[10px] tracking-[.2em] uppercase text-[#E8B84B]/55 relative z-10">
          {label}
        </div>
      )}
    </div>
  )
}
