'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const INTERESTS = [
  'running', 'startups', 'coffee', 'design', 'hiking', 'music', 'film',
  'food', 'tech', 'art', 'reading', 'travel', 'fitness', 'photography',
  'cooking', 'yoga', 'gaming', 'fashion', 'writing', 'volunteering',
  'nightlife', 'networking', 'outdoors', 'sports', 'wellness'
]

const STEPS = ['mode', 'interests', 'city', 'done']

export default function SetupPage() {
  const [user, setUser] = useState<any>(null)
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState('both')
  const [interests, setInterests] = useState<string[]>([])
  const [city, setCity] = useState('Bellingham')
  const [citySearch, setCitySearch] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const ALL_CITIES = [
    'Bellingham', 'Seattle', 'Tacoma', 'Olympia', 'Spokane',
    'Vancouver', 'Victoria', 'Surrey', 'Portland', 'Eugene',
    'San Francisco', 'Los Angeles', 'San Diego', 'Sacramento',
    'New York', 'Brooklyn', 'Chicago', 'Austin', 'Denver',
    'Miami', 'Atlanta', 'Nashville', 'Boston', 'Philadelphia'
  ]

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUser(session.user)
    })
  }, [])

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : prev.length < 10 ? [...prev, interest] : prev
    )
  }

  const handleFinish = async () => {
    if (!user) return
    setSaving(true)
    await supabase.from('profiles').update({
      profile_mode: mode,
      interests,
      city,
    }).eq('id', user.id)
    setSaving(false)
  }

  const handleFinishAndGo = async () => {
    await handleFinish()
    router.push('/home')
  }

  const handleFinishAndTour = async () => {
    await handleFinish()
    router.push('/tour')
  }

  const filteredCities = ALL_CITIES.filter(c =>
    !citySearch || c.toLowerCase().includes(citySearch.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#0D110D] flex flex-col">

      {/* Progress */}
      <div className="px-5 pt-14">
        <div className="flex gap-1 mb-2">
          {STEPS.map((_, i) => (
            <div key={i} className={'flex-1 h-[3px] rounded-full transition-all ' + (i <= step ? 'bg-[#E8B84B]' : 'bg-white/10')} />
          ))}
        </div>
        <div className="text-xs text-white/25">Step <span className="text-[#E8B84B]">{step + 1}</span> of {STEPS.length}</div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center px-7 pt-8">

        {step === 0 && (
          <>
            <div className="text-4xl mb-4">✦</div>
            <h1 className="text-2xl font-bold text-[#F0EDE6] text-center leading-tight mb-2" style={{ fontFamily: 'sans-serif' }}>
              What brings you<br />to <span className="text-[#E8B84B]">Gathr?</span>
            </h1>
            <p className="text-sm text-white/45 text-center mb-6 max-w-[240px] font-light">You can always change this later.</p>
            <div className="w-full space-y-2">
              {[
                { value: 'social', icon: '👋', label: 'Social', desc: 'Meet people, attend events' },
                { value: 'professional', icon: '💼', label: 'Professional', desc: 'Network, find collaborators' },
                { value: 'both', icon: '⚡', label: 'Both', desc: 'Show up fully' },
              ].map(opt => (
                <button key={opt.value} onClick={() => setMode(opt.value)}
                  className={'w-full flex items-center gap-3 p-4 rounded-2xl border transition-all ' + (mode === opt.value ? 'border-[#E8B84B]/40 bg-[#E8B84B]/5' : 'border-white/10 bg-[#1C241C]')}>
                  <span className="text-xl">{opt.icon}</span>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-[#F0EDE6]">{opt.label}</div>
                    <div className="text-xs text-white/40">{opt.desc}</div>
                  </div>
                  <div className={'w-4 h-4 rounded-full border-2 flex items-center justify-center ml-auto flex-shrink-0 ' + (mode === opt.value ? 'border-[#E8B84B]' : 'border-white/20')}>
                    {mode === opt.value && <div className="w-2 h-2 rounded-full bg-[#E8B84B]" />}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="text-4xl mb-4">🎯</div>
            <h1 className="text-2xl font-bold text-[#F0EDE6] text-center leading-tight mb-2" style={{ fontFamily: 'sans-serif' }}>
              What are you<br /><span className="text-[#E8B84B]">into?</span>
            </h1>
            <p className="text-sm text-white/45 text-center mb-6 max-w-[240px] font-light">Pick up to 10. This helps us recommend events and people.</p>
            <div className="w-full flex flex-wrap gap-2 justify-center">
              {INTERESTS.map(interest => (
                <button key={interest} onClick={() => toggleInterest(interest)}
                  className={'px-3 py-1.5 rounded-xl text-xs border transition-all ' + (interests.includes(interest) ? 'bg-[#2A4A2A]/50 border-[#7EC87E]/30 text-[#7EC87E]' : 'bg-[#1C241C] border-white/10 text-white/40')}>
                  {interest}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-white/25 mt-3">{interests.length} / 10 selected</div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="text-4xl mb-4">📍</div>
            <h1 className="text-2xl font-bold text-[#F0EDE6] text-center leading-tight mb-2" style={{ fontFamily: 'sans-serif' }}>
              Where are you<br /><span className="text-[#E8B84B]">based?</span>
            </h1>
            <p className="text-sm text-white/45 text-center mb-6 max-w-[240px] font-light">We'll show you events and people nearby.</p>

            <div className="w-full flex items-center gap-2 bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-2.5 mb-3">
              <span className="text-sm text-white/30">🔍</span>
              <input type="text" value={citySearch} onChange={e => setCitySearch(e.target.value)}
                placeholder="Search cities..." className="flex-1 bg-transparent text-sm text-[#F0EDE6] placeholder-white/30 outline-none" />
            </div>

            <div className="w-full max-h-[240px] overflow-y-auto space-y-2">
              {filteredCities.map(c => (
                <button key={c} onClick={() => setCity(c)}
                  className={'w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all ' + (city === c ? 'border-[#E8B84B]/40 bg-[#E8B84B]/5' : 'border-white/10 bg-[#1C241C]')}>
                  <div className={'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ' + (city === c ? 'border-[#E8B84B]' : 'border-white/20')}>
                    {city === c && <div className="w-2 h-2 rounded-full bg-[#E8B84B]" />}
                  </div>
                  <span className="text-sm text-[#F0EDE6]">{c}</span>
                </button>
              ))}
              {citySearch.trim() && !ALL_CITIES.some(c => c.toLowerCase() === citySearch.trim().toLowerCase()) && (
                <button onClick={() => setCity(citySearch.trim())}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-dashed border-[#E8B84B]/30 bg-[#0D110D]">
                  <span className="text-sm">📍</span>
                  <span className="text-sm text-[#E8B84B]">Use &quot;{citySearch.trim()}&quot;</span>
                </button>
              )}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="text-5xl mb-4 mt-8">✦</div>
            <h1 className="text-2xl font-bold text-[#F0EDE6] text-center leading-tight mb-2" style={{ fontFamily: 'sans-serif' }}>
              Welcome to<br /><span className="text-[#E8B84B]">Gathr.</span>
            </h1>
            <p className="text-sm text-white/45 text-center mb-8 max-w-[240px] font-light">You're all set. Time to find your people.</p>

            <div className="w-full space-y-3">
              <button onClick={handleFinishAndTour} className="w-full bg-[#1C241C] border border-white/10 rounded-2xl p-4 flex items-center gap-3 text-left active:scale-[0.98] transition-transform">
                <span className="text-xl">📖</span>
                <div>
                  <div className="text-sm font-semibold text-[#F0EDE6]">Quick Tour</div>
                  <div className="text-xs text-white/40">5 slides · about 60 seconds</div>
                </div>
                <span className="ml-auto text-white/20">›</span>
              </button>
              <button onClick={handleFinishAndGo} className="w-full bg-[#1C241C] border border-white/10 rounded-2xl p-4 flex items-center gap-3 text-left active:scale-[0.98] transition-transform">
                <span className="text-xl">🚀</span>
                <div>
                  <div className="text-sm font-semibold text-[#F0EDE6]">Jump Right In</div>
                  <div className="text-xs text-white/40">Discover as you go</div>
                </div>
                <span className="ml-auto text-white/20">›</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-10 pt-4 flex flex-col gap-2">
        {step < 3 ? (
          <>
            <button onClick={() => setStep(step + 1)}
              className="w-full py-4 rounded-2xl bg-[#E8B84B] text-[#0D110D] text-sm font-bold active:scale-95 transition-transform"
              style={{ boxShadow: '0 4px 20px rgba(232,184,75,0.25)' }}>
              Continue →
            </button>
            <button onClick={() => setStep(step + 1)} className="w-full py-3 text-sm text-white/40">
              Skip for now
            </button>
          </>
        ) : (
          <>
            <button onClick={handleFinishAndGo} disabled={saving}
              className="w-full py-4 rounded-2xl bg-[#E8B84B] text-[#0D110D] text-sm font-bold active:scale-95 transition-transform disabled:opacity-50"
              style={{ boxShadow: '0 4px 20px rgba(232,184,75,0.25)' }}>
              {saving ? 'Saving...' : 'Start Exploring →'}
            </button>
            <button onClick={() => router.push('/home')} className="w-full py-3 text-sm text-white/40">
              Skip — take me to the app
            </button>
          </>
        )}
      </div>
    </div>
  )
}