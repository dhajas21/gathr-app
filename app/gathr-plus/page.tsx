'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { track } from '@/components/AnalyticsProvider'

const PERKS = [
  {
    icon: '🔮',
    title: 'Pre-RSVP match preview',
    body: 'See who\'s going before you commit — partial names, shared interests, and their vibe.',
    badge: null,
  },
  {
    icon: '👁️',
    title: 'See who waved at you',
    body: 'Know exactly who signalled interest before the event. Free users only see the count.',
    badge: null,
  },
  {
    icon: '👋',
    title: 'Unlimited waves',
    body: 'Signal curiosity to anyone going. If they wave back, names unlock for both of you.',
    badge: null,
  },
  {
    icon: '🗺️',
    title: 'Paths Crossed history',
    body: 'Discover everyone you\'ve co-attended events with — your own social serendipity map.',
    badge: null,
  },
  {
    icon: '🎯',
    title: 'Priority matching rank',
    body: 'Gathr+ members rank higher in other people\'s pre-event match lists.',
    badge: null,
  },
  {
    icon: '🌍',
    title: 'Travel mode',
    body: 'Match at events in any city, not just your home location.',
    badge: 'Coming Soon',
  },
  {
    icon: '✦',
    title: 'Founding Member badge',
    body: 'First 1,000 subscribers get a permanent Founding Member badge on their profile. Limited supply.',
    badge: 'Limited',
  },
  {
    icon: '❤️',
    title: 'Open to dating mode',
    body: 'Opt in to signal you\'re open to romantic connection. Only visible to other Gathr+ members who\'ve also opted in.',
    badge: null,
  },
]

export default function GathrPlusPage() {
  const [loading, setLoading] = useState(false)
  const [trialSuccess, setTrialSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [activeTrial, setActiveTrial] = useState<string | null>(null)
  const [trialUsed, setTrialUsed] = useState(false)
  const [isSubscriber, setIsSubscriber] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual')
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      supabase.from('profiles').select('gathr_plus, gathr_plus_expires_at, gathr_plus_trial_used').eq('id', session.user.id).maybeSingle()
        .then(({ data }) => {
          if (!data) return
          const trialActive = data.gathr_plus_expires_at && new Date(data.gathr_plus_expires_at) > new Date()
          setIsSubscriber(data.gathr_plus === true)
          if (trialActive && !data.gathr_plus) setActiveTrial(data.gathr_plus_expires_at as string)
          setTrialUsed(data.gathr_plus_trial_used === true)
        })
    })
    return () => { if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current) }
  }, [])

  const handleClaimTrial = async () => {
    setLoading(true)
    setErrorMsg('')
    const { data, error } = await supabase.functions.invoke('claim-gathr-plus-trial', { method: 'POST' })
    setLoading(false)
    if (error || !data?.success) {
      let message = 'Could not activate your trial. Try again.'
      if (data?.error) {
        message = data.error
      } else if (error) {
        try {
          const body = await (error as any).context?.json()
          if (body?.error) message = body.error
        } catch {
          if (error.message && !error.message.includes('non-2xx')) message = error.message
        }
      }
      setErrorMsg(message)
      return
    }
    setTrialSuccess(true)
    setActiveTrial(data.expires_at)
    setTrialUsed(true)
    track('gathr_plus_trial_claimed', { days: data.days })
    redirectTimerRef.current = setTimeout(() => router.back(), 2400)
  }

  if (trialSuccess) {
    return (
      <div className="min-h-screen bg-[#0D110D] flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-4">✦</div>
        <h1 className="text-2xl font-bold text-[#E8B84B] mb-2">Welcome to Gathr+</h1>
        <p className="text-sm text-white/40">Your mystery matches are waiting.</p>
      </div>
    )
  }

  const trialButtonLabel = trialUsed
    ? '7-Day Trial Already Used'
    : activeTrial
      ? 'Trial Active'
      : 'Start 7-Day Free Trial'

  return (
    <div className="min-h-screen bg-[#0D110D] flex flex-col pb-safe">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-2">
        <button onClick={() => router.back()} className="text-white/40 text-sm active:opacity-70 transition-opacity">← Back</button>
      </div>

      {/* Hero */}
      <div className="px-5 pt-6 pb-8 text-center relative overflow-hidden">
        {/* Ambient radial glow */}
        <div className="absolute left-1/2 -translate-x-1/2 w-80 h-56 pointer-events-none"
          style={{ top: '-10px', background: 'radial-gradient(ellipse at center, rgba(232,184,75,0.16) 0%, transparent 68%)' }} />

        {/* Icon cluster */}
        <div className="relative w-24 h-24 mx-auto mb-5">
          {/* Halo ring */}
          <div className="absolute -inset-4 rounded-[36px]"
            style={{ background: 'radial-gradient(ellipse, rgba(232,184,75,0.13) 0%, transparent 70%)' }} />
          {/* Border ring */}
          <div className="absolute inset-0 rounded-[28px] border border-[#E8B84B]/18" />
          {/* Main badge */}
          <div className="w-24 h-24 rounded-[28px] bg-gradient-to-br from-[#E8B84B] to-[#B8882A] flex items-center justify-center relative"
            style={{ boxShadow: '0 16px 52px rgba(232,184,75,0.50), 0 0 0 1px rgba(232,184,75,0.28)' }}>
            <span className="text-[46px] leading-none" style={{ filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.35))' }}>✦</span>
          </div>
          {/* Orbiting sparkles */}
          <span className="absolute -top-1.5 -right-2 text-[#E8B84B]/55 text-sm leading-none">✦</span>
          <span className="absolute top-3 -left-3.5 text-[#E8B84B]/28 text-[9px] leading-none">✦</span>
          <span className="absolute -bottom-2 right-1 text-[#E8B84B]/35 text-[8px] leading-none">✦</span>
        </div>

        {/* Label */}
        <div className="text-[9px] font-bold tracking-[0.22em] text-[#E8B84B]/50 uppercase mb-2">Premium membership</div>

        <h1 className="text-[28px] font-bold text-[#F0EDE6] mb-2 tracking-tight">
          Gathr<span className="text-[#E8B84B]">+</span>
        </h1>
        <p className="text-sm text-white/40 max-w-[260px] mx-auto leading-relaxed">
          The mystery is the point. Gathr+ lets you peek — just enough to want to show up.
        </p>
      </div>

      {/* Perks */}
      <div className="px-5 space-y-3 mb-8">
        {PERKS.map((perk, i) => (
          <div key={i} className="flex items-start gap-3 bg-[#1C241C] border border-white/[0.06] rounded-2xl p-3.5">
            <div className="w-9 h-9 bg-[#E8B84B]/8 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
              {perk.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold text-[#F0EDE6]">{perk.title}</span>
                {perk.badge === 'Coming Soon' && (
                  <span className="text-[9px] font-bold text-white/40 border border-white/15 rounded-full px-1.5 py-0.5 leading-none flex-shrink-0">
                    SOON
                  </span>
                )}
                {perk.badge === 'Limited' && (
                  <span className="text-[9px] font-bold text-[#E8B84B]/70 border border-[#E8B84B]/20 rounded-full px-1.5 py-0.5 leading-none flex-shrink-0">
                    LIMITED
                  </span>
                )}
              </div>
              <div className="text-[11px] text-white/40 leading-relaxed">{perk.body}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Pricing */}
      <div className="px-5 mb-6">
        <div className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3 text-center">Choose a plan</div>

        {/* Annual */}
        <button
          onClick={() => setSelectedPlan('annual')}
          className={
            'w-full flex items-center gap-3 rounded-2xl p-4 mb-3 border text-left transition-colors active:scale-[0.99] active:transition-transform ' +
            (selectedPlan === 'annual'
              ? 'bg-[#E8B84B]/10 border-[#E8B84B]/40'
              : 'bg-[#1C241C] border-white/[0.06]')
          }>
          <div className={
            'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ' +
            (selectedPlan === 'annual' ? 'border-[#E8B84B]' : 'border-white/20')
          }>
            {selectedPlan === 'annual' && <div className="w-2.5 h-2.5 rounded-full bg-[#E8B84B]" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-bold text-[#F0EDE6]">Annual</span>
              <span className="text-[9px] font-bold text-[#0D110D] bg-[#E8B84B] rounded-full px-2 py-0.5 leading-none">BEST VALUE</span>
            </div>
            <div className="text-[11px] text-white/40">$39.99 / year · save 33%</div>
          </div>
          <div className="text-right">
            <div className="text-base font-bold text-[#F0EDE6]">$3.33</div>
            <div className="text-[10px] text-white/30">/ month</div>
          </div>
        </button>

        {/* Monthly */}
        <button
          onClick={() => setSelectedPlan('monthly')}
          className={
            'w-full flex items-center gap-3 rounded-2xl p-4 border text-left transition-colors active:scale-[0.99] active:transition-transform ' +
            (selectedPlan === 'monthly'
              ? 'bg-[#E8B84B]/10 border-[#E8B84B]/40'
              : 'bg-[#1C241C] border-white/[0.06]')
          }>
          <div className={
            'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ' +
            (selectedPlan === 'monthly' ? 'border-[#E8B84B]' : 'border-white/20')
          }>
            {selectedPlan === 'monthly' && <div className="w-2.5 h-2.5 rounded-full bg-[#E8B84B]" />}
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-[#F0EDE6] mb-0.5">Monthly</div>
            <div className="text-[11px] text-white/40">$4.99 / month · cancel anytime</div>
          </div>
          <div className="text-right">
            <div className="text-base font-bold text-[#F0EDE6]">$4.99</div>
            <div className="text-[10px] text-white/30">/ month</div>
          </div>
        </button>

        {/* Subscribe CTA */}
        <button
          onClick={() => { track('gathr_plus_subscribe_tap', { plan: selectedPlan }); router.push('/waitlist') }}
          disabled={isSubscriber}
          className="w-full mt-4 py-4 rounded-2xl bg-[#E8B84B] text-[#0D110D] text-base font-bold active:scale-95 transition-transform disabled:opacity-50"
          style={{ boxShadow: '0 4px 24px rgba(232,184,75,0.25)' }}>
          {isSubscriber ? 'Already subscribed' : `Get Gathr+ ${selectedPlan === 'annual' ? '· $39.99/yr' : '· $4.99/mo'}`}
        </button>
        <p className="text-[10px] text-white/20 text-center mt-2">
          Billing launches at public release. You'll be notified before any charge.
        </p>
      </div>

      {/* Divider */}
      <div className="mx-5 mb-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-white/[0.06]" />
        <span className="text-[10px] text-white/20 uppercase tracking-widest">or</span>
        <div className="flex-1 h-px bg-white/[0.06]" />
      </div>

      {/* Trial CTA */}
      <div className="px-5 pb-12">
        {activeTrial && !isSubscriber && (() => {
          const ms = new Date(activeTrial).getTime() - Date.now()
          const hrs = Math.floor(ms / 3600000)
          const isUrgent = hrs < 24
          return (
            <div className={'mb-4 bg-[#7EC87E]/10 border border-[#7EC87E]/25 rounded-2xl px-4 py-3 text-center ' + (isUrgent ? 'soft-pulse' : '')}>
              <div className="text-xs font-semibold text-[#7EC87E] mb-0.5">✦ Trial active</div>
              <div className="text-[10px] text-white/40">
                {hrs >= 24 ? `${Math.floor(hrs / 24)}d ${hrs % 24}h remaining` : `${hrs}h remaining`}
              </div>
            </div>
          )
        })()}
        {isSubscriber && (
          <div className="mb-4 bg-[#E8B84B]/10 border border-[#E8B84B]/25 rounded-2xl px-4 py-3 text-center">
            <div className="text-xs font-semibold text-[#E8B84B]">✦ Gathr+ Active</div>
          </div>
        )}
        {errorMsg && (
          <div className="mb-3 bg-red-500/10 border border-red-500/25 rounded-2xl px-4 py-3 text-xs text-red-400 text-center leading-relaxed">
            {errorMsg}
          </div>
        )}
        <button
          onClick={handleClaimTrial}
          disabled={loading || isSubscriber || !!activeTrial || trialUsed}
          className="w-full py-4 rounded-2xl bg-[#1C241C] border border-[#E8B84B]/20 text-[#E8B84B] text-base font-bold active:scale-95 transition-transform disabled:opacity-40">
          {loading ? 'Activating…' : trialButtonLabel}
        </button>
        <p className="text-[10px] text-white/20 text-center mt-3">
          7-day free trial · one-time · no card required
        </p>
      </div>

    </div>
  )
}
