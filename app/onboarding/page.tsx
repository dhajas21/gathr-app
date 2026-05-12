'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// ─── SVG atoms ────────────────────────────────────────────────────
function PersonSvg({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
    </svg>
  )
}

function LockSvg() {
  return (
    <svg width="8" height="9" viewBox="0 0 12 14" fill="none"
      stroke="rgba(232,184,75,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="6" width="10" height="8" rx="2" />
      <path d="M4 6V4a2 2 0 0 1 4 0v2" />
    </svg>
  )
}

// ─── Event category icons ─────────────────────────────────────────
const CAT_GRADIENT: Record<string, string> = {
  fit:   'linear-gradient(135deg,#1E3A2E,#0E1A14)',
  music: 'linear-gradient(135deg,#3A1E2A,#1A0E14)',
  food:  'linear-gradient(135deg,#3A2E1E,#1A140E)',
  out:   'linear-gradient(135deg,#1E3A1E,#0E1A0E)',
  tech:  'linear-gradient(135deg,#1E2A3A,#0E141A)',
}

function CatIcon({ cat }: { cat: string }) {
  const p = { width: 20, height: 20, fill: 'none', stroke: 'rgba(232,184,75,0.45)', strokeWidth: 1.5, strokeLinecap: 'round' as const }
  if (cat === 'fit')   return <svg {...p} viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5"/><path d="M8 20 10 13l2 2.5 2-4.5 4 9"/><path d="M5 11h4l2 3h5l1-4h3"/></svg>
  if (cat === 'music') return <svg {...p} viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
  if (cat === 'food')  return <svg {...p} viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="2" x2="6" y2="5"/><line x1="10" y1="2" x2="10" y2="5"/><line x1="14" y1="2" x2="14" y2="5"/></svg>
  if (cat === 'out')   return <svg {...p} viewBox="0 0 24 24"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>
  if (cat === 'tech')  return <svg {...p} viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
  return null
}

// ─── Eyebrow ──────────────────────────────────────────────────────
function Eyebrow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <span className="w-[5px] h-[5px] rounded-full bg-[#E8B84B] flex-shrink-0"
        style={{ boxShadow: '0 0 8px rgba(232,184,75,.6)' }} />
      <span className="font-mono-ui text-[9.5px] tracking-[.28em] uppercase text-[#E8B84B]/60">{label}</span>
    </div>
  )
}

// ─── Sample events
// Hardcoded for pre-auth onboarding. City = Bellingham (launch city).
// TODO: pass dynamic city once geolocation / onboarding city-pick is live.
const SAMPLE_EVENTS = [
  { cat: 'fit',   when: 'Tomorrow · 7 AM', title: 'Tuesday Run Club',       where: 'Boulevard Park',  rsvp: '12 going', match: '3 match' },
  { cat: 'music', when: 'Sat · 8 PM',      title: 'Open Mic Night',         where: 'The Pickford',    rsvp: '24 going', match: '7 match' },
  { cat: 'food',  when: 'Sun · 10 AM',     title: 'Sunday Pour-Over Club',  where: 'Camber Coffee',   rsvp: '8 going',  match: '2 match' },
  { cat: 'out',   when: 'Sat · 5 AM',      title: 'Mt. Baker Sunrise Hike', where: 'Heather Meadows', rsvp: '6 going',  match: '1 match' },
  { cat: 'tech',  when: 'Thu · 7 PM',      title: 'Indie Devs Coffee Chat', where: 'Make.Shift',      rsvp: '14 going', match: '4 match' },
]

// ─── Slide 1 — Mystery Match ──────────────────────────────────────
function SlideMatch() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 px-7 text-center">
      <div className="w-full max-w-[300px] bg-[#1C241C] border border-white/[0.06] rounded-[20px] p-[18px] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[60px] rounded-t-[20px]"
          style={{ background: 'linear-gradient(135deg,#1E3A1E 0%,#2A1A0E 100%)' }} />
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center mb-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(232,184,75,0.55)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
            </svg>
          </div>
          <h3 className="font-display font-bold text-[15px] text-[#F0EDE6] tracking-tight mb-1">
            Open Mic at The Pickford
          </h3>
          <p className="font-mono-ui text-[9.5px] tracking-[.1em] uppercase text-white/40 mb-3.5">
            Sat · 8 PM · Bellingham
          </p>
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#E8B84B]/[0.06] border border-[#E8B84B]/20">
            <div>
              <p className="font-mono-ui text-[9px] uppercase tracking-[.14em] text-[#E8B84B]/65 mb-2.5">
                People going share your vibe
              </p>
              <div className="flex gap-2">
                {[0, 1, 2].map(i => (
                  <div key={i}
                    className="relative w-[50px] h-[50px] rounded-[14px] bg-[#161E16] border border-white/[0.06] flex items-center justify-center overflow-hidden">
                    <PersonSvg className="text-white/[0.18]" />
                    <div className="mystery-shimmer absolute inset-0" />
                    <span className="absolute bottom-[3px] right-[3px]"><LockSvg /></span>
                  </div>
                ))}
              </div>
            </div>
            <div className="font-display font-bold text-[28px] text-[#E8B84B] tracking-tight leading-none ml-3">3</div>
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <Eyebrow label="The Mystery Match" />
        <h1 className="font-display font-extrabold text-[30px] text-[#F0EDE6] leading-[.95] tracking-[-0.04em] pt-1">
          You'll know someone there.
        </h1>
        <p className="font-editorial-italic text-[20px] text-[#E8B84B] leading-[1.2] tracking-[-0.01em]">
          You just don't know who yet.
        </p>
        <p className="text-[13px] text-white/45 leading-[1.55] max-w-[250px] mx-auto pt-1">
          Gathr shows how many people at each event share your vibe — and reveals who they are only after the event ends.
        </p>
      </div>
    </div>
  )
}

// ─── Slide 2 — Sample Events ──────────────────────────────────────
function SlideEvents() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-[26px] pt-4 pb-2 flex-shrink-0">
        <Eyebrow label="This week in Bellingham" />
        <h1 className="font-display font-extrabold text-[28px] text-[#F0EDE6] leading-[1.0] tracking-[-0.035em] mt-2">
          <span className="text-[#E8B84B]">24</span> things happening.
        </h1>
        <p className="font-editorial-italic text-[13.5px] text-white/55 mt-1">
          A peek before you sign up.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hide px-[22px] py-2 flex flex-col gap-2.5 min-h-0">
        {SAMPLE_EVENTS.map((e, i) => (
          <div key={i} className="flex bg-[#1C241C] border border-white/[0.06] rounded-[18px] overflow-hidden flex-shrink-0">
            <div className="w-[80px] h-[80px] flex-shrink-0 flex items-center justify-center"
              style={{ background: CAT_GRADIENT[e.cat] }}>
              <CatIcon cat={e.cat} />
            </div>
            <div className="flex-1 p-[10px_14px] flex flex-col justify-center gap-0.5 min-w-0">
              <p className="font-mono-ui text-[9px] tracking-[.12em] uppercase text-[#E8B84B]/55">{e.when}</p>
              <h4 className="font-display font-bold text-[13.5px] text-[#F0EDE6] tracking-tight truncate">{e.title}</h4>
              <p className="text-[11px] text-white/35 truncate">{e.where}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-mono-ui text-[8.5px] tracking-[.08em] uppercase text-[#7EC87E] bg-[#7EC87E]/10 border border-[#7EC87E]/20 px-1.5 py-0.5 rounded-[5px]">
                  {e.rsvp}
                </span>
                <span className="font-mono-ui text-[8.5px] text-[#E8B84B]/65 tracking-[.05em] uppercase">
                  · {e.match}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="font-editorial-italic text-[12.5px] text-[#E8B84B]/55 text-center px-6 py-2.5 flex-shrink-0">
        Sign up to RSVP and see who's going.
      </p>
    </div>
  )
}

// ─── Slide 3 — Brand Close ────────────────────────────────────────
function SlideBrand() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-7 relative overflow-hidden">
      <div className="absolute bottom-[-60px] left-[-20%] right-[-20%] h-[50%] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center,rgba(232,184,75,.14) 0%,transparent 60%)' }} />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <Eyebrow label="Welcome to Gathr" />
        <div>
          <h1 className="font-display font-extrabold text-[48px] text-[#F0EDE6] leading-[.92] tracking-[-0.045em]">
            The event is the excuse.
          </h1>
          <span className="font-editorial-italic font-semibold text-[32px] text-[#E8B84B] tracking-[-0.03em] leading-[1.1] block mt-1">
            The people are the point.
          </span>
        </div>
        <p className="font-editorial-italic text-[16px] text-white/60 max-w-[240px] leading-[1.4]">
          Find your people, your vibe, your scene — in real life.
        </p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const [current, setCurrent] = useState(0)
  const [visible, setVisible] = useState(true)
  const router = useRouter()

  const TOTAL = 3

  const goTo = (next: number) => {
    setVisible(false)
    setTimeout(() => { setCurrent(next); setVisible(true) }, 160)
  }

  const handleNext = () => {
    if (current < TOTAL - 1) goTo(current + 1)
    else router.push('/auth')
  }

  const slides = [<SlideMatch key={0} />, <SlideEvents key={1} />, <SlideBrand key={2} />]
  const ctaLabel = current === 0 ? 'Next →' : current === 1 ? "I'm in →" : 'Create my account'

  return (
    <div className="min-h-screen bg-[#0D110D] flex flex-col overflow-hidden">
      <div
        className="flex-1 flex flex-col min-h-0 transition-[opacity,transform] duration-[160ms] ease-out"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(10px)',
        }}
      >
        {slides[current]}
      </div>
      <div className="px-5 pb-10 pt-3 flex flex-col gap-2 relative z-10 flex-shrink-0">
        <div className="flex justify-center gap-1.5 mb-2">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <button key={i} onClick={() => goTo(i)}
              className={'h-[5px] rounded-full transition-all duration-300 ' +
                (i === current ? 'w-5 bg-[#E8B84B]' : 'w-[5px] bg-white/15')} />
          ))}
        </div>
        <button onClick={handleNext}
          className="w-full py-4 rounded-2xl bg-[#E8B84B] text-[#0D110D] text-sm font-bold font-display active:scale-95 transition-transform"
          style={{ boxShadow: '0 4px 20px rgba(232,184,75,0.25)' }}>
          {ctaLabel}
        </button>
        {current === TOTAL - 1 ? (
          <button onClick={() => router.push('/auth')}
            className="w-full py-3.5 rounded-2xl bg-[#161E16] border border-white/10 text-sm font-medium text-white/50 active:scale-95 transition-transform">
            I already have an account
          </button>
        ) : (
          <button onClick={() => router.push('/auth')}
            className="w-full py-3 text-sm text-white/35">
            Skip for now
          </button>
        )}
      </div>
    </div>
  )
}
