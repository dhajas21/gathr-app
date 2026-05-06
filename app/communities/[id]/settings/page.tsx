'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const CATEGORIES = ['Social', 'Tech', 'Fitness', 'Music', 'Food & Drink', 'Outdoors', 'Arts & Culture', 'Networking', 'Gaming', 'Wellness']
const ICONS = ['👥', '💻', '🏃', '🎸', '🍺', '🥾', '🎨', '💼', '🎮', '🧘', '📚', '🌿', '🎯', '🔥', '⚡']

export default function CommunitySettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const [communityId, setCommunityId] = useState('')
  const [user, setUser] = useState<any>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Social')
  const [icon, setIcon] = useState('👥')
  const [isPrivate, setIsPrivate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
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
    setCategory(data.category || 'Social')
    setIcon(data.icon || '👥')
    setIsPrivate(data.is_private || false)
    setLoading(false)
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    await supabase.from('communities').update({
      name: name.trim(),
      description: description.trim(),
      category,
      icon,
      is_private: isPrivate,
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

        {/* Icon picker */}
        <div>
          <label className="text-xs text-white/40 mb-2 block">Icon</label>
          <div className="flex flex-wrap gap-2">
            {ICONS.map(ic => (
              <button key={ic} onClick={() => setIcon(ic)}
                className={'w-10 h-10 rounded-xl text-xl flex items-center justify-center border transition-all ' + (icon === ic ? 'border-[#E8B84B]/50 bg-[#E8B84B]/10' : 'border-white/10 bg-[#1C241C]')}>
                {ic}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">Community name</label>
          <input className={inputClass} value={name} onChange={e => setName(e.target.value)} maxLength={50} placeholder="Name your community" />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">Description</label>
          <textarea className={inputClass} rows={3} value={description} onChange={e => setDescription(e.target.value)} maxLength={300} placeholder="What is this community about?" />
          <div className="text-[10px] text-white/20 mt-1 text-right">{description.length} / 300</div>
        </div>

        {/* Category */}
        <div>
          <label className="text-xs text-white/40 mb-2 block">Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={'px-3 py-1.5 rounded-xl text-xs border transition-all ' + (category === cat ? 'bg-[#E8B84B] text-[#0D110D] border-[#E8B84B] font-semibold' : 'bg-[#1C241C] text-white/40 border-white/10')}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Privacy */}
        <div>
          <label className="text-xs text-white/40 mb-2 block">Privacy</label>
          <div className="bg-[#1C241C] border border-white/10 rounded-2xl overflow-hidden">
            {[
              { value: false, icon: '🌐', label: 'Public', desc: 'Anyone can find and join' },
              { value: true, icon: '🔒', label: 'Private', desc: 'Members must be approved' },
            ].map(opt => (
              <div key={String(opt.value)} onClick={() => setIsPrivate(opt.value)}
                className={'flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors ' + (isPrivate === opt.value ? 'bg-[#E8B84B]/5' : '') + (opt.value === false ? ' border-b border-white/10' : '')}>
                <span className="text-lg">{opt.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-[#F0EDE6]">{opt.label}</div>
                  <div className="text-xs text-white/35">{opt.desc}</div>
                </div>
                <div className={'w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ' + (isPrivate === opt.value ? 'border-[#E8B84B]' : 'border-white/20')}>
                  {isPrivate === opt.value && <div className="w-2 h-2 rounded-full bg-[#E8B84B]" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <button onClick={handleSave} disabled={saving || !name.trim()}
          className="w-full bg-[#E8B84B] text-[#0D110D] rounded-2xl py-4 font-bold text-sm disabled:opacity-50 active:scale-95 transition-transform"
          style={{ boxShadow: '0 4px 20px rgba(232,184,75,0.25)' }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

        {/* Delete */}
        <button onClick={() => setShowDeleteConfirm(true)}
          className="w-full bg-[#E85B5B]/5 border border-[#E85B5B]/20 rounded-2xl py-4 text-[#E85B5B] text-sm font-medium active:scale-[0.98] transition-transform">
          Delete Community
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center" onClick={() => setShowDeleteConfirm(false)}>
          <div className="w-full max-w-md bg-[#1C241C] rounded-t-3xl p-5 pb-10" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4"></div>
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