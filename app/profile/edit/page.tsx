'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const INTERESTS = ['running', 'startups', 'coffee', 'design', 'hiking', 'music', 'film', 'food', 'tech', 'art', 'reading', 'travel', 'fitness', 'photography', 'cooking']

export default function EditProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [city, setCity] = useState('Bellingham')
  const [interests, setInterests] = useState<string[]>([])
  const [mode, setMode] = useState('social')
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      supabase.from('profiles').select('*').eq('id', session.user.id).single()
        .then(({ data }) => {
          if (data) {
            setName(data.name || '')
            setBio(data.bio_social || '')
            setCity(data.city || 'Bellingham')
            setInterests(data.interests || [])
            setMode(data.profile_mode || 'social')
          }
          setLoading(false)
        })
    })
  }, [])

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('profiles').update({
      name,
      bio_social: bio,
      interests,
      profile_mode: mode,
    }).eq('id', session.user.id)
    setSaving(false)
    router.push('/profile')
  }

  const inputClass = "w-full bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-3.5 text-[#F0EDE6] placeholder-white/20 outline-none focus:border-[#E8B84B]/40 text-sm"

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

      <div className="px-4 py-5 space-y-4">

        {/* Avatar placeholder */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-[#2A4A2A] rounded-2xl border-2 border-[#E8B84B]/35 flex items-center justify-center text-2xl">🧑‍💻</div>
          <div>
            <div className="text-sm font-medium text-[#F0EDE6]">Profile photo</div>
            <div className="text-xs text-[#E8B84B] mt-1">Change photo</div>
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="text-xs text-white/50 mb-1.5 block">Display name</label>
          <input className={inputClass} placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
        </div>

        {/* Bio */}
        <div>
          <label className="text-xs text-white/50 mb-1.5 block">Tagline / Bio</label>
          <textarea className={inputClass} rows={3} placeholder="Runner · Builder · Here to host meaningful moments."
            value={bio} onChange={e => setBio(e.target.value)} />
          <div className="text-[10px] text-white/25 mt-1 text-right">{bio.length} / 120</div>
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
                className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${mode === opt.value ? 'border-[#E8B84B]/40 bg-[#E8B84B]/04' : 'border-white/10 bg-[#1C241C]'}`}>
                <span className="text-xl">{opt.icon}</span>
                <div>
                  <div className="text-sm font-medium text-[#F0EDE6]">{opt.label}</div>
                  <div className="text-xs text-white/40">{opt.desc}</div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ml-auto flex-shrink-0 ${mode === opt.value ? 'border-[#E8B84B]' : 'border-white/20'}`}>
                  {mode === opt.value && <div className="w-2 h-2 rounded-full bg-[#E8B84B]" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interests */}
        <div>
          <label className="text-xs text-white/50 mb-2 block">Interests</label>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map(interest => (
              <button key={interest} onClick={() => toggleInterest(interest)}
                className={`px-3 py-1.5 rounded-xl text-xs border transition-all ${interests.includes(interest) ? 'bg-[#2A4A2A]/50 border-[#7EC87E]/30 text-[#7EC87E]' : 'bg-[#1C241C] border-white/10 text-white/40'}`}>
                {interest}
              </button>
            ))}
          </div>
        </div>

        {/* Save button */}
        <button onClick={handleSave} disabled={saving}
          className="w-full bg-[#E8B84B] text-[#0D110D] rounded-2xl py-4 font-bold text-sm disabled:opacity-50 mt-2">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}