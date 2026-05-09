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

export default function CommunitySettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const [communityId, setCommunityId] = useState('')
  const [user, setUser] = useState<any>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('General')
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public')
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    params.then(({ id }) => {
      setCommunityId(id)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) { router.push('/auth'); return }
        setUser(session.user)
        fetchCommunity(id, session.user.id)
      })
    })
  }, [])

  const fetchCommunity = async (id: string, userId: string) => {
    const { data } = await supabase.from('communities').select('*').eq('id', id).single()
    if (!data) { router.push('/communities'); return }
    if (data.created_by !== userId) { router.push('/communities/' + id); return }
    setName(data.name || '')
    setDescription(data.description || '')
    setCategory(data.category || 'General')
    setBannerUrl(data.banner_url || null)
    setBannerPreview(data.banner_url || null)
    if (data.visibility) {
      setVisibility(data.visibility)
    } else {
      setVisibility(data.is_private ? 'private' : 'public')
    }
    setLoading(false)
  }

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
    setBannerUrl(null)
    setUploadError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const uploadBanner = async (): Promise<string | null> => {
    if (!bannerFile || !user) return bannerUrl
    const ext = bannerFile.name.split('.').pop()?.toLowerCase() || 'jpg'
    const safeName = `${communityId}.${ext}`
    const { error } = await supabase.storage.from('community-banners').upload(safeName, bannerFile, { cacheControl: '3600', upsert: true })
    if (error) return bannerUrl
    const { data: urlData } = supabase.storage.from('community-banners').getPublicUrl(safeName)
    return urlData?.publicUrl || bannerUrl
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    const newBannerUrl = await uploadBanner()
    await supabase.from('communities').update({
      name: name.trim(),
      description: description.trim(),
      category,
      visibility,
      is_private: visibility === 'private',
      banner_url: newBannerUrl,
    }).eq('id', communityId)
    setSaving(false)
    router.push('/communities/' + communityId)
  }

  const handleDelete = async () => {
    if (!communityId) return
    setDeleting(true)
    await supabase.from('community_members').delete().eq('community_id', communityId)
    await supabase.from('community_posts').delete().eq('community_id', communityId)
    await supabase.from('communities').delete().eq('id', communityId)
    router.push('/communities')
  }

  const inputClass = 'w-full bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-3.5 text-[#F0EDE6] placeholder-white/20 outline-none focus:border-[#E8B84B]/40 text-sm'

  if (loading) return (
    <div className="min-h-screen bg-[#0D110D] flex items-center justify-center">
      <div className="text-[#E8B84B] text-2xl font-bold">Gathr.</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0D110D] pb-10">

      <div className="flex items-center gap-3 px-4 pt-14 pb-4 border-b border-white/10">
        <button onClick={() => router.back()}
          className="w-9 h-9 bg-[#1C241C] border border-white/10 rounded-xl flex items-center justify-center text-[#F0EDE6]">
          ←
        </button>
        <h1 className="text-lg font-bold text-[#F0EDE6] flex-1">Community Settings</h1>
        <button onClick={handleSave} disabled={saving || !name.trim()}
          className="bg-[#E8B84B] text-[#0D110D] px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="px-4 py-5 space-y-5">

        {/* Banner */}
        <div>
          <label className="text-xs text-white/40 mb-2 block">Banner image</label>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
          {bannerPreview ? (
            <div className="relative rounded-2xl overflow-hidden border border-white/10">
              <img src={bannerPreview} alt="Banner" className="w-full h-36 object-cover" />
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
          <label className="text-xs text-white/40 mb-1.5 block">Community name</label>
          <input className={inputClass} value={name} onChange={e => setName(e.target.value)} maxLength={100} placeholder="Name your community" />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">Description</label>
          <textarea className={inputClass} rows={3} value={description} onChange={e => setDescription(e.target.value)} maxLength={500} placeholder="What is this community about?" />
          <div className="text-[10px] text-white/20 mt-1 text-right">{description.length} / 500</div>
        </div>

        {/* Category */}
        <div>
          <label className="text-xs text-white/40 mb-2 block">Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs border transition-all ${
                  category === cat ? 'bg-[#E8B84B] text-[#0D110D] border-[#E8B84B] font-semibold' : 'bg-[#1C241C] text-white/40 border-white/10'
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Visibility */}
        <div>
          <label className="text-xs text-white/40 mb-2 block">Visibility</label>
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

        <button onClick={handleSave} disabled={saving || !name.trim()}
          className="w-full bg-[#E8B84B] text-[#0D110D] rounded-2xl py-4 font-bold text-sm disabled:opacity-50 active:scale-95 transition-transform"
          style={{ boxShadow: '0 4px 20px rgba(232,184,75,0.25)' }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

        <button onClick={() => setShowDeleteConfirm(true)}
          className="w-full bg-[#E85B5B]/5 border border-[#E85B5B]/20 rounded-2xl py-4 text-[#E85B5B] text-sm font-medium active:scale-[0.98] transition-transform">
          Delete Community
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center" onClick={() => setShowDeleteConfirm(false)}>
          <div className="w-full max-w-md bg-[#1C241C] rounded-t-3xl p-5 pb-10" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
            <div className="text-center mb-5">
              <div className="text-3xl mb-3">⚠️</div>
              <h3 className="text-base font-bold text-[#F0EDE6] mb-1">Delete this community?</h3>
              <p className="text-xs text-white/40">All posts and member data will be removed. This cannot be undone.</p>
            </div>
            <button onClick={handleDelete} disabled={deleting}
              className="w-full py-3.5 rounded-2xl bg-[#E85B5B] text-white font-bold text-sm mb-3 disabled:opacity-50">
              {deleting ? 'Deleting...' : 'Yes, Delete Community'}
            </button>
            <button onClick={() => setShowDeleteConfirm(false)}
              className="w-full py-3.5 rounded-2xl bg-[#0D110D] border border-white/10 text-white/50 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
