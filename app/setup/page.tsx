'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { POPULAR_INTERESTS, ALL_INTERESTS, CITY_NAMES } from '@/lib/constants'
import ImageCropModal from '@/components/ImageCropModal'

const STEPS = ['photo', 'mode', 'interests', 'looking_for', 'vibe', 'offering', 'city', 'privacy', 'done']

const LOOKING_FOR_OPTIONS = [
  { value: 'new_to_city',            label: 'New to the city',       desc: 'Building a local social life from scratch' },
  { value: 'activity_partners',      label: 'Activity partners',     desc: 'Someone to hike, ski, or cook with' },
  { value: 'deepen_friendships',     label: 'Deeper friendships',    desc: 'Move past the surface-level stuff' },
  { value: 'life_change_community',  label: 'Going through a change', desc: 'Big move, new chapter, fresh start' },
  { value: 'do_more_stuff',          label: 'Just do more things',   desc: 'Get off the couch and out there' },
  { value: 'curious',                label: 'Just curious',          desc: 'No agenda — let\'s see what happens' },
] as const

const VIBE_OPTIONS = [
  { value: 'low_key',     label: 'Low-key',            desc: 'Brunches, walks, chill hangs',        emoji: '☕' },
  { value: 'active',      label: 'Active',             desc: 'Hikes, sports, outdoor adventures',   emoji: '🏔️' },
  { value: 'high_energy', label: 'High energy',        desc: 'Concerts, parties, big group things', emoji: '⚡' },
  { value: 'mix',         label: 'Mix of everything',  desc: 'Depends on the day',                  emoji: '🎲' },
] as const

// ─── SVG atoms ────────────────────────────────────────────────────
function IconBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-14 h-14 rounded-2xl bg-[#1C241C] border border-white/[0.08] flex items-center justify-center mb-4">
      {children}
    </div>
  )
}

const si = { width: 22, height: 22, fill: 'none', stroke: 'rgba(232,184,75,0.65)', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

function CameraIcon() {
  return <svg {...si} viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
}
function SparkIcon({ size = 22, opacity = 0.65 }: { size?: number; opacity?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={`rgba(232,184,75,${opacity})`} strokeWidth={1.5} strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
}
function TargetIcon() {
  return <svg {...si} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
}
function LocationIcon() {
  return <svg {...si} viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
}
function ShieldIcon() {
  return <svg {...si} viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
}
function PersonSvg({ size = 26, opacity = 0.25 }: { size?: number; opacity?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={`rgba(255,255,255,${opacity})`}>
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6"/>
    </svg>
  )
}
function SearchIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
}
function CloseIcon() {
  return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
}

// Arc spinner — matches auth/page.tsx CTA pattern
function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2"/>
      <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export default function SetupPage() {
  const [user, setUser] = useState<any>(null)
  const [step, setStep] = useState(0)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [bio, setBio] = useState('')
  const [mode, setMode] = useState('both')
  const [interests, setInterests] = useState<string[]>([])
  const [city, setCity] = useState('Bellingham')
  const [rsvpVisibility, setRsvpVisibility] = useState('public')
  const [citySearch, setCitySearch] = useState('')
  const [interestSearch, setInterestSearch] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cropMime, setCropMime] = useState('image/jpeg')
  const [saving, setSaving] = useState(false)
  const [saveStep, setSaveStep] = useState<'photo' | 'profile' | null>(null)
  const [saveError, setSaveError] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [nameError, setNameError] = useState('')
  const [lookingFor, setLookingFor] = useState<string[]>([])
  const [vibe, setVibe] = useState<string | null>(null)
  const [offering, setOffering] = useState('')
  const [isResuming, setIsResuming] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUser(session.user)
      supabase
        .from('profiles')
        .select('name, bio_social, avatar_url, profile_mode, interests, city, rsvp_visibility, looking_for, vibe, offering')
        .eq('id', session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!data) return
          if (data.name) {
            const parts = data.name.trim().split(' ')
            setFirstName(parts[0] || '')
            setLastName(parts.slice(1).join(' ') || '')
          }
          if (data.bio_social)     setBio(data.bio_social)
          if (data.avatar_url)     setAvatarPreview(data.avatar_url)
          if (data.profile_mode)   setMode(data.profile_mode)
          if (data.interests?.length) setInterests(data.interests)
          if (data.city)           setCity(data.city)
          if (data.rsvp_visibility) setRsvpVisibility(data.rsvp_visibility)
          if (data.looking_for?.length) setLookingFor(data.looking_for)
          if (data.vibe)     setVibe(data.vibe)
          if (data.offering) setOffering(data.offering)
          // Only treat as resuming if the user has already picked interests —
          // Google OAuth users get name pre-populated but have no interests yet.
          if (data.name && data.interests?.length) {
            const paramStep = parseInt(searchParams.get('step') ?? '', 10)
            setStep(paramStep >= 3 && paramStep <= 5 ? paramStep : 2)
            setIsResuming(true)
          }
        })
    })
  }, [router])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError('')
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Please use a JPG, PNG, or WebP image.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError('Image must be under 2 MB.')
      return
    }
    setCropMime(file.type)
    const reader = new FileReader()
    reader.onload = (ev) => setCropSrc(ev.target?.result as string)
    reader.readAsDataURL(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleCropConfirm = (blob: Blob, previewUrl: string) => {
    setCropSrc(null)
    setAvatarPreview(previewUrl)
    setAvatarFile(new File([blob], `avatar.${cropMime.split('/')[1]}`, { type: cropMime }))
  }

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : prev.length < 10 ? [...prev, interest] : prev
    )
  }

  const handleNext = () => {
    if (step === 0 && !firstName.trim()) {
      setNameError('Please enter your first name.')
      return
    }
    setNameError('')
    setStep(step + 1)
  }

  const compressImage = (file: File, maxPx = 800, quality = 0.88): Promise<File> =>
    new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(blob => {
          resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file)
        }, 'image/jpeg', quality)
      }
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
      img.src = url
    })

  const handleFinish = async (destination = '/home') => {
    if (!user || saving) return
    setSaving(true)
    setSaveStep(avatarFile ? 'photo' : 'profile')
    let avatarUrl: string | null = null
    let avatarFailed = false
    if (avatarFile) {
      const compressed = await compressImage(avatarFile)
      const ext = 'jpg'
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('profile-photos').upload(path, compressed, { cacheControl: '3600', contentType: 'image/jpeg' })
      if (!error) {
        const { data: urlData } = supabase.storage.from('profile-photos').getPublicUrl(path)
        if (urlData?.publicUrl) avatarUrl = urlData.publicUrl
      } else {
        avatarFailed = true
      }
    }
    setSaveStep('profile')
    const { error: updateError } = await supabase.from('profiles').upsert({
      id: user.id,
      name: [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || undefined,
      bio_social: bio.trim() || undefined,
      profile_mode: mode,
      interests,
      looking_for: lookingFor.length ? lookingFor : null,
      vibe: vibe || null,
      offering: offering.trim() || null,
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
    if (avatarFailed) {
      setSaveError("Photo didn't upload — profile saved. Add it later in Settings.")
      setTimeout(() => router.push(destination), 2500)
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

      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          mimeType={cropMime}
          aspect={1}
          circular
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}

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

        {/* ── Step 0: Photo + name ─────────────────────────────── */}
        {step === 0 && (
          <>
            <IconBox><CameraIcon /></IconBox>
            <h1 className="font-display text-2xl font-bold text-[#F0EDE6] text-center leading-tight mb-2">
              Put a face to<br />your <span className="text-[#E8B84B]">name</span>
            </h1>
            <p className="text-sm text-white/45 text-center mb-7 max-w-[240px] font-light">Profiles with photos get 3× more connections.</p>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
            <button onClick={() => fileRef.current?.click()} className="mb-6 relative group">
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="w-24 h-24 rounded-3xl object-cover border-2 border-[#E8B84B]/50" />
              ) : (
                <div className="w-24 h-24 bg-[#1C241C] rounded-3xl border-2 border-dashed border-[#E8B84B]/30 flex flex-col items-center justify-center gap-2">
                  <PersonSvg />
                  <span className="font-mono-ui text-[9px] text-[#E8B84B]/60 tracking-wide">Tap to add</span>
                </div>
              )}
              <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-[#E8B84B] rounded-full flex items-center justify-center border-2 border-[#0D110D]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0D110D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
            </button>
            {photoError && (
              <div className="text-xs text-[#E85B5B] bg-[#E85B5B]/8 border border-[#E85B5B]/20 rounded-xl px-3 py-2 mb-3 max-w-[280px] text-center">
                {photoError}
              </div>
            )}
            <div className="w-full space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-white/40 mb-1.5 block">First name <span className="text-[#E8B84B]/60">*</span></label>
                  <input className={`w-full bg-[#1C241C] border rounded-2xl px-4 py-3.5 text-[#F0EDE6] placeholder-white/20 outline-none text-sm ${nameError ? 'border-red-500/50 focus:border-red-500/70' : 'border-white/10 focus:border-[#E8B84B]/40'}`}
                    placeholder="Jane" value={firstName} onChange={e => { setFirstName(e.target.value); if (nameError) setNameError('') }} maxLength={30} autoCapitalize="words" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-white/40 mb-1.5 block">Last name</label>
                  <input className="w-full bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-3.5 text-[#F0EDE6] placeholder-white/20 outline-none focus:border-[#E8B84B]/40 text-sm"
                    placeholder="Smith" value={lastName} onChange={e => setLastName(e.target.value)} maxLength={30} autoCapitalize="words" />
                </div>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">One-line bio <span className="text-white/20">(optional)</span></label>
                <input className="w-full bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-3.5 text-[#F0EDE6] placeholder-white/20 outline-none focus:border-[#E8B84B]/40 text-sm"
                  placeholder="Runner · Builder · Coffee lover" value={bio} onChange={e => setBio(e.target.value)} maxLength={100} />
              </div>
            </div>
            {nameError && (
              <div className="mt-3 text-xs text-red-400 bg-red-500/8 border border-red-500/20 rounded-xl px-3 py-2 w-full text-center">
                {nameError}
              </div>
            )}
          </>
        )}

        {/* ── Step 1: Mode ─────────────────────────────────────── */}
        {step === 1 && (
          <>
            <IconBox><SparkIcon /></IconBox>
            <h1 className="font-display text-2xl font-bold text-[#F0EDE6] text-center leading-tight mb-2">
              What brings you<br />to <span className="text-[#E8B84B]">Gathr?</span>
            </h1>
            <p className="text-sm text-white/45 text-center mb-6 max-w-[240px] font-light">You can always change this later.</p>
            <div className="w-full space-y-2">
              {([
                {
                  value: 'social', label: 'Social', desc: 'Meet people, attend events',
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
                },
                {
                  value: 'professional', label: 'Professional', desc: 'Network, find collaborators',
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
                },
                {
                  value: 'both', label: 'Both', desc: 'Show up fully',
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>,
                },
              ] as const).map(opt => (
                <button key={opt.value} onClick={() => setMode(opt.value)}
                  className={'w-full flex items-center gap-3 p-4 rounded-2xl border transition-all ' + (mode === opt.value ? 'border-[#E8B84B]/40 bg-[#E8B84B]/5' : 'border-white/10 bg-[#1C241C]')}>
                  <span className={mode === opt.value ? 'text-[#E8B84B]' : 'text-white/35'}>{opt.icon}</span>
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

        {/* ── Step 2: Interests ─────────────────────────────────── */}
        {step === 2 && (
          <>
            {isResuming ? (
              <div className="flex items-center gap-3 w-full mb-5 bg-[#E8B84B]/[0.07] border border-[#E8B84B]/20 rounded-2xl px-4 py-3">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="w-9 h-9 rounded-xl object-cover border border-[#E8B84B]/30 flex-shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-[#E8B84B]/10 border border-[#E8B84B]/20 flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="rgba(232,184,75,0.5)"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6"/></svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#E8B84B]">Welcome back{firstName ? `, ${firstName}` : ''}</p>
                  <p className="text-[11px] text-white/45 leading-snug">Just one thing left — tell us what you&apos;re into.</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(232,184,75,0.4)" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            ) : (
              <IconBox><TargetIcon /></IconBox>
            )}
            <h1 className="font-display text-2xl font-bold text-[#F0EDE6] text-center leading-tight mb-2">
              What are you<br /><span className="text-[#E8B84B]">into?</span>
            </h1>
            <p className="text-sm text-white/45 text-center mb-4 max-w-[240px] font-light">Pick up to 10. We'll use this to recommend events.</p>
            <div className="w-full flex items-center gap-2 bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-2.5 mb-4">
              <SearchIcon />
              <input type="text" value={interestSearch} onChange={e => setInterestSearch(e.target.value)}
                placeholder="Search interests..."
                className="flex-1 bg-transparent text-sm text-[#F0EDE6] placeholder-white/30 outline-none" />
              {interestSearch && (
                <button onClick={() => setInterestSearch('')} className="text-white/30"><CloseIcon /></button>
              )}
            </div>
            {interests.length > 0 && (
              <div className="w-full flex flex-wrap gap-1.5 mb-3">
                {interests.map(i => (
                  <button key={i} onClick={() => toggleInterest(i)}
                    className="px-3 py-1.5 rounded-xl text-xs border bg-[#2A4A2A]/50 border-[#7EC87E]/30 text-[#7EC87E] flex items-center gap-1.5">
                    {i}
                    <span className="opacity-60"><CloseIcon /></span>
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

        {/* ── Step 3: Looking for ───────────────────────────────── */}
        {step === 3 && (
          <>
            <IconBox>
              <svg {...si} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
            </IconBox>
            <h1 className="font-display text-2xl font-bold text-[#F0EDE6] text-center leading-tight mb-2">
              What brings you<br />to <span className="text-[#E8B84B]">Gathr?</span>
            </h1>
            <p className="text-sm text-white/45 text-center mb-6 max-w-[240px] font-light">Pick up to 3. Helps us connect you with the right people.</p>
            <div className="w-full space-y-2">
              {LOOKING_FOR_OPTIONS.map(opt => {
                const selected = lookingFor.includes(opt.value)
                const maxed = lookingFor.length >= 3 && !selected
                return (
                  <button key={opt.value}
                    onClick={() => {
                      if (maxed) return
                      setLookingFor(prev =>
                        prev.includes(opt.value) ? prev.filter(v => v !== opt.value) : [...prev, opt.value]
                      )
                    }}
                    className={'w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left '
                      + (selected ? 'border-[#E8B84B]/40 bg-[#E8B84B]/5' : maxed ? 'border-white/5 bg-[#1C241C] opacity-40' : 'border-white/10 bg-[#1C241C]')}>
                    <div className={'w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 '
                      + (selected ? 'border-[#E8B84B] bg-[#E8B84B]' : 'border-white/20')}>
                      {selected && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#0D110D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 6l3 3 5-5"/>
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-[#F0EDE6]">{opt.label}</div>
                      <div className="text-xs text-white/40">{opt.desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>
            {lookingFor.length === 3 && (
              <p className="text-[10px] text-[#E8B84B]/60 mt-2">Max 3 selected</p>
            )}
          </>
        )}

        {/* ── Step 4: Vibe ──────────────────────────────────────── */}
        {step === 4 && (
          <>
            <IconBox>
              <svg {...si} viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            </IconBox>
            <h1 className="font-display text-2xl font-bold text-[#F0EDE6] text-center leading-tight mb-2">
              What's your<br /><span className="text-[#E8B84B]">vibe?</span>
            </h1>
            <p className="text-sm text-white/45 text-center mb-6 max-w-[240px] font-light">We'll use this privately to improve your matches.</p>
            <div className="w-full space-y-2">
              {VIBE_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setVibe(opt.value)}
                  className={'w-full flex items-center gap-3 p-4 rounded-2xl border transition-all '
                    + (vibe === opt.value ? 'border-[#E8B84B]/40 bg-[#E8B84B]/5' : 'border-white/10 bg-[#1C241C]')}>
                  <span className="text-2xl w-8 text-center">{opt.emoji}</span>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-semibold text-[#F0EDE6]">{opt.label}</div>
                    <div className="text-xs text-white/40">{opt.desc}</div>
                  </div>
                  <div className={'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 '
                    + (vibe === opt.value ? 'border-[#E8B84B]' : 'border-white/20')}>
                    {vibe === opt.value && <div className="w-2 h-2 rounded-full bg-[#E8B84B]" />}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 5: Offering ──────────────────────────────────── */}
        {step === 5 && (
          <>
            <IconBox>
              <svg {...si} viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </IconBox>
            <h1 className="font-display text-2xl font-bold text-[#F0EDE6] text-center leading-tight mb-2">
              What's your<br /><span className="text-[#E8B84B]">thing?</span>
            </h1>
            <p className="text-sm text-white/45 text-center mb-6 max-w-[240px] font-light">What do you bring to the table? This shows on your profile. Optional.</p>
            <div className="w-full">
              <textarea
                value={offering}
                onChange={e => setOffering(e.target.value.slice(0, 150))}
                placeholder={'e.g. “I make a mean sourdough and know every trail in a 30-mile radius.”'}
                rows={4}
                className="w-full bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-3.5 text-[#F0EDE6] placeholder-white/20 outline-none focus:border-[#E8B84B]/40 text-sm resize-none leading-relaxed"
              />
              <div className="flex justify-end mt-1">
                <span className={'text-[10px] ' + (offering.length >= 140 ? 'text-[#E8B84B]/70' : 'text-white/25')}>
                  {offering.length}/150
                </span>
              </div>
            </div>
          </>
        )}

        {/* ── Step 6: City ──────────────────────────────────────── */}
        {step === 6 && (
          <>
            <IconBox><LocationIcon /></IconBox>
            <h1 className="font-display text-2xl font-bold text-[#F0EDE6] text-center leading-tight mb-2">
              Where are you<br /><span className="text-[#E8B84B]">based?</span>
            </h1>
            <p className="text-sm text-white/45 text-center mb-6 max-w-[240px] font-light">We'll show you events and people nearby.</p>
            <div className="w-full flex items-center gap-2 bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-2.5 mb-3">
              <SearchIcon />
              <input type="text" value={citySearch} onChange={e => setCitySearch(e.target.value)}
                placeholder="Search cities..."
                className="flex-1 bg-transparent text-[#F0EDE6] placeholder-white/30 outline-none"
                style={{ fontSize: '16px' }} />
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(232,184,75,0.6)" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span className="text-sm text-[#E8B84B]">Use &quot;{citySearch.trim()}&quot;</span>
                </button>
              )}
            </div>
          </>
        )}

        {/* ── Step 7: Privacy ───────────────────────────────────── */}
        {step === 7 && (
          <>
            <IconBox><ShieldIcon /></IconBox>
            <h1 className="font-display text-2xl font-bold text-[#F0EDE6] leading-tight mb-1">
              Who can see you<br /><span className="text-[#E8B84B]">at events?</span>
            </h1>
            <p className="text-sm text-white/40 mb-6 max-w-[260px] font-light">Control whether others can see you on attendee lists. You can change this anytime.</p>
            <div className="w-full space-y-2">
              {([
                {
                  value: 'public', label: 'Public', desc: 'Anyone can see you on attendee lists',
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
                },
                {
                  value: 'connections', label: 'Connections only', desc: "Only people you're connected with",
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
                },
                {
                  value: 'private', label: 'Private', desc: 'Only the event host can see you',
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
                },
              ] as const).map(opt => (
                <div key={opt.value} onClick={() => setRsvpVisibility(opt.value)}
                  className={'flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ' + (rsvpVisibility === opt.value ? 'border-[#E8B84B]/40 bg-[#E8B84B]/5' : 'border-white/10 bg-[#1C241C]')}>
                  <span className={'flex-shrink-0 ' + (rsvpVisibility === opt.value ? 'text-[#E8B84B]' : 'text-white/35')}>{opt.icon}</span>
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

        {/* ── Step 8: Done ──────────────────────────────────────── */}
        {step === 8 && (
          <div className="flex flex-col items-center text-center pt-6">
            <div className="w-20 h-20 bg-gradient-to-br from-[#E8B84B]/20 to-[#E8B84B]/5 border border-[#E8B84B]/20 rounded-3xl flex items-center justify-center mb-5">
              <SparkIcon size={28} opacity={0.8} />
            </div>
            <h1 className="font-display text-2xl font-bold text-[#F0EDE6] leading-tight mb-2">
              You're all set,<br /><span className="text-[#E8B84B]">{firstName || 'friend'}.</span>
            </h1>
            <p className="text-sm text-white/45 mb-8 max-w-[220px] font-light">Time to find your people and discover what's happening near you.</p>
            <div className="w-full space-y-2.5 text-left">
              {[
                {
                  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(232,184,75,0.65)" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
                  title: 'Search events', desc: 'Try "live music this weekend"',
                },
                {
                  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(232,184,75,0.65)" strokeWidth="1.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
                  title: 'Join a community', desc: 'Find your crew',
                },
                {
                  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(232,184,75,0.65)" strokeWidth="1.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
                  title: 'Host something', desc: 'Tap + to create your first event',
                },
                {
                  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(232,184,75,0.65)" strokeWidth="1.5" strokeLinecap="round"><path d="M7 11.5a4.5 4.5 0 1 0 9 0 4.5 4.5 0 0 0-9 0"/><path d="M11.5 7V3M11.5 16v4M7 11.5H3M20 11.5h-4"/></svg>,
                  title: 'Try Gathr+', desc: 'See who waved, peek before RSVPing — free 7-day trial',
                },
              ].map(tip => (
                <div key={tip.title} className="flex items-center gap-3 bg-[#1C241C] border border-white/10 rounded-2xl p-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#E8B84B]/8 border border-[#E8B84B]/15 flex items-center justify-center flex-shrink-0">
                    {tip.icon}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#F0EDE6]">{tip.title}</div>
                    <div className="text-xs text-white/40">{tip.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <div className="px-5 pb-10 pt-2 flex flex-col gap-2">
        {!isLast ? (
          <>
            <button onClick={handleNext}
              className="w-full py-4 rounded-2xl bg-[#E8B84B] text-[#0D110D] text-sm font-bold font-display active:scale-95 transition-transform"
              style={{ boxShadow: '0 4px 20px rgba(232,184,75,0.25)' }}>
              Continue →
            </button>
            {step !== 0 && (
              <button onClick={() => setStep(step + 1)} className="w-full py-3 text-sm text-white/30">
                Skip for now
              </button>
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
              className="w-full py-4 rounded-2xl bg-[#E8B84B] text-[#0D110D] text-sm font-bold font-display active:scale-95 transition-transform disabled:opacity-50"
              style={{ boxShadow: '0 4px 20px rgba(232,184,75,0.25)' }}>
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <SpinnerIcon />
                  {saveStep === 'photo' ? 'Uploading photo…' : 'Saving profile…'}
                </span>
              ) : 'Start Exploring →'}
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
