'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { track } from '@/components/AnalyticsProvider'

const PERKS = [
  {
    icon: '🔮',
    title: 'See who\'s going before the event',
    body: 'Free members see 1 mystery match. Gathr+ shows all of them — partial names, shared interests, and their vibe.',
  },
  {
    icon: '👋',
    title: 'Send waves anonymously',
    body: 'Signal curiosity before an event without revealing yourself. If they wave back, it\'s a mutual match — and names unlock.',
  },
  {
    icon: '✦',
    title: 'Early reveal on mutual waves',
    body: 'When two people wave at each other pre-event, both get a first-name reveal before anyone else.',
  },
  {
    icon: '⭐',
    title: 'Gathr+ badge on your profile',
    body: 'Stand out to other members. The badge signals you\'re serious about showing up and meeting people.',
  },
  {
    icon: '🎯',
    title: 'Priority in match rankings',
    body: 'Gathr+ members are ranked higher in other people\'s pre-event match lists.',
  },
]

export default function GathrPlusPage() {
  const [loading, setLoading] = useState(false)
  const [trialSuccess, setTrialSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [activeTrial, setActiveTrial] = useState<string | null>(null)
  const [trialUsed, setTrialUsed] = useState(false)
  const [isSubscriber, setIsSubscriber] = useState(false)
  const [showWaitlistConfirm, setShowWaitlistConfirm] = useState(false)
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
      // Edge function returns 4xx with { error }; supabase-js surfaces that as error
      const message = (data as any)?.error || error?.message || 'Could not activate your trial. Try again.'
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
    <div className="min-h-screen bg-[#0D110D] flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-2">
        <button onClick={() => router.back()} className="text-white/40 text-sm active:opacity-70 transition-opacity">← Back</button>
      </div>

      {/* Hero */}
      <div className="px-5 pt-4 pb-6 text-center">
        <div className="w-16 h-16 rounded-[22px] bg-gradient-to-br from-[#E8B84B] to-[#C49A35] mx-auto mb-4 flex items-center justify-center"
          style={{ boxShadow: '0 8px 32px rgba(232,184,75,0.35)' }}>
          <span className="text-3xl">✦</span>
        </div>
        <h1 className="text-2xl font-bold text-[#F0EDE6] mb-1">
          Gathr<span className="text-[#E8B84B]">+</span>
        </h1>
        <p className="text-sm text-white/40 max-w-[260px] mx-auto leading-relaxed">
          The mystery is the point. Gathr+ lets you peek — just enough to want to show up.
        </p>
      </div>

      {/* Perks */}
      <div className="px-5 space-y-3 mb-6">
        {PERKS.map((perk, i) => (
          <div key={i} className="flex items-start gap-3 bg-[#1C241C] border border-white/[0.06] rounded-2xl p-3.5">
            <div className="w-9 h-9 bg-[#E8B84B]/8 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
              {perk.icon}
            </div>
            <div>
              <div className="text-sm font-semibold text-[#F0EDE6] mb-0.5">{perk.title}</div>
              <div className="text-[11px] text-white/40 leading-relaxed">{perk.body}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Billing Coming Soon */}
      <div className="px-5 mb-5">
        <div className="bg-[#1C241C] border border-[#E8B84B]/15 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#E8B84B]/10 border border-[#E8B84B]/20 flex items-center justify-center text-base flex-shrink-0">💳</div>
          <div className="flex-1">
            <div className="text-xs font-bold text-[#E8B84B] mb-1">Paid Gathr+ — Coming Soon</div>
            <p className="text-[10px] text-white/40 leading-relaxed mb-2">
              Monthly and annual plans roll out alongside the public launch. Until then, try Gathr+ free for 7 days.
            </p>
            <button
              onClick={() => setShowWaitlistConfirm(true)}
              className="text-[10px] text-[#E8B84B]/70 underline">
              Get notified when paid plans launch →
            </button>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-10">
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
          className="w-full py-4 rounded-2xl bg-[#E8B84B] text-[#0D110D] text-base font-bold active:scale-95 transition-transform disabled:opacity-50"
          style={{ boxShadow: '0 4px 24px rgba(232,184,75,0.35)' }}>
          {loading ? 'Activating…' : trialButtonLabel}
        </button>
        <p className="text-[10px] text-white/20 text-center mt-3">
          The 7-day trial is free and one-time. No card required. Paid plans coming soon.
        </p>
      </div>

      {/* Notify-me sheet */}
      {showWaitlistConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center" onClick={() => setShowWaitlistConfirm(false)}>
          <div className="w-full max-w-md bg-[#1C241C] rounded-t-3xl p-5 pb-10" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />
            <div className="text-center mb-5">
              <div className="text-3xl mb-3">💌</div>
              <h3 className="text-base font-bold text-[#F0EDE6] mb-1">Want a heads-up?</h3>
              <p className="text-xs text-white/40">
                We'll email you the day paid Gathr+ goes live — no spam.
              </p>
            </div>
            <button onClick={() => { setShowWaitlistConfirm(false); router.push('/waitlist') }}
              className="w-full py-3.5 rounded-2xl bg-[#E8B84B] text-[#0D110D] font-bold text-sm mb-3">
              Take me to the waitlist
            </button>
            <button onClick={() => setShowWaitlistConfirm(false)}
              className="w-full py-3.5 rounded-2xl bg-[#0D110D] border border-white/10 text-white/60 text-sm">
              Maybe later
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
