'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { POPULAR_INTERESTS, ALL_INTERESTS, CITY_NAMES } from '@/lib/constants'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 2 * 1024 * 1024

export default function EditProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState('')
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [city, setCity] = useState('Bellingham')
  const [interests, setInterests] = useState<string[]>([])
  const [mode, setMode] = useState('social')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [interestSearch, setInterestSearch] = useState('')
  const [rsvpVisibility, setRsvpVisibility] = useState('public')
  const fileRef = useRef<HTMLInputElement>(null)
  const interestInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUserId(session.user.id)
      supabase.from('profiles').select('name,bio_social,city,interests,profile_mode,rsvp_visibility,avatar_url').eq('id', session.user.id).single()
        .then(({ data }) => {
          if (data) {
            setName(data.name || '')
            setBio(data.bio_social || '')
            setCity(data.city || 'Bellingham')
            setInterests(data.interests || [])
            setMode(data.profile_mode || 'social')
            setRsvpVisibility(data.rsvp_visibility || 'public')
            setAvatarUrl(data.avatar_url || null)
            if (data.avatar_url) setAvatarPreview(data.avatar_url)
          }
          setLoading(false)
        })
    })
  }, [router])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('')
    const file = e.target.files?.[0]
    if (!file) return
    if (!ALLOWED_TYPES.includes(file.type)) { setUploadError('Only JPG, PNG, and WebP allowed'); return }
    if (file.size > MAX_FILE_SIZE) { setUploadError('Image must be under 2MB'); return }
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const removeAvatar = () => {
    setAvatarFile(null); setAvatarPreview(null); setAvatarUrl(null); setUploadError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !userId) return avatarUrl
    const ext = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg'
    const safeName = userId + '.' + ext
    const { error } = await supabase.storage.from('profile-photos').upload(safeName, avatarFile, { cacheControl: '3600', upsert: true })
    if (error) { setUploadError('Photo upload failed — your other changes were saved.'); return avatarUrl }
    const { data: urlData } = supabase.storage.from('profile-photos').getPublicUrl(safeName)
    return urlData?.publicUrl ? urlData.publicUrl + '?t=' + Date.now() : avatarUrl
  }

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    let finalAvatarUrl = avatarUrl
    if (avatarFile) finalAvatarUrl = await uploadAvatar()
    else if (!avatarPreview && avatarUrl) finalAvatarUrl = null
    const { error } = await supabase.from('profiles').update({
      name: name.trim(), bio_social: bio.trim(), city, interests, profile_mode: mode, avatar_url: finalAvatarUrl, rsvp_visibility: rsvpVisibility,
    }).eq('id', userId)
    setSaving(false)
    if (error) { setSaveError('Failed to save changes. Please try again.'); return }
    router.push('/profile')
  }

  const inputClass = 'w-full bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-3.5 text-[#F0EDE6] placeholder-white/20 outline-none focus:border-[#E8B84B]/40 text-sm'

  if (loading) return (
    <div className="min-h-screen bg-[#0D110D] pb-10">
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 border-b border-white/10">
        <div className="w-9 h-9 bg-white/[0.07] rounded-xl animate-pulse flex-shrink-0" />
        <div className="h-6 w-28 bg-white/[0.07] rounded-xl animate-pulse" />
        <div className="ml-auto h-8 w-16 bg-white/[0.07] rounded-xl animate-pulse" />
      </div>
      <div className="px-4 py-5 space-y-5">
        <div className="h-20 w-20 bg-white/[0.07] rounded-2xl animate-pulse" />
        <div className="h-12 w-full bg-white/[0.07] rounded-2xl animate-pulse" />
        <div className="h-20 w-full bg-white/[0.07] rounded-2xl animate-pulse" />
        <div className="h-12 w-full bg-white/[0.07] rounded-2xl animate-pulse" />
        <div className="h-32 w-full bg-white/[0.07] rounded-2xl animate-pulse" />
        <div className="h-24 w-full bg-white/[0.07] rounded-2xl animate-pulse" />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0D110D] pb-10">

      <div className="flex items-center gap-3 px-4 pt-14 pb-4 border-b border-white/10">
        <button onClick={() => router.back()}
          className="w-9 h-9 bg-[#1C241C] border border-white/10 rounded-xl flex items-center justify-center text-[#F0EDE6]">←</button>
        <h1 className="text-lg font-bold text-[#F0EDE6]">Edit Profile</h1>
        <button onClick={handleSave} disabled={saving}
          className="ml-auto bg-[#E8B84B] text-[#0D110D] px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="px-4 py-5 space-y-5">

        <div>
          <label className="text-xs text-white/50 mb-2 block">Profile photo</label>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
          <div className="flex items-center gap-4">
            {avatarPreview ? (
              <div className="relative">
                <img src={avatarPreview} alt="Avatar" className="w-20 h-20 rounded-2xl object-cover border-2 border-[#E8B84B]/35" />
                <button onClick={removeAvatar}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#E85B5B] rounded-full flex items-center justify-center text-[9px] text-white border-2 border-[#0D110D]">✕</button>
              </div>
            ) : (
              <div className="w-20 h-20 bg-[#2A4A2A] rounded-2xl border-2 border-[#E8B84B]/35 flex items-center justify-center text-3xl">🧑‍💻</div>
            )}
            <div>
              <button onClick={() => fileRef.current?.click()} className="text-sm font-medium text-[#E8B84B] active:scale-95 transition-transform">
                {avatarPreview ? 'Change photo' : 'Upload photo'}
              </button>
              <p className="text-[10px] text-white/25 mt-1">JPG, PNG, WebP · Max 2MB</p>
            </div>
          </div>
          {uploadError && <div className="text-xs text-[#E85B5B] mt-2 flex items-center gap-1.5"><span>⚠️</span> {uploadError}</div>}
        </div>

        <div>
          <label className="text-xs text-white/50 mb-1.5 block">Display name</label>
          <input className={inputClass} placeholder="Your name" value={name} onChange={e => setName(e.target.value)} maxLength={50} />
        </div>

        <div>
          <label className="text-xs text-white/50 mb-1.5 block">Tagline / Bio</label>
          <textarea className={inputClass} rows={3} placeholder="Runner · Builder · Here to host meaningful moments."
            value={bio} onChange={e => setBio(e.target.value)} maxLength={120} />
          <div className="text-[10px] text-white/25 mt-1 text-right">{bio.length} / 120</div>
        </div>

        <div>
          <label className="text-xs text-white/50 mb-1.5 block">City</label>
          <select className={inputClass} value={city} onChange={e => setCity(e.target.value)}>
            {CITY_NAMES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-white/50 mb-2 block">Profile mode</label>
          <div className="space-y-2">
            {[
              { value: 'social', icon: '👋', label: 'Social', desc: 'Meet people, attend events' },
              { value: 'professional', icon: '💼', label: 'Professional', desc: 'Network, find collaborators' },
              { value: 'both', icon: '⚡', label: 'Both', desc: 'Show up fully' },
            ].map(opt => (
              <div key={opt.value} onClick={() => setMode(opt.value)}
                className={'flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ' + (mode === opt.value ? 'border-[#E8B84B]/40 bg-[#E8B84B]/5' : 'border-white/10 bg-[#1C241C]')}>
                <span className="text-xl">{opt.icon}</span>
                <div>
                  <div className="text-sm font-medium text-[#F0EDE6]">{opt.label}</div>
                  <div className="text-xs text-white/40">{opt.desc}</div>
                </div>
                <div className={'w-4 h-4 rounded-full border-2 flex items-center justify-center ml-auto flex-shrink-0 ' + (mode === opt.value ? 'border-[#E8B84B]' : 'border-white/20')}>
                  {mode === opt.value && <div className="w-2 h-2 rounded-full bg-[#E8B84B]" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-white/50 mb-2 block">Attendee list visibility</label>
          <div className="space-y-2">
            {[
              { value: 'public', icon: '🌍', label: 'Public', desc: 'Anyone can see you on attendee lists' },
              { value: 'connections', icon: '🤝', label: 'Connections only', desc: 'Only people you\'re connected with' },
              { value: 'private', icon: '🔒', label: 'Private', desc: 'Only the event host can see you' },
            ].map(opt => (
              <div key={opt.value} onClick={() => setRsvpVisibility(opt.value)}
                className={'flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ' + (rsvpVisibility === opt.value ? 'border-[#E8B84B]/40 bg-[#E8B84B]/5' : 'border-white/10 bg-[#1C241C]')}>
                <span className="text-lg flex-shrink-0">{opt.icon}</span>
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
        </div>

        <div>
          <label className="text-xs text-white/50 mb-2 block">Interests <span className="text-white/25">({interests.length})</span></label>
          <div className="flex items-center gap-2 bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-2.5 mb-3">
            <span className="text-sm text-white/30">🔍</span>
            <input ref={interestInputRef} type="text" value={interestSearch} onChange={e => setInterestSearch(e.target.value)}
              placeholder="Search interests..."
              className="flex-1 bg-transparent text-sm text-[#F0EDE6] placeholder-white/30 outline-none" />
            {interestSearch && <button onClick={() => { setInterestSearch(''); interestInputRef.current?.focus() }} className="text-[10px] text-white/30">✕</button>}
          </div>
          {interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {interests.map(i => (
                <button key={i} onClick={() => toggleInterest(i)}
                  className="px-3 py-1.5 rounded-xl text-xs border bg-[#2A4A2A]/50 border-[#7EC87E]/30 text-[#7EC87E] flex items-center gap-1">
                  {i} <span className="text-[#7EC87E]/60 text-[10px]">✕</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
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
              <button onClick={() => { toggleInterest(interestSearch.toLowerCase()); setInterestSearch('') }}
                className="px-3 py-1.5 rounded-xl text-xs border border-dashed border-[#E8B84B]/30 text-[#E8B84B]/70 bg-[#0D110D]">
                + Add &ldquo;{interestSearch.toLowerCase()}&rdquo;
              </button>
            )}
          </div>
          {!interestSearch && <p className="text-[10px] text-white/25 mt-2">Search to find more interests</p>}
        </div>

        {saveError && (
          <div className="text-xs text-[#E85B5B] bg-[#E85B5B]/8 border border-[#E85B5B]/20 rounded-xl px-3 py-2.5">
            {saveError}
          </div>
        )}
        <button onClick={handleSave} disabled={saving || !name.trim()}
          className="w-full bg-[#E8B84B] text-[#0D110D] rounded-2xl py-4 font-bold text-sm disabled:opacity-50 mt-2 active:scale-95 transition-transform"
          style={{ boxShadow: '0 4px 20px rgba(232,184,75,0.25)' }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
