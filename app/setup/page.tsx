'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { POPULAR_INTERESTS, ALL_INTERESTS, CITY_NAMES } from '@/lib/constants'

const STEPS = ['photo', 'mode', 'interests', 'city', 'privacy', 'done']

export default function SetupPage() {
  const [user, setUser] = useState<any>(null)
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [mode, setMode] = useState('both')
  const [interests, setInterests] = useState<string[]>([])
  const [city, setCity] = useState('Bellingham')
  const [rsvpVisibility, setRsvpVisibility] = useState('public')
  const [citySearch, setCitySearch] = useState('')
  const [interestSearch, setInterestSearch] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveStep, setSaveStep] = useState<'photo' | 'profile' | null>(null)
  const [saveError, setSaveError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUser(session.user)
      supabase.from('profiles').select('name, city').eq('id', session.user.id).single()
        .then(({ data }) => {
          if (data?.name) setName(data.name)
          if (data?.city) setCity(data.city)
        })
    })
  }, [router])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return
    if (file.size > 2 * 1024 * 1024) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : prev.length < 10 ? [...prev, interest] : prev
    )
  }

  const handleFinish = async (destination = '/home') => {
    if (!user || saving) return
    setSaving(true)
    setSaveStep(avatarFile ? 'photo' : 'profile')
    let avatarUrl: string | null = null
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      const { error } = await supabase.storage.from('profile-photos').upload(user.id + '.' + ext, avatarFile, { upsert: true })
      if (!error) {
        const { data: urlData } = supabase.storage.from('profile-photos').getPublicUrl(user.id + '.' + ext)
        if (urlData?.publicUrl) avatarUrl = urlData.publicUrl + '?t=' + Date.now()
      }
    }
    setSaveStep('profile')
    const { error: updateError } = await supabase.from('profiles').upsert({
      id: user.id,
      name: name.trim() || undefined,
      bio_social: bio.trim() || undefined,
      profile_mode: mode,
      interests,
      city,
      rsvp_visibility: rsvpVisibility,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    }, { onConflict: 'id' })
    setSaving(false)
    setSaveStep(null)
    if (updateError) {
      setSaveError('Something went wrong — please try again.')
      return
    }
    router.push(destination)
  }

  const filteredCities = CITY_NAMES.filter(c =>
    !citySearch || c.toLowerCase().includes(citySearch.toLowerCase())
  )

  const totalSteps = STEPS.length
  const isLast = step === totalSteps - 1

  return (
    <div className="min-h-screen bg-[#0D110D] flex flex-col">

      <div className="px-5 pt-14">
        <div className="flex gap-1 mb-2">
          {STEPS.map((_, i) => (
            <div key={i} className={'flex-1 h-[3px] rounded-full transition-all duration-300 ' + (i <= step ? 'bg-[#E8B84B]' : 'bg-white/10')} />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-white/25">Step <span className="text-[#E8B84B]">{step + 1}</span> of {totalSteps}</div>
          {step > 0 && step < totalSteps - 1 && (
            <button onClick={() => setStep(step - 1)} className="text-xs text-white/25">← Back</button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-7 pt-8 pb-4">

        {step === 0 && (
          <>
            <div className="text-4xl mb-4">📸</div>
            <h1 className="text-2xl font-bold text-[#F0EDE6] text-center leading-tight mb-2" style={{ fontFamily: 'sans-serif' }}>
              Put a face to<br />your <span className="text-[#E8B84B]">name</span>
            </h1>
            <p className="text-sm text-white/45 text-center mb-7 max-w-[240px] font-light">Profiles with photos get 3× more connections.</p>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
            <button onClick={() => fileRef.current?.click()} className="mb-6 relative group">
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="w-24 h-24 rounded-3xl object-cover border-2 border-[#E8B84B]/50" />
              ) : (
                <div className="w-24 h-24 bg-[#1C241C] rounded-3xl border-2 border-dashed border-[#E8B84B]/30 flex flex-col items-center justify-center gap-1">
                  <span className="text-2xl">🧑</span>
                  <span className="text-[9px] text-[#E8B84B]/60">Tap to add</span>
                </div>
              )}
              <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-[#E8B84B] rounded-full flex items-center justify-center text-sm border-2 border-[#0D110D]">📷</div>
            </button>
            <div className="w-full space-y-3">
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Your name</label>
                <input className="w-full bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-3.5 text-[#F0EDE6] placeholder-white/20 outline-none focus:border-[#E8B84B]/40 text-sm"
                  placeholder="Full name" value={name} onChange={e => setName(e.target.value)} maxLength={50} />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">One-line bio <span className="text-white/20">(optional)</span></label>
                <input className="w-full bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-3.5 text-[#F0EDE6] placeholder-white/20 outline-none focus:border-[#E8B84B]/40 text-sm"
                  placeholder="Runner · Builder · Coffee lover" value={bio} onChange={e => setBio(e.target.value)} maxLength={100} />
              </div>
            </div>
          </>
        )}

        {step === 1 && (
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

        {step === 2 && (
          <>
            <div className="text-4xl mb-4">🎯</div>
            <h1 className="text-2xl font-bold text-[#F0EDE6] text-center leading-tight mb-2" style={{ fontFamily: 'sans-serif' }}>
              What are you<br /><span className="text-[#E8B84B]">into?</span>
            </h1>
            <p className="text-sm text-white/45 text-center mb-4 max-w-[240px] font-light">Pick up to 10. We'll use this to recommend events.</p>

            <div className="w-full flex items-center gap-2 bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-2.5 mb-4">
              <span className="text-sm text-white/30">🔍</span>
              <input type="text" value={interestSearch} onChange={e => setInterestSearch(e.target.value)}
                placeholder="Search interests..."
                className="flex-1 bg-transparent text-sm text-[#F0EDE6] placeholder-white/30 outline-none" />
              {interestSearch && <button onClick={() => setInterestSearch('')} className="text-[10px] text-white/30">✕</button>}
            </div>

            {interests.length > 0 && (
              <div className="w-full flex flex-wrap gap-1.5 mb-3">
                {interests.map(i => (
                  <button key={i} onClick={() => toggleInterest(i)}
                    className="px-3 py-1.5 rounded-xl text-xs border bg-[#2A4A2A]/50 border-[#7EC87E]/30 text-[#7EC87E] flex items-center gap-1">
                    {i} <span className="text-[#7EC87E]/60 text-[10px]">✕</span>
                  </button>
                ))}
              </div>
            )}

            <div className="w-full flex flex-wrap gap-2 justify-center">
              {(interestSearch
                ? ALL_INTERESTS.filter(i => i.toLowerCase().includes(interestSearch.toLowerCase()) && !interests.includes(i))
                : POPULAR_INTERESTS.filter(i => !interests.includes(i))
              ).map(interest => (
                <button key={interest} onClick={() => toggleInterest(interest)}
                  className="px-3 py-1.5 rounded-xl text-xs border transition-all bg-[#1C241C] border-white/10 text-white/40 active:scale-95">
                  {interest}
                </button>
              ))}
              {interestSearch && !ALL_INTERESTS.some(i => i.toLowerCase() === interestSearch.toLowerCase()) && !interests.includes(interestSearch.toLowerCase()) && (
                <button onClick={() => toggleInterest(interestSearch.toLowerCase())}
                  className="px-3 py-1.5 rounded-xl text-xs border border-dashed border-[#E8B84B]/30 text-[#E8B84B]/70 bg-[#0D110D]">
                  + Add &ldquo;{interestSearch.toLowerCase()}&rdquo;
                </button>
              )}
            </div>
            {!interestSearch && <p className="text-[10px] text-white/25 mt-2">Search to find more interests</p>}
            <div className="text-[10px] text-white/25 mt-1">{interests.length} selected</div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="text-4xl mb-4">📍</div>
            <h1 className="text-2xl font-bold text-[#F0EDE6] text-center leading-tight mb-2" style={{ fontFamily: 'sans-serif' }}>
              Where are you<br /><span className="text-[#E8B84B]">based?</span>
            </h1>
            <p className="text-sm text-white/45 text-center mb-6 max-w-[240px] font-light">We'll show you events and people nearby.</p>
            <div className="w-full flex items-center gap-2 bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-2.5 mb-3">
              <span className="text-sm text-white/30">🔍</span>
              <input type="text" value={citySearch} onChange={e => setCitySearch(e.target.value)}
                placeholder="Search cities..."
                className="flex-1 bg-transparent text-sm text-[#F0EDE6] placeholder-white/30 outline-none" />
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
              {citySearch.trim() && !CITY_NAMES.some(c => c.toLowerCase() === citySearch.trim().toLowerCase()) && (
                <button onClick={() => setCity(citySearch.trim())}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-dashed border-[#E8B84B]/30 bg-[#0D110D]">
                  <span className="text-sm">📍</span>
                  <span className="text-sm text-[#E8B84B]">Use &quot;{citySearch.trim()}&quot;</span>
                </button>
              )}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="text-2xl font-bold text-[#F0EDE6] leading-tight mb-1" style={{ fontFamily: 'sans-serif' }}>
              Who can see you<br /><span className="text-[#E8B84B]">at events?</span>
            </h1>
            <p className="text-sm text-white/40 mb-6 max-w-[260px] font-light">Control whether others can see you on attendee lists. You can change this anytime.</p>
            <div className="w-full space-y-2">
              {[
                { value: 'public', icon: '🌍', label: 'Public', desc: 'Anyone can see you on attendee lists' },
                { value: 'connections', icon: '🤝', label: 'Connections only', desc: 'Only people you\'re connected with' },
                { value: 'private', icon: '🔒', label: 'Private', desc: 'Only the event host can see you' },
              ].map(opt => (
                <div key={opt.value} onClick={() => setRsvpVisibility(opt.value)}
                  className={'flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ' + (rsvpVisibility === opt.value ? 'border-[#E8B84B]/40 bg-[#E8B84B]/5' : 'border-white/10 bg-[#1C241C]')}>
                  <span className="text-xl flex-shrink-0">{opt.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#F0EDE6]">{opt.label}</div>
                    <div className="text-xs text-white/40">{opt.desc}</div>
                  </div>
                  <div className={'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ' + (rsvpVisibility === opt.value ? 'border-[#E8B84B]' : 'border-white/20')}>
                    {rsvpVisibility === opt.value && <div className="w-2 h-2 rounded-full bg-[#E8B84B]" />}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {step === 5 && (
          <div className="flex flex-col items-center text-center pt-6">
            <div className="w-20 h-20 bg-gradient-to-br from-[#E8B84B]/20 to-[#E8B84B]/5 border border-[#E8B84B]/20 rounded-3xl flex items-center justify-center text-4xl mb-5">✦</div>
            <h1 className="text-2xl font-bold text-[#F0EDE6] leading-tight mb-2" style={{ fontFamily: 'sans-serif' }}>
              You're all set,<br /><span className="text-[#E8B84B]">{name || 'friend'}.</span>
            </h1>
            <p className="text-sm text-white/45 mb-8 max-w-[220px] font-light">Time to find your people and discover what's happening near you.</p>
            <div className="w-full space-y-2.5 text-left">
              {[
                { icon: '🔍', title: 'Search events', desc: 'Try "live music this weekend"' },
                { icon: '👥', title: 'Join a community', desc: 'Find your crew' },
                { icon: '✨', title: 'Host something', desc: 'Tap + to create your first event' },
              ].map(tip => (
                <div key={tip.title} className="flex items-center gap-3 bg-[#1C241C] border border-white/10 rounded-2xl p-3.5">
                  <span className="text-xl">{tip.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-[#F0EDE6]">{tip.title}</div>
                    <div className="text-xs text-white/35">{tip.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-5 pb-10 pt-2 flex flex-col gap-2">
        {!isLast ? (
          <>
            <button onClick={() => setStep(step + 1)}
              className="w-full py-4 rounded-2xl bg-[#E8B84B] text-[#0D110D] text-sm font-bold active:scale-95 transition-transform"
              style={{ boxShadow: '0 4px 20px rgba(232,184,75,0.25)' }}>
              Continue →
            </button>
            {step !== 0 && (
              <button onClick={() => setStep(step + 1)} className="w-full py-3 text-sm text-white/30">Skip for now</button>
            )}
          </>
        ) : (
          <>
            {saveError && (
              <div className="mb-2 bg-red-500/10 border border-red-500/25 rounded-2xl px-4 py-2.5 text-xs text-red-400 text-center">
                {saveError}
              </div>
            )}
            <button onClick={() => handleFinish()} disabled={saving}
              className="w-full py-4 rounded-2xl bg-[#E8B84B] text-[#0D110D] text-sm font-bold active:scale-95 transition-transform disabled:opacity-50"
              style={{ boxShadow: '0 4px 20px rgba(232,184,75,0.25)' }}>
              {saveStep === 'photo' ? 'Uploading photo...' : saveStep === 'profile' ? 'Saving profile...' : 'Start Exploring →'}
            </button>
            {!saving && (
              <button onClick={() => handleFinish('/tour')}
                className="w-full py-3 text-sm text-white/35">
                Take a quick tour first ›
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
