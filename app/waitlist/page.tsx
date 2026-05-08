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
      <div className="w-20 h-20 bg-[#E8B84B]/10 border border-[#E8B84B]/20 rounded-3xl flex items-center justify-center text-4xl mb-2">🎉</div>
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

        <div className="w-14 h-14 bg-[#E8B84B]/10 border border-[#E8B84B]/20 rounded-2xl flex items-center justify-center text-2xl mb-5">⭐</div>

        <h1 className="text-2xl font-bold text-[#F0EDE6] mb-2">Host Pro Early Access</h1>
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
            { icon: '🎟', text: 'Paid & donation ticketing' },
            { icon: '📊', text: 'Revenue & attendance analytics' },
            { icon: '📣', text: 'Promoted event placement' },
            { icon: '✉️', text: 'Direct messaging to all attendees' },
          ].map(item => (
            <div key={item.icon} className="flex items-center gap-3">
              <span className="text-base">{item.icon}</span>
              <span className="text-sm text-white/50">{item.text}</span>
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
          {loading ? 'Joining...' : 'Join the Waitlist →'}
        </button>
      </div>
    </div>
  )
}
