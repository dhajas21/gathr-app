'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

const PLANS = [
  { id: 'monthly', label: 'Monthly', price: '$4.99', per: '/mo', savings: null },
  { id: 'yearly', label: 'Yearly', price: '$34.99', per: '/yr', savings: 'Save 42%' },
]

export default function GathrPlusPage() {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [trialError, setTrialError] = useState('')
  const router = useRouter()

  const handleSubscribe = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return }

    const accountAgeMs = Date.now() - new Date(session.user.created_at).getTime()
    const minAgeMs = 60 * 60 * 1000 // 1 hour — prevents throwaway account abuse
    if (accountAgeMs < minAgeMs) {
      setLoading(false)
      setTrialError('Your account is too new to start a free trial. Try again in a little while.')
      return
    }

    const { data: profile } = await supabase.from('profiles').select('gathr_plus_trial_used').eq('id', session.user.id).single()
    if (profile?.gathr_plus_trial_used) {
      setLoading(false)
      setTrialError('You\'ve already used your free trial. Subscribe directly to keep access.')
      return
    }

    await supabase.from('profiles').update({ gathr_plus: true, gathr_plus_trial_used: true }).eq('id', session.user.id)
    setLoading(false)
    setSuccess(true)
    setTimeout(() => router.back(), 2200)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0D110D] flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-4">✦</div>
        <h1 className="text-2xl font-bold text-[#E8B84B] mb-2">Welcome to Gathr+</h1>
        <p className="text-sm text-white/40">Your mystery matches are waiting.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D110D] flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-2">
        <button onClick={() => router.back()} className="text-white/30 text-sm">← Back</button>
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
              <div className="text-[11px] text-white/35 leading-relaxed">{perk.body}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Plan selector */}
      <div className="px-5 mb-5">
        <div className="flex gap-2">
          {PLANS.map(plan => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id as 'monthly' | 'yearly')}
              className={'flex-1 rounded-2xl border p-3.5 text-left transition-all active:scale-98 ' + (selectedPlan === plan.id ? 'bg-[#E8B84B]/10 border-[#E8B84B]/40' : 'bg-[#1C241C] border-white/[0.07]')}>
              <div className="flex items-start justify-between mb-1">
                <span className={'text-xs font-semibold ' + (selectedPlan === plan.id ? 'text-[#E8B84B]' : 'text-white/50')}>
                  {plan.label}
                </span>
                {plan.savings && (
                  <span className="text-[9px] bg-[#7EC87E]/15 text-[#7EC87E] px-1.5 py-0.5 rounded-md font-bold">
                    {plan.savings}
                  </span>
                )}
              </div>
              <div className={'text-xl font-bold ' + (selectedPlan === plan.id ? 'text-[#F0EDE6]' : 'text-white/40')}>
                {plan.price}
              </div>
              <div className={'text-[10px] ' + (selectedPlan === plan.id ? 'text-white/40' : 'text-white/20')}>
                {plan.per}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-10">
        {trialError && (
          <div className="mb-3 bg-red-500/10 border border-red-500/25 rounded-2xl px-4 py-3 text-xs text-red-400 text-center leading-relaxed">
            {trialError}
          </div>
        )}
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-[#E8B84B] text-[#0D110D] text-base font-bold active:scale-95 transition-transform disabled:opacity-60"
          style={{ boxShadow: '0 4px 24px rgba(232,184,75,0.35)' }}>
          {loading ? 'Activating…' : 'Start 7-Day Free Trial'}
        </button>
        <p className="text-[10px] text-white/20 text-center mt-3">
          Cancel anytime. No commitment. Billed {selectedPlan === 'yearly' ? 'annually' : 'monthly'} after trial.
        </p>
      </div>

    </div>
  )
}
