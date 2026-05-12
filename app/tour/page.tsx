'use client'

import { useRouter } from 'next/navigation'

// The full 7-slide tour is retired. Feature explanations (Create, Communities,
// Safety, Messages, Profile, etc.) move to contextual first-time tooltips that
// fire when the user actually touches each surface — far more useful than
// walls of explanation upfront. This single slide reinforces the one thing
// that matters before /home: the mystery match mechanic.

function PersonSvg({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
    </svg>
  )
}

export default function TourPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#0D110D] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-2">
        <div className="flex items-baseline gap-2">
          <span className="font-display font-extrabold text-[18px] text-[#F0EDE6] tracking-[-0.02em]">
            Gathr<span className="text-[#E8B84B]">.</span>
          </span>
          <span className="font-mono-ui text-[9.5px] tracking-[.18em] uppercase text-white/30 ml-1">One thing</span>
        </div>
        <button onClick={() => router.push('/home')} className="text-xs text-white/35">
          Skip →
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-7 text-center gap-6 pb-6">
        {/* Mystery match viz — one revealed, two blurred */}
        <div
          className="w-[200px] h-[140px] rounded-3xl border border-white/[0.06] relative overflow-hidden flex flex-col items-center justify-center gap-3"
          style={{ background: 'linear-gradient(160deg,#1E2A2E,#0E1A1E)' }}>
          <div className="flex gap-2">
            {[false, true, false].map((revealed, i) => (
              <div key={i}
                className="relative w-[34px] h-[34px] rounded-[12px] flex items-center justify-center overflow-hidden"
                style={{
                  background: revealed ? 'linear-gradient(135deg,#2A4A2A,#1E3A1E)' : '#161E16',
                  border: revealed ? '1px solid rgba(126,200,126,0.4)' : '1px solid rgba(255,255,255,0.06)',
                  transform: revealed ? 'translateY(-6px)' : 'translateY(0)',
                }}>
                <PersonSvg className={revealed ? 'text-[#7EC87E]/60' : 'text-white/[0.18]'} />
                {!revealed && <div className="mystery-shimmer absolute inset-0" />}
              </div>
            ))}
          </div>
          <p className="font-mono-ui text-[8px] tracking-[.16em] uppercase text-[#E8B84B]/50">
            RSVP unlocks the reveal
          </p>
        </div>

        {/* Copy */}
        <div>
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="w-[5px] h-[5px] rounded-full bg-[#E8B84B] flex-shrink-0"
              style={{ boxShadow: '0 0 8px rgba(232,184,75,.6)' }} />
            <span className="font-mono-ui text-[9.5px] tracking-[.28em] uppercase text-[#E8B84B]/60">
              The mystery match
            </span>
          </div>
          <h1 className="font-display font-extrabold text-[26px] text-[#F0EDE6] leading-[1.05] tracking-[-0.03em]">
            When you RSVP,<br />the match starts.
          </h1>
          <p className="font-editorial-italic text-[14.5px] text-white/55 max-w-[260px] mx-auto leading-[1.4] mt-3">
            You'll see how many people going share your vibe instantly — full profiles unlock after you attend.
          </p>
          <p className="font-mono-ui text-[9.5px] tracking-[.18em] uppercase text-[#E8B84B]/40 mt-5">
            Everything else, you'll discover.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-10 flex-shrink-0">
        <button
          onClick={() => router.push('/home')}
          className="w-full py-4 rounded-2xl bg-[#E8B84B] text-[#0D110D] text-sm font-bold font-display active:scale-95 transition-transform"
          style={{ boxShadow: '0 4px 20px rgba(232,184,75,0.25)' }}>
          Time to Gathr →
        </button>
      </div>
    </div>
  )
}
