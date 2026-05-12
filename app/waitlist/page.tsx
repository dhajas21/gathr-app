'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function WaitlistPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) return
    setLoading(true)
    setError('')

    const { data: { session } } = await supabase.auth.getSession()

    const { error: insertError } = await supabase.from('waitlist').insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      reason: reason.trim() || null,
      user_id: session?.user.id ?? null,
    })

    if (insertError && insertError.code !== '23505') {
      setError('Something went wrong — try again.')
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)
  }

  const inputClass = 'w-full bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-3.5 text-[#F0EDE6] placeholder-white/20 outline-none focus:border-[#E8B84B]/40 text-sm'
  const labelClass = 'text-xs text-white/50 mb-1.5 block'

  if (done) return (
    <div className="min-h-screen bg-[#0D110D] flex flex-col items-center justify-center px-6 text-center gap-4">
      <div className="w-20 h-20 bg-[#E8B84B]/10 border border-[#E8B84B]/20 rounded-3xl flex items-center justify-center mb-2">
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E8B84B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5"/>
  </svg>
</div>
      <h1 className="text-2xl font-bold text-[#F0EDE6]">You're on the list!</h1>
      <p className="text-sm text-white/45 max-w-[260px] leading-relaxed">We'll reach out when Host Pro opens up. Thanks for being an early supporter.</p>
      <button onClick={() => router.push('/home')}
        className="mt-4 bg-[#E8B84B] text-[#0D110D] px-8 py-3.5 rounded-2xl font-bold text-sm active:scale-95 transition-transform"
        style={{ boxShadow: '0 4px 20px rgba(232,184,75,0.25)' }}>
        Back to Home
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0D110D] flex flex-col">

      <div className="flex items-center gap-3 px-5 pt-14 pb-4">
        <button onClick={() => router.back()}
          className="w-9 h-9 bg-[#1C241C] border border-white/10 rounded-xl flex items-center justify-center text-[#F0EDE6] text-sm">
          ←
        </button>
      </div>

      <div className="flex-1 px-6 pt-4 pb-32">

        <div className="w-14 h-14 bg-[#E8B84B]/10 border border-[#E8B84B]/20 rounded-2xl flex items-center justify-center mb-5">
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(232,184,75,0.7)" strokeWidth="1.5" strokeLinecap="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
  </svg>
</div>

        <h1 className="font-display text-2xl font-bold text-[#F0EDE6] mb-2">Host Pro Early Access</h1>
        <p className="text-sm text-white/45 leading-relaxed mb-8">
          Get early access to paid ticketing, revenue analytics, promoted events, and more. We're rolling out to hosts gradually — join the list to be first.
        </p>

        <div className="space-y-4">
          <div>
            <label className={labelClass}>Your Name *</label>
            <input className={inputClass} placeholder="Jane Smith" value={name} onChange={e => setName(e.target.value)} maxLength={80} />
          </div>

          <div>
            <label className={labelClass}>Email *</label>
            <input type="email" className={inputClass} placeholder="jane@example.com" value={email} onChange={e => setEmail(e.target.value)} maxLength={200} />
          </div>

          <div>
            <label className={labelClass}>What kind of events do you host? <span className="text-white/25">(optional)</span></label>
            <textarea className={inputClass} rows={3} placeholder="Run club, open mics, startup meetups..." value={reason} onChange={e => setReason(e.target.value)} maxLength={400} />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>

        <div className="mt-6 bg-[#1C241C] border border-white/[0.07] rounded-2xl p-4 space-y-2.5">
          {[
            'Paid & donation ticketing',
            'Revenue & attendance analytics',
            'Promoted event placement',
            'Direct messaging to all attendees',
          ].map(text => (
            <div key={text} className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#E8B84B]/50 flex-shrink-0" />
              <span className="text-sm text-white/50">{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-5 pb-10 pt-4 bg-gradient-to-t from-[#0D110D] to-transparent">
        <button
          onClick={handleSubmit}
          disabled={loading || !name.trim() || !email.trim()}
          className="w-full bg-[#E8B84B] text-[#0D110D] rounded-2xl py-4 font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform"
          style={{ boxShadow: '0 4px 20px rgba(232,184,75,0.25)' }}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2"/>
                <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Joining…
            </span>
          ) : 'Join the Waitlist →'}
        </button>
      </div>
    </div>
  )
}
