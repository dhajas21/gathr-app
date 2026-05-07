'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const INTERESTS = [
  'running', 'startups', 'coffee', 'design', 'hiking', 'music', 'film',
  'food', 'tech', 'art', 'reading', 'travel', 'fitness', 'photography',
  'cooking', 'yoga', 'gaming', 'fashion', 'writing', 'volunteering',
  'nightlife', 'networking', 'outdoors', 'sports', 'wellness'
]

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
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUserId(session.user.id)
      supabase.from('profiles').select('*').eq('id', session.user.id).single()
        .then(({ data }) => {
          if (data) {
            setName(data.name || '')
            setBio(data.bio_social || '')
            setCity(data.city || 'Bellingham')
            setInterests(data.interests || [])
            setMode(data.profile_mode || 'social')
            setAvatarUrl(data.avatar_url || null)
            if (data.avatar_url) setAvatarPreview(data.avatar_url)
          }
          setLoading(false)
        })
    })
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('')
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('Only JPG, PNG, and WebP allowed')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('Image must be under 2MB')
      return
    }

    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const removeAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
    setAvatarUrl(null)
    setUploadError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !userId) return avatarUrl

    const ext = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg'
    const safeName = userId + '.' + ext

    const { error } = await supabase.storage
      .from('profile-photos')
      .upload(safeName, avatarFile, {
        cacheControl: '3600',
        upsert: true,
      })

    if (error) {
      console.error('Upload error:', error)
      return avatarUrl
    }

    const { data: urlData } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(safeName)

    return urlData?.publicUrl ? urlData.publicUrl + '?t=' + Date.now() : avatarUrl
  }

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : prev.length < 10 ? [...prev, interest] : prev
    )
  }

  const handleSave = async () => {
    setSaving(true)

    let finalAvatarUrl = avatarUrl
    if (avatarFile) {
      finalAvatarUrl = await uploadAvatar()
    } else if (!avatarPreview && avatarUrl) {
      finalAvatarUrl = null
    }

    await supabase.from('profiles').update({
      name: name.trim(),
      bio_social: bio.trim(),
      city,
      interests,
      profile_mode: mode,
      avatar_url: finalAvatarUrl,
    }).eq('id', userId)

    setSaving(false)
    router.refresh()
    router.replace('/profile')
  }

  const inputClass = 'w-full bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-3.5 text-[#F0EDE6] placeholder-white/20 outline-none focus:border-[#E8B84B]/40 text-sm'

  if (loading) return (
    <div className="min-h-screen bg-[#0D110D] flex items-center justify-center">
      <div className="text-[#E8B84B] text-2xl font-bold">Gathr.</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0D110D] pb-10">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 border-b border-white/10">
        <button onClick={() => router.back()}
          className="w-9 h-9 bg-[#1C241C] border border-white/10 rounded-xl flex items-center justify-center text-[#F0EDE6]">
          ←
        </button>
        <h1 className="text-lg font-bold text-[#F0EDE6]">Edit Profile</h1>
        <button onClick={handleSave} disabled={saving}
          className="ml-auto bg-[#E8B84B] text-[#0D110D] px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="px-4 py-5 space-y-5">

        {/* Avatar */}
        <div>
          <label className="text-xs text-white/50 mb-2 block">Profile photo</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex items-center gap-4">
            {avatarPreview ? (
              <div className="relative">
                <img src={avatarPreview} alt="Avatar"
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-[#E8B84B]/35" />
                <button onClick={removeAvatar}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#E85B5B] rounded-full flex items-center justify-center text-[9px] text-white border-2 border-[#0D110D]">
                  ✕
                </button>
              </div>
            ) : (
              <div className="w-20 h-20 bg-[#2A4A2A] rounded-2xl border-2 border-[#E8B84B]/35 flex items-center justify-center text-3xl">
                🧑‍💻
              </div>
            )}
            <div>
              <button onClick={() => fileRef.current?.click()}
                className="text-sm font-medium text-[#E8B84B] active:scale-95 transition-transform">
                {avatarPreview ? 'Change photo' : 'Upload photo'}
              </button>
              <p className="text-[10px] text-white/25 mt-1">JPG, PNG, WebP · Max 2MB</p>
            </div>
          </div>
          {uploadError && (
            <div className="text-xs text-[#E85B5B] mt-2 flex items-center gap-1.5">
              <span>⚠️</span> {uploadError}
            </div>
          )}
        </div>

        {/* Name */}
        <div>
          <label className="text-xs text-white/50 mb-1.5 block">Display name</label>
          <input className={inputClass} placeholder="Your name" value={name}
            onChange={e => setName(e.target.value)} maxLength={50} />
        </div>

        {/* Bio */}
        <div>
          <label className="text-xs text-white/50 mb-1.5 block">Tagline / Bio</label>
          <textarea className={inputClass} rows={3} placeholder="Runner · Builder · Here to host meaningful moments."
            value={bio} onChange={e => setBio(e.target.value)} maxLength={120} />
          <div className="text-[10px] text-white/25 mt-1 text-right">{bio.length} / 120</div>
        </div>

        {/* City */}
        <div>
          <label className="text-xs text-white/50 mb-1.5 block">City</label>
          <select className={inputClass} value={city} onChange={e => setCity(e.target.value)}>
            {['Bellingham', 'Seattle', 'Vancouver', 'Portland', 'San Francisco', 'Los Angeles', 'New York', 'Chicago', 'Austin', 'Denver'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Mode */}
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

        {/* Interests */}
        <div>
          <label className="text-xs text-white/50 mb-2 block">Interests <span className="text-white/25">({interests.length}/10)</span></label>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map(interest => (
              <button key={interest} onClick={() => toggleInterest(interest)}
                className={'px-3 py-1.5 rounded-xl text-xs border transition-all ' + (interests.includes(interest) ? 'bg-[#2A4A2A]/50 border-[#7EC87E]/30 text-[#7EC87E]' : 'bg-[#1C241C] border-white/10 text-white/40')}>
                {interest}
              </button>
            ))}
          </div>
        </div>

        {/* Save button */}
        <button onClick={handleSave} disabled={saving}
          className="w-full bg-[#E8B84B] text-[#0D110D] rounded-2xl py-4 font-bold text-sm disabled:opacity-50 mt-2 active:scale-95 transition-transform"
          style={{ boxShadow: '0 4px 20px rgba(232,184,75,0.25)' }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}