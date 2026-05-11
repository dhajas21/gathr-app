'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { EVENT_CATEGORIES } from '@/lib/constants'
import { isValidUUID } from '@/lib/utils'

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [eventId, setEventId] = useState('')

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [venueName, setVenueName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [capacity, setCapacity] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [privacy, setPrivacy] = useState('public')
  const [ticketType, setTicketType] = useState<'free' | 'paid' | 'donation'>('free')
  const [ticketPrice, setTicketPrice] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [showCoordOverride, setShowCoordOverride] = useState(false)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const coverRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    params.then(({ id }) => {
      if (!isValidUUID(id)) { router.push('/home'); return }
      setEventId(id)
      loadEvent(id)
    })
  }, [params, router])

  const loadEvent = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }

      const { data } = await supabase.from('events').select('*').eq('id', id).single()
      if (!data) { router.push('/home'); return }
      if (data.host_id !== session.user.id) { router.push('/events/' + id); return }

      if (data.cover_url) { setCoverUrl(data.cover_url); setCoverPreview(data.cover_url) }
      setTitle(data.title)
      setCategory(data.category)
      setDescription(data.description || '')
      setVenueName(data.location_name || '')
      setAddress(data.location_address || '')
      setCity(data.city || '')
      setCapacity(data.capacity ? String(data.capacity) : '')
      setTags(data.tags || [])
      setPrivacy(data.visibility || 'public')
      setTicketType(data.ticket_type || 'free')
      setTicketPrice(data.ticket_price ? String(data.ticket_price) : '')
      setLat(data.latitude ?? null)
      setLng(data.longitude ?? null)

      const start = new Date(data.start_datetime)
      const end = new Date(data.end_datetime)
      setDate(start.toISOString().slice(0, 10))
      setStartTime(start.toTimeString().slice(0, 5))
      setEndTime(end.toTimeString().slice(0, 5))
    } finally {
      setLoading(false)
    }
  }

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) return
    setCoverFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setCoverPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags([...tags, t])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => setTags(tags.filter(t => t !== tag))

  const handleSave = async () => {
    if (!title || !category || !date || !startTime || !venueName) {
      setError('Please fill in all required fields')
      return
    }
    if (ticketType === 'paid') {
      const price = parseFloat(ticketPrice)
      if (!ticketPrice || !isFinite(price) || price <= 0 || price > 10000) {
        setError('Enter a valid ticket price (between $0.01 and $10,000)')
        return
      }
    }
    setSaving(true)
    setError('')

    let finalCoverUrl = coverUrl
    if (coverFile) {
      const ext = coverFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${eventId}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('event-covers').upload(path, coverFile, { cacheControl: '3600' })
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('event-covers').getPublicUrl(path)
        if (urlData?.publicUrl) {
          finalCoverUrl = urlData.publicUrl
          // Delete the previous cover (best-effort)
          if (coverUrl) {
            const marker = '/object/public/event-covers/'
            const idx = coverUrl.indexOf(marker)
            if (idx !== -1) {
              const oldPath = coverUrl.slice(idx + marker.length).split('?')[0]
              if (oldPath && oldPath !== path) {
                supabase.storage.from('event-covers').remove([oldPath]).then(() => {}).catch(() => {})
              }
            }
          }
        }
      }
    }

    const startDatetime = new Date(date + 'T' + startTime)
    const endDatetime = endTime ? new Date(date + 'T' + endTime) : new Date(startDatetime.getTime() + 2 * 3600000)
    if (endTime && endDatetime <= startDatetime) {
      setError('End time must be after start time')
      setSaving(false)
      return
    }
    const cap = parseInt(capacity) || 0

    const updatePayload: any = {
      title: title.trim(),
      category,
      description: description.trim(),
      start_datetime: startDatetime.toISOString(),
      end_datetime: endDatetime.toISOString(),
      location_name: venueName.trim(),
      location_address: address.trim(),
      city,
      capacity: cap,
      tags,
      visibility: privacy,
      cover_url: finalCoverUrl,
      ticket_type: ticketType,
      ticket_price: ticketType === 'paid' && ticketPrice ? parseFloat(ticketPrice) : null,
    }
    if (showCoordOverride && lat !== null && lng !== null) {
      updatePayload.latitude = lat
      updatePayload.longitude = lng
    }

    const { error: updateError } = await supabase.from('events').update(updatePayload).eq('id', eventId)

    if (updateError) {
      setError('Failed to save changes. Please try again.')
      setSaving(false)
      return
    }
    // Server-side geocoding handles lat/lng — fire-and-forget invocation
    if (!showCoordOverride) {
      supabase.functions.invoke('geocode-event', { body: { event_id: eventId } }).catch(() => {})
    }

    router.push('/events/' + eventId)
  }

  const inputClass = 'w-full bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-3.5 text-[#F0EDE6] placeholder-white/20 outline-none focus:border-[#E8B84B]/40 text-sm'
  const labelClass = 'text-xs text-white/50 mb-1.5 block'

  if (loading) return (
    <div className="min-h-screen bg-[#0D110D] pb-10">
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 border-b border-white/10">
        <div className="w-9 h-9 bg-white/[0.07] rounded-xl animate-pulse flex-shrink-0" />
        <div className="h-5 w-28 bg-white/[0.07] rounded-xl animate-pulse" />
        <div className="ml-auto h-8 w-16 bg-white/[0.07] rounded-xl animate-pulse" />
      </div>
      <div className="px-4 py-5 space-y-5">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="h-12 w-full bg-white/[0.07] rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0D110D] flex flex-col">
      <div className="flex items-center gap-3 px-5 pt-14 pb-4 border-b border-white/10 flex-shrink-0">
        <button onClick={() => router.push('/events/' + eventId)}
          className="w-9 h-9 bg-[#1C241C] border border-white/10 rounded-xl flex items-center justify-center text-[#F0EDE6] text-sm">
          ←
        </button>
        <h1 className="text-lg font-bold text-[#F0EDE6]">Edit Event</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 pb-32">
        <div>
          <label className={labelClass}>Cover Photo</label>
          <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverSelect} className="hidden" />
          <div onClick={() => coverRef.current?.click()} className="w-full h-28 bg-[#1C241C] border border-dashed border-[#E8B84B]/25 rounded-2xl overflow-hidden cursor-pointer relative">
            {coverPreview ? (
              <>
                <img src={coverPreview} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <span className="text-xs text-white/80 font-medium">Tap to change</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-1">
                <span className="text-2xl">🖼</span>
                <span className="text-xs text-white/30">Upload a cover photo</span>
                <span className="text-[10px] text-white/20">JPG, PNG — Recommended 16:9</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className={labelClass}>Title *</label>
          <input className={inputClass} placeholder="Event title" value={title} onChange={e => setTitle(e.target.value)} maxLength={120} />
        </div>

        <div>
          <label className={labelClass}>Category *</label>
          <select className={inputClass} value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">Select a category</option>
            {EVENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea className={inputClass} rows={3} placeholder="Tell people what to expect..." value={description} onChange={e => setDescription(e.target.value)} maxLength={1000} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Date *</label>
            <input type="date" className={inputClass} value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Start Time *</label>
            <input type="time" className={inputClass} value={startTime} onChange={e => setStartTime(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelClass}>End Time</label>
          <input type="time" className={inputClass} value={endTime} onChange={e => setEndTime(e.target.value)} />
        </div>

        <div>
          <label className={labelClass}>Venue Name *</label>
          <input className={inputClass} placeholder="Venue name" value={venueName} onChange={e => setVenueName(e.target.value)} maxLength={100} />
        </div>

        <div>
          <label className={labelClass}>Address</label>
          <input className={inputClass} placeholder="Street address" value={address} onChange={e => setAddress(e.target.value)} maxLength={200} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>City</label>
            <input className={inputClass} placeholder="City" value={city} onChange={e => setCity(e.target.value)} maxLength={80} />
          </div>
          <div>
            <label className={labelClass}>Capacity</label>
            <input type="number" className={inputClass} placeholder="50" value={capacity} onChange={e => setCapacity(e.target.value)} min={0} max={10000} />
          </div>
        </div>

        <div>
          <label className={labelClass}># Tags</label>
          <div className="flex gap-2">
            <input className={inputClass} placeholder="Add a tag..." value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} />
            <button onClick={addTag} className="bg-[#1E3A1E] border border-[#E8B84B]/20 text-[#E8B84B] px-4 rounded-2xl text-sm font-medium whitespace-nowrap">Add</button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {tags.map(tag => (
                <span key={tag} onClick={() => removeTag(tag)} className="bg-[#2A4A2A]/40 text-[#7EC87E] text-xs px-3 py-1.5 rounded-lg border border-[#7EC87E]/10 cursor-pointer">
                  #{tag} ✕
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className={labelClass}>Privacy</label>
          <div className="space-y-2">
            {[
              { value: 'public', label: 'Public', desc: 'Anyone can find and join' },
              { value: 'unlisted', label: 'Unlisted', desc: 'Only people with the link' },
              { value: 'private', label: 'Private', desc: 'Invite only' },
            ].map(opt => (
              <div key={opt.value} onClick={() => setPrivacy(opt.value)} className={'flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ' + (privacy === opt.value ? 'border-[#E8B84B]/40 bg-[#E8B84B]/5' : 'border-white/10 bg-[#1C241C]')}>
                <div className={'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ' + (privacy === opt.value ? 'border-[#E8B84B]' : 'border-white/20')}>
                  {privacy === opt.value && <div className="w-2 h-2 rounded-full bg-[#E8B84B]" />}
                </div>
                <div>
                  <div className="text-sm font-medium text-[#F0EDE6]">{opt.label}</div>
                  <div className="text-xs text-white/40">{opt.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>Tickets</label>
          <div className="space-y-2">
            {[
              { value: 'free', label: 'Free', desc: 'No cost to attend' },
              { value: 'paid', label: 'Paid', desc: 'Set a price per ticket' },
              { value: 'donation', label: 'Donation', desc: 'Pay what you want' },
            ].map(opt => (
              <div key={opt.value} onClick={() => setTicketType(opt.value as 'free' | 'paid' | 'donation')}
                className={'flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ' + (ticketType === opt.value ? 'border-[#E8B84B]/40 bg-[#E8B84B]/5' : 'border-white/10 bg-[#1C241C]')}>
                <div className={'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ' + (ticketType === opt.value ? 'border-[#E8B84B]' : 'border-white/20')}>
                  {ticketType === opt.value && <div className="w-2 h-2 rounded-full bg-[#E8B84B]" />}
                </div>
                <div>
                  <div className="text-sm font-medium text-[#F0EDE6]">{opt.label}</div>
                  <div className="text-xs text-white/40">{opt.desc}</div>
                </div>
              </div>
            ))}
          </div>
          {ticketType === 'paid' && (
            <div className="mt-3 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
              <input type="number" className={inputClass + ' pl-8'} placeholder="0.00" value={ticketPrice} onChange={e => setTicketPrice(e.target.value)} min={0} step={0.01} />
            </div>
          )}
        </div>

        <div>
          <button onClick={() => setShowCoordOverride(v => !v)}
            className="w-full text-left flex items-center justify-between bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-3">
            <div>
              <div className="text-sm text-[#F0EDE6]">Advanced: Override map coordinates</div>
              <div className="text-[10px] text-white/35 mt-0.5">{lat !== null && lng !== null ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'Auto-detected from address'}</div>
            </div>
            <span className="text-white/30 text-sm">{showCoordOverride ? '↑' : '›'}</span>
          </button>
          {showCoordOverride && (
            <div className="mt-3 space-y-2">
              <p className="text-[10px] text-white/35">Use these if auto-geocoding gets the wrong location. Decimal degrees only.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Latitude</label>
                  <input type="number" className={inputClass} placeholder="48.7519" value={lat ?? ''}
                    onChange={e => setLat(e.target.value === '' ? null : parseFloat(e.target.value))} step="any" />
                </div>
                <div>
                  <label className={labelClass}>Longitude</label>
                  <input type="number" className={inputClass} placeholder="-122.4787" value={lng ?? ''}
                    onChange={e => setLng(e.target.value === '' ? null : parseFloat(e.target.value))} step="any" />
                </div>
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-[#E85B5B] text-xs bg-[#E85B5B]/10 border border-[#E85B5B]/20 rounded-2xl px-4 py-3">{error}</p>}
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-5 pb-10 pt-4 bg-gradient-to-t from-[#0D110D] to-transparent">
        <button onClick={handleSave} disabled={saving}
          className="w-full bg-[#E8B84B] text-[#0D110D] rounded-2xl py-4 font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform"
          style={{boxShadow: '0 5px 22px rgba(232,184,75,0.3)'}}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}