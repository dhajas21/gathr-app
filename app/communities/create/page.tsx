'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const CATEGORIES = [
  'Social', 'Fitness & Running', 'Wellness', 'Tech & Startups', 'Arts & Creativity',
  'Music', 'Food & Drink', 'Outdoors & Adventure', 'Gaming', 'Education & Learning',
  'Business & Networking', 'Sports', 'Photography', 'Film & Media', 'Books & Writing',
  'Health & Medicine', 'Science', 'LGBTQ+', 'Sustainability', 'Cooking',
  'Travel', 'Dance', 'Comedy', 'Fashion & Style', 'Pets & Animals',
  'Finance & Investing', 'Real Estate', 'Nightlife', 'Family & Parenting', 'Spirituality', 'General',
]

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 8 * 1024 * 1024

export default function CreateCommunityPage() {
  const [user, setUser] = useState<any>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('General')
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public')
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUser(session.user)
    })
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('')
    const file = e.target.files?.[0]
    if (!file) return
    if (!ALLOWED_TYPES.includes(file.type)) { setUploadError('Only JPG, PNG, and WebP images are allowed'); return }
    if (file.size > MAX_FILE_SIZE) { setUploadError('Image must be under 8MB'); return }
    setBannerFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setBannerPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const removeBanner = () => {
    setBannerFile(null)
    setBannerPreview(null)
    setUploadError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const uploadBanner = async (communityId: string): Promise<string | null> => {
    if (!bannerFile || !user) return null
    const ext = bannerFile.name.split('.').pop()?.toLowerCase() || 'jpg'
    const safeName = `${communityId}.${ext}`
    const { error } = await supabase.storage.from('community-banners').upload(safeName, bannerFile, { cacheControl: '3600', upsert: true })
    if (error) { setUploadError('Banner upload failed — ' + (error.message || 'try a smaller image')); return null }
    const { data: urlData } = supabase.storage.from('community-banners').getPublicUrl(safeName)
    return urlData?.publicUrl || null
  }

  const handleCreate = async () => {
    if (!name.trim() || !user || loading) return
    if (name.trim().length < 3) return
    setLoading(true)

    // member_count starts at 0; the community_member_count_trigger bumps it to 1 when the owner row is inserted
    const { data: community, error } = await supabase.from('communities').insert({
      name: name.trim(),
      description: description.trim() || null,
      category,
      visibility,
      is_private: visibility === 'private',
      created_by: user.id,
      member_count: 0,
    }).select().single()

    if (error || !community) {
      setUploadError(error?.message || 'Failed to create community')
      setLoading(false)
      return
    }

    // Insert owner row — trigger handles member_count
    const { error: memberError } = await supabase.from('community_members').insert({
      community_id: community.id,
      user_id: user.id,
      role: 'owner',
    })
    if (memberError) {
      // Roll back the community row so we don't orphan it
      await supabase.from('communities').delete().eq('id', community.id)
      setUploadError('Failed to register you as the owner. Try again.')
      setLoading(false)
      return
    }

    if (bannerFile) {
      const bannerUrl = await uploadBanner(community.id)
      if (bannerUrl) {
        await supabase.from('communities').update({ banner_url: bannerUrl }).eq('id', community.id)
      }
    }

    router.push(`/communities/${community.id}`)
    setLoading(false)
  }

  const inputClass = "w-full bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-3.5 text-[#F0EDE6] placeholder-white/20 outline-none focus:border-[#E8B84B]/40 text-sm"

  return (
    <div className="min-h-screen bg-[#0D110D] pb-10">

      <div className="flex items-center gap-3 px-4 pt-14 pb-4 border-b border-white/10">
        <button onClick={() => router.back()}
          className="w-9 h-9 bg-[#1C241C] border border-white/10 rounded-xl flex items-center justify-center text-[#F0EDE6]">
          ←
        </button>
        <h1 className="text-lg font-bold text-[#F0EDE6]">New Community</h1>
      </div>

      <div className="px-4 py-5 space-y-5">

        {/* Banner upload */}
        <div>
          <label className="text-xs text-white/50 mb-2 block">Banner image</label>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
          {bannerPreview ? (
            <div className="relative rounded-2xl overflow-hidden border border-white/10">
              <img src={bannerPreview} alt="Banner preview" className="w-full h-36 object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <button onClick={removeBanner}
                className="absolute top-2 right-2 w-7 h-7 bg-[#0D110D]/80 border border-white/15 rounded-lg flex items-center justify-center text-xs text-[#F0EDE6]">
                ✕
              </button>
              <button onClick={() => fileRef.current?.click()}
                className="absolute bottom-2 right-2 bg-[#0D110D]/80 border border-white/15 rounded-lg px-2.5 py-1 text-[10px] text-[#E8B84B]">
                Change
              </button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()}
              className="w-full h-28 bg-[#1C241C] border-2 border-dashed border-[#E8B84B]/25 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition-transform">
              <span className="text-2xl">🖼</span>
              <span className="text-xs text-white/40">Tap to upload a banner photo</span>
              <span className="text-[10px] text-white/20">JPG, PNG, WebP · Max 8MB</span>
            </button>
          )}
          {uploadError && <div className="text-xs text-[#E85B5B] mt-2">⚠️ {uploadError}</div>}
        </div>

        {/* Name */}
        <div>
          <label className="text-xs text-white/50 mb-1.5 block">Community name *</label>
          <input className={inputClass} placeholder="e.g. Bellingham Runners Club"
            value={name} onChange={e => setName(e.target.value)} maxLength={100} />
          <div className="text-[10px] text-white/25 mt-1 text-right">{name.length} / 100</div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-white/50 mb-1.5 block">Description</label>
          <textarea className={inputClass} rows={3}
            placeholder="What's this community about?"
            value={description} onChange={e => setDescription(e.target.value)} maxLength={500} />
          <div className="text-[10px] text-white/25 mt-1 text-right">{description.length} / 500</div>
        </div>

        {/* Category */}
        <div>
          <label className="text-xs text-white/50 mb-2 block">Category *</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs border transition-all ${
                  category === cat
                    ? 'bg-[#E8B84B] text-[#0D110D] border-[#E8B84B] font-semibold'
                    : 'bg-[#1C241C] text-white/40 border-white/10'
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Visibility */}
        <div>
          <label className="text-xs text-white/50 mb-2 block">Visibility</label>
          <div className="space-y-2">
            {([
              { value: 'public', icon: '🌐', label: 'Public', desc: 'Anyone can find and join' },
              { value: 'unlisted', icon: '🔗', label: 'Unlisted', desc: 'Only people with the link can join' },
              { value: 'private', icon: '🔒', label: 'Private', desc: 'Members must be approved by you' },
            ] as const).map(opt => (
              <div key={opt.value} onClick={() => setVisibility(opt.value)}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  visibility === opt.value ? 'border-[#E8B84B]/40 bg-[#E8B84B]/5' : 'border-white/10 bg-[#1C241C]'
                }`}>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  visibility === opt.value ? 'border-[#E8B84B]' : 'border-white/20'
                }`}>
                  {visibility === opt.value && <div className="w-2 h-2 rounded-full bg-[#E8B84B]" />}
                </div>
                <span className="text-base">{opt.icon}</span>
                <div>
                  <div className="text-sm font-medium text-[#F0EDE6]">{opt.label}</div>
                  <div className="text-xs text-white/40">{opt.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={handleCreate}
          disabled={loading || name.trim().length < 3}
          className="w-full bg-[#E8B84B] text-[#0D110D] rounded-2xl py-4 font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform"
          style={{ boxShadow: '0 5px 22px rgba(232,184,75,0.3)' }}>
          {loading ? 'Creating...' : 'Create Community 🌱'}
        </button>
      </div>
    </div>
  )
}
