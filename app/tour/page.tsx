'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function PersonSvg({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
    </svg>
  )
}

const slides = [
  {
    tag: 'The mystery match',
    headline: <>When you RSVP,<br />the match starts.</>,
    body: 'You\'ll instantly see how many people going share your vibe — full profiles unlock after you check in. No awkward pre-screening. Just show up.',
    visual: (
      <div
        className="w-[200px] h-[150px] rounded-3xl border border-white/[0.06] relative overflow-hidden flex flex-col items-center justify-center gap-3"
        style={{ background: 'linear-gradient(160deg,#1E2A2E,#0E1A1E)' }}>
        <div className="flex gap-2 items-end">
          <div className="relative w-[34px] h-[34px] rounded-[12px] bg-[#161E16] border border-white/[0.06] flex items-center justify-center overflow-hidden flex-shrink-0">
            <PersonSvg className="text-white/[0.18]" />
            <div className="mystery-shimmer absolute inset-0" />
          </div>
          <div
            className="relative w-[34px] h-[34px] rounded-[12px] flex items-center justify-center overflow-hidden flex-shrink-0 match-float-bob"
            style={{
              background: 'linear-gradient(140deg,#2E1E00,#1A1200)',
              border: '1.5px solid rgba(232,184,75,.52)',
              boxShadow: '0 8px 24px rgba(232,184,75,.22),inset 0 1px 0 rgba(232,184,75,.2)',
            }}>
            <PersonSvg className="text-[#E8B84B]/[0.28]" />
            <div className="mystery-shimmer-gold absolute inset-0" />
          </div>
          <div className="relative w-[34px] h-[34px] rounded-[12px] bg-[#161E16] border border-white/[0.06] flex items-center justify-center overflow-hidden flex-shrink-0">
            <PersonSvg className="text-white/[0.18]" />
            <div className="mystery-shimmer absolute inset-0" style={{ animationDelay: '.5s' }} />
          </div>
        </div>
        <p className="font-mono-ui text-[8px] tracking-[.16em] uppercase text-[#E8B84B]/50">
          Check in to reveal
        </p>
      </div>
    ),
  },
  {
    tag: 'Communities',
    headline: <>Find your people<br />before the event.</>,
    body: 'Join groups built around what you\'re into — run clubs, coffee crews, tech meetups. Post, chat, and get to know the regulars before you ever show up.',
    visual: (
      <div className="w-[200px] h-[150px] rounded-3xl border border-white/[0.06] overflow-hidden flex flex-col" style={{ background: 'linear-gradient(160deg,#1A2E1A,#0E1A0E)' }}>
        <div className="flex-1 px-3 pt-3 space-y-2">
          {[
            { name: 'Bellingham Runners', count: '142', color: '#7EC87E' },
            { name: 'Coffee & Code', count: '67', color: '#E8B84B' },
            { name: 'Sunday Hikers', count: '89', color: '#7EC87E' },
          ].map(g => (
            <div key={g.name} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex-shrink-0" style={{ background: `${g.color}20`, border: `1px solid ${g.color}30` }} />
              <div className="flex-1 min-w-0">
                <div className="text-[9px] font-semibold text-[#F0EDE6] truncate">{g.name}</div>
                <div className="text-[7px] text-white/30">{g.count} members</div>
              </div>
              <div className="text-[7px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: g.color, background: `${g.color}15` }}>Join</div>
            </div>
          ))}
        </div>
        <div className="px-3 pb-3">
          <p className="font-mono-ui text-[7px] tracking-[.14em] uppercase text-[#7EC87E]/50">Your kind of people</p>
        </div>
      </div>
    ),
  },
  {
    tag: 'Safety built in',
    headline: <>Every person has<br />a trust score.</>,
    body: 'After events, attendees leave anonymous peer reviews. The scores aggregate into a public safety tier on every profile — New, Verified, Trusted, or Flagged. No other social app does this.',
    visual: (
      <div className="w-[200px] h-[150px] rounded-3xl border border-white/[0.06] overflow-hidden flex flex-col items-center justify-center gap-3" style={{ background: 'linear-gradient(160deg,#1E2A1E,#0E180E)' }}>
        <div className="flex gap-3 items-center">
          {[
            { tier: 'New', color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.06)' },
            { tier: 'Verified', color: '#7EC87E', bg: 'rgba(126,200,126,0.12)' },
            { tier: 'Trusted', color: '#E8B84B', bg: 'rgba(232,184,75,0.12)', glow: '0 0 12px rgba(232,184,75,.3)' },
          ].map(t => (
            <div key={t.tier} className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: t.bg, border: `1px solid ${t.color}30`, boxShadow: t.glow }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.color} strokeWidth="2" strokeLinecap="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <span className="text-[7px] font-semibold" style={{ color: t.color }}>{t.tier}</span>
            </div>
          ))}
        </div>
        <p className="font-mono-ui text-[8px] tracking-[.12em] uppercase text-white/30 text-center px-4">
          Peer-reviewed after every event
        </p>
      </div>
    ),
  },
  {
    tag: 'Gathr+',
    headline: <>See the mystery<br />before you go.</>,
    body: 'Gathr+ members see who waved at them, browse attendees before RSVPing, and discover everyone they\'ve crossed paths with at past events.',
    visual: (
      <div className="w-[200px] h-[150px] rounded-3xl border border-[#E8B84B]/20 overflow-hidden flex flex-col"
        style={{ background: 'linear-gradient(160deg,#2A1E04,#100C02)', boxShadow: '0 0 32px rgba(232,184,75,0.12)' }}>
        <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b border-[#E8B84B]/10">
          <span className="text-[10px] text-[#E8B84B]">✦</span>
          <span className="text-[9px] font-bold text-[#E8B84B]/70 uppercase tracking-widest">Gathr+</span>
        </div>
        <div className="flex-1 px-3 py-2 space-y-2">
          {[
            { icon: '🔮', label: 'Pre-RSVP preview' },
            { icon: '👁️', label: 'See who waved' },
            { icon: '🗺️', label: 'Paths Crossed' },
          ].map(f => (
            <div key={f.label} className="flex items-center gap-2">
              <span className="text-[10px]">{f.icon}</span>
              <span className="text-[9px] text-[#F0EDE6]/70">{f.label}</span>
              <div className="ml-auto w-2 h-2 rounded-full bg-[#E8B84B]/40" />
            </div>
          ))}
        </div>
        <div className="px-3 pb-3">
          <div className="rounded-xl py-1.5 text-center text-[9px] font-bold text-[#0D110D] bg-[#E8B84B]">
            $4.99 / month
          </div>
        </div>
      </div>
    ),
  },
  {
    tag: 'Hosting',
    headline: <>An event live<br />in under 2 min.</>,
    body: 'Pick a category, set a time, drop a location. Your draft auto-saves as you go. Paid tickets, private events, community events — all supported. No fees to host.',
    visual: (
      <div className="w-[200px] h-[150px] rounded-3xl border border-white/[0.06] overflow-hidden flex flex-col" style={{ background: 'linear-gradient(160deg,#2A1E10,#1A1208)' }}>
        <div className="flex-1 px-3 pt-3 space-y-1.5">
          {[
            { label: 'Title', value: 'Morning Run — Whatcom Falls' },
            { label: 'Date', value: 'Sat, Jun 7 · 7:00 AM' },
            { label: 'Location', value: 'Whatcom Falls Park' },
          ].map(f => (
            <div key={f.label} className="bg-[#1C1408]/60 rounded-xl px-2.5 py-1.5">
              <div className="text-[7px] text-[#E8B84B]/50 uppercase tracking-wider">{f.label}</div>
              <div className="text-[9px] text-[#F0EDE6] truncate">{f.value}</div>
            </div>
          ))}
        </div>
        <div className="px-3 pb-3">
          <div className="bg-[#E8B84B] rounded-xl py-1.5 text-center text-[9px] font-bold text-[#0D110D]">
            Publish Event →
          </div>
        </div>
      </div>
    ),
  },
]

export default function TourPage() {
  const router = useRouter()
  const [idx, setIdx] = useState(0)
  const slide = slides[idx]
  const isLast = idx === slides.length - 1

  return (
    <div className="min-h-screen bg-[#0D110D] flex flex-col">
      <div className="flex items-center justify-between px-5 pb-2" style={{ paddingTop: 'max(3.5rem, env(safe-area-inset-top))' }}>
        <div className="flex items-baseline gap-2">
          <span className="font-display font-extrabold text-[18px] text-[#F0EDE6] tracking-[-0.02em]">
            Gathr<span className="text-[#E8B84B]">.</span>
          </span>
          <span className="font-mono-ui text-[9.5px] tracking-[.18em] uppercase text-white/30 ml-1">
            {idx + 1} / {slides.length}
          </span>
        </div>
        <button onClick={() => router.push('/home')} className="text-xs text-white/35">
          Skip →
        </button>
      </div>

      {/* Dot progress */}
      <div className="flex gap-1.5 justify-center py-3">
        {slides.map((_, i) => (
          <div key={i} className="transition-all duration-300"
            style={{
              width: i === idx ? 18 : 6,
              height: 6,
              borderRadius: 3,
              background: i === idx ? '#E8B84B' : 'rgba(255,255,255,0.12)',
            }} />
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-7 text-center gap-6 pb-6">
        {slide.visual}

        <div>
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="w-[5px] h-[5px] rounded-full bg-[#E8B84B] flex-shrink-0"
              style={{ boxShadow: '0 0 8px rgba(232,184,75,.6)' }} />
            <span className="font-mono-ui text-[9.5px] tracking-[.28em] uppercase text-[#E8B84B]/60">
              {slide.tag}
            </span>
          </div>
          <h1 className="font-display font-extrabold text-[26px] text-[#F0EDE6] leading-[1.05] tracking-[-0.03em]">
            {slide.headline}
          </h1>
          <p className="font-editorial-italic text-[14.5px] text-white/55 max-w-[260px] mx-auto leading-[1.4] mt-3">
            {slide.body}
          </p>
        </div>
      </div>

      <div className="px-5 flex-shrink-0 flex gap-3" style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))' }}>
        {idx > 0 && (
          <button
            onClick={() => setIdx(idx - 1)}
            className="flex-1 py-4 rounded-2xl bg-[#1C241C] border border-white/10 text-[#F0EDE6] text-sm font-bold font-display active:scale-95 transition-transform">
            ← Back
          </button>
        )}
        <button
          onClick={() => isLast ? router.push('/home') : setIdx(idx + 1)}
          className="flex-1 py-4 rounded-2xl bg-[#E8B84B] text-[#0D110D] text-sm font-bold font-display active:scale-95 transition-transform"
          style={{ boxShadow: '0 4px 20px rgba(232,184,75,0.25)' }}>
          {isLast ? "It's time to Gathr →" : 'Next →'}
        </button>
      </div>
    </div>
  )
}
