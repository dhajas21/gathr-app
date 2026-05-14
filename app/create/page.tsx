'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CITY_NAMES, getCityCoords, EVENT_CATEGORIES, cityToTimezone } from '@/lib/constants'
import { isValidUUID, fromZonedTime } from '@/lib/utils'
import { track } from '@/components/AnalyticsProvider'
import ImageCropModal from '@/components/ImageCropModal'

function formatDraftAge(d: Date) {
  const diff = Date.now() - d.getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago'
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago'
  return Math.floor(diff / 86400000) + 'd ago'
}

export default function CreateEventPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form fields
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [venueName, setVenueName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('Bellingham')
  const [capacity, setCapacity] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [privacy, setPrivacy] = useState('public')
  const [ticketType, setTicketType] = useState('free')
  const [ticketPrice, setTicketPrice] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cropMime, setCropMime] = useState('image/jpeg')
  const coverRef = useRef<HTMLInputElement>(null)
  const draftToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const venueDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [venueResults, setVenueResults] = useState<Array<{ display_name: string; address_line: string; lat: string; lon: string }>>([])
  const [showVenueDropdown, setShowVenueDropdown] = useState(false)

  // Community context (when navigated from a community page)
  const [fromCommunityId, setFromCommunityId] = useState<string | null>(null)

  // Draft state
  const [userId, setUserId] = useState<string | null>(null)
  const [pendingDraft, setPendingDraft] = useState<any>(null)
  const [showDraftModal, setShowDraftModal] = useState(false)
  const [draftSaving, setDraftSaving] = useState(false)
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null)
  const [draftToast, setDraftToast] = useState(false)
  const [isFromDraft, setIsFromDraft] = useState(false)

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('community')
    if (param && isValidUUID(param)) setFromCommunityId(param)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUserId(session.user.id)
      checkForDraft(session.user.id)
    })
  }, [router])

  const checkForDraft = async (uid: string) => {
    const { data } = await supabase
      .from('event_drafts')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle()
    if (data && (data.title || data.category || data.venue_name)) {
      setPendingDraft(data)
      setShowDraftModal(true)
    }
  }

  const applyDraft = (draft: any) => {
    setTitle(draft.title || '')
    setCategory(draft.category || '')
    setDescription(draft.description || '')
    setDate(draft.date || '')
    setStartTime(draft.start_time || '')
    setEndTime(draft.end_time || '')
    setVenueName(draft.venue_name || '')
    setAddress(draft.address || '')
    setCity(draft.city || 'Bellingham')
    setCapacity(draft.capacity || '')
    setTags(draft.tags || [])
    setPrivacy(draft.privacy || 'public')
    setTicketType(draft.ticket_type || 'free')
    setTicketPrice(draft.ticket_price ? String(draft.ticket_price) : '')
    if (draft.cover_url) setCoverPreview(draft.cover_url)
    if (draft.lat) setLat(draft.lat)
    if (draft.lng) setLng(draft.lng)
    setDraftSavedAt(new Date(draft.updated_at))
    setIsFromDraft(true)
    setShowDraftModal(false)
    setPendingDraft(null)
  }

  const discardDraft = async (uid: string) => {
    await supabase.from('event_drafts').delete().eq('user_id', uid)
    setPendingDraft(null)
    setShowDraftModal(false)
  }

  const saveDraft = useCallback(async (silent = false) => {
    if (!userId) return
    if (!silent) setDraftSaving(true)

    // If a new cover file is selected, upload it to draft path
    let coverUrl: string | null = coverFile ? null : coverPreview
    if (coverFile) {
      const ext = coverFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      const { error: upErr } = await supabase.storage
        .from('event-covers')
        .upload(`drafts/${userId}/cover.${ext}`, coverFile, { upsert: true })
      if (!upErr) {
        const { data: urlData } = supabase.storage
          .from('event-covers')
          .getPublicUrl(`drafts/${userId}/cover.${ext}`)
        coverUrl = urlData?.publicUrl ?? null
        if (coverUrl) {
          setCoverPreview(coverUrl)
          setCoverFile(null) // prevent re-upload on subsequent auto-saves
        }
      }
    }

    await supabase.from('event_drafts').upsert({
      user_id: userId,
      title, category, description, date,
      start_time: startTime, end_time: endTime,
      venue_name: venueName, address, city, capacity,
      tags, privacy, ticket_type: ticketType,
      ticket_price: ticketType === 'paid' && ticketPrice ? parseFloat(ticketPrice) : null,
      cover_url: coverUrl, lat, lng,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    setDraftSavedAt(new Date())

    if (!silent) {
      setDraftSaving(false)
      setDraftToast(true)
      if (draftToastTimerRef.current) clearTimeout(draftToastTimerRef.current)
      draftToastTimerRef.current = setTimeout(() => setDraftToast(false), 2500)
    }
  }, [userId, title, category, description, date, startTime, endTime, venueName, address, city, capacity, tags, privacy, ticketType, ticketPrice, coverFile, coverPreview, lat, lng])

  // Auto-save every 30s when there's content
  useEffect(() => {
    if (!userId || !title) return
    const interval = setInterval(() => saveDraft(true), 30000)
    return () => {
      clearInterval(interval)
      if (draftToastTimerRef.current) clearTimeout(draftToastTimerRef.current)
    }
  }, [userId, title, saveDraft])

  // Venue name → Nominatim autocomplete (500ms debounce)
  useEffect(() => {
    if (venueDebounceRef.current) clearTimeout(venueDebounceRef.current)
    const q = venueName.trim()
    if (q.length < 3) { setVenueResults([]); setShowVenueDropdown(false); return }
    venueDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/geocode?' + new URLSearchParams({ q }))
        if (!res.ok) return
        const { results } = await res.json()
        setVenueResults(results ?? [])
        setShowVenueDropdown((results ?? []).length > 0)
      } catch {}
    }, 500)
    return () => { if (venueDebounceRef.current) clearTimeout(venueDebounceRef.current) }
  }, [venueName])

  const deleteDraft = async () => {
    if (!userId) return
    await supabase.from('event_drafts').delete().eq('user_id', userId)
    const { data: files } = await supabase.storage.from('event-covers').list(`drafts/${userId}`)
    if (files && files.length > 0) {
      await supabase.storage.from('event-covers').remove(files.map(f => `drafts/${userId}/${f.name}`))
    }
  }

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Only JPG, PNG, and WebP images are allowed'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Cover photo must be under 5 MB'); return }
    setCropMime(file.type)
    const reader = new FileReader()
    reader.onload = (ev) => setCropSrc(ev.target?.result as string)
    reader.readAsDataURL(file)
    if (coverRef.current) coverRef.current.value = ''
  }

  const handleCropConfirm = (blob: Blob, previewUrl: string) => {
    setCropSrc(null)
    setCoverPreview(previewUrl)
    setCoverFile(new File([blob], `cover.${cropMime.split('/')[1]}`, { type: cropMime }))
  }

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && t.length <= 30 && !tags.includes(t) && tags.length < 10) { setTags([...tags, t]); setTagInput('') }
  }

  const removeTag = (tag: string) => setTags(tags.filter(t => t !== tag))

  const handleCreate = async () => {
    setLoading(true)
    setError('')
    try {

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return }

    // Interpret the host's input in the EVENT's timezone, not the browser's.
    // A host in NYC scheduling a Bellingham event at "7 PM" means 7 PM Pacific.
    const eventTz = cityToTimezone(city)
    const startDatetime = fromZonedTime(date, startTime, eventTz)
    const endDatetime = endTime
      ? fromZonedTime(date, endTime, eventTz)
      : new Date(startDatetime.getTime() + 3600000)

    if (startDatetime < new Date()) {
      setError('Start time must be in the future')
      return
    }
    if (endDatetime <= startDatetime) {
      setError('End time must be after start time')
      return
    }

    if (ticketType === 'paid') {
      const price = parseFloat(ticketPrice)
      if (!ticketPrice || !isFinite(price) || price <= 0 || price > 10000) {
        setError('Enter a valid ticket price (between $0.01 and $10,000)')
        return
      }
    }

    // Upload final cover (might already be a URL from draft)
    let coverUrl: string | null = coverFile ? null : coverPreview
    if (coverFile) {
      const ext = coverFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = session.user.id + '/' + Date.now() + '.' + ext
      const { error: uploadErr } = await supabase.storage.from('event-covers').upload(path, coverFile, { upsert: true })
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('event-covers').getPublicUrl(path)
        coverUrl = urlData?.publicUrl ?? null
      }
    }

    const { data: insertedEvent, error: insertError } = await supabase.from('events').insert({
      title: title.trim(),
      category,
      description: description.trim(),
      start_datetime: startDatetime.toISOString(),
      end_datetime: endDatetime.toISOString(),
      location_name: venueName.trim(),
      location_address: address.trim(),
      city,
      capacity: Math.min(10000, Math.max(0, parseInt(capacity) || 0)),
      spots_left: Math.min(10000, Math.max(0, parseInt(capacity) || 0)),
      tags,
      visibility: privacy,
      host_id: session.user.id,
      latitude: lat ?? getCityCoords(city).lat,
      longitude: lng ?? getCityCoords(city).lng,
      cover_url: coverUrl,
      ticket_type: ticketType,
      ticket_price: ticketType === 'paid' && ticketPrice ? parseFloat(ticketPrice) : null,
      invite_code: crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase(),
      ...(fromCommunityId ? { community_id: fromCommunityId } : {}),
    }).select('id').single()

    if (insertError) {
      setError(insertError.message)
      return
    }

    track('event_created', {
      event_id: insertedEvent?.id,
      category,
      city,
      ticket_type: ticketType,
      visibility: privacy,
      from_community: !!fromCommunityId,
    })

    // Fire-and-forget server-side geocoding for the new event (saves lat/lng to DB)
    if (insertedEvent?.id) {
      supabase.functions.invoke('geocode-event', { body: { event_id: insertedEvent.id } }).catch(() => {})
    }

    // Clean up the draft now that we've published
    await deleteDraft()
    if (fromCommunityId) {
      router.push('/communities/' + fromCommunityId + '?tab=events')
    } else {
      router.push('/events/' + insertedEvent!.id)
    }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const draftProgress = () => {
    if (!pendingDraft) return 0
    const fields = [pendingDraft.title, pendingDraft.category, pendingDraft.date, pendingDraft.start_time, pendingDraft.venue_name, pendingDraft.description]
    return Math.round((fields.filter(Boolean).length / fields.length) * 100)
  }

  const inputClass = 'w-full bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-3.5 text-[#F0EDE6] placeholder-white/20 outline-none focus:border-[#E8B84B]/40 text-sm'
  const labelClass = 'text-xs text-white/50 mb-1.5 block'

  return (
    <div className="min-h-screen bg-[#0D110D] flex flex-col">

      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          mimeType={cropMime}
          aspect={16 / 9}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-14 pb-4 border-b border-white/10">
        <button
          onClick={() => (step === 1 ? router.back() : setStep(1))}
          className="w-9 h-9 bg-[#1C241C] border border-white/10 rounded-xl flex items-center justify-center text-[#F0EDE6] text-sm active:scale-95 transition-transform"
        >
          ←
        </button>
        <div className="flex items-center gap-2 flex-1">
          <h1 className="font-display text-lg font-bold text-[#F0EDE6]">
            {step === 1 ? 'The Basics' : 'The Details'}
          </h1>
          {isFromDraft && (
            <span className="text-[9px] bg-[#E8B84B]/10 border border-[#E8B84B]/20 text-[#E8B84B] px-2 py-0.5 rounded-full font-medium">Draft</span>
          )}
        </div>
        <button
          onClick={() => saveDraft(false)}
          disabled={draftSaving || !userId}
          className={'text-xs font-medium transition-all ' + (
            draftToast ? 'text-[#7EC87E]' : 'text-white/40 active:text-[#E8B84B]'
          )}
        >
          {draftSaving ? 'Saving…' : draftToast ? 'Saved ✓' : 'Save draft'}
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-5 pt-4">
        <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-[#E8B84B] rounded-full transition-all duration-300"
            style={{ width: step === 1 ? '50%' : '100%' }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-white/40">
          <span className={step === 1 ? 'text-[#E8B84B]' : ''}>Step 1 — Basics</span>
          <span className={step === 2 ? 'text-[#E8B84B]' : ''}>Step 2 — Details</span>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 pb-32">
        {step === 1 ? (
          <>
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
                <div className="flex flex-col items-center justify-center h-full gap-1.5">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(232,184,75,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span className="text-xs text-white/40">Upload a cover photo</span>
                  <span className="text-[10px] text-white/20">JPG, PNG — Recommended 16:9</span>
                </div>
              )}
            </div>

            <div>
              <label className={labelClass}>Title *</label>
              <input className={inputClass} placeholder="e.g. Morning Run at Boulevard Park" value={title} onChange={e => setTitle(e.target.value)} maxLength={120} />
            </div>

            <div>
              <label className={labelClass}>Category *</label>
              <select className={inputClass} value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">Select a category</option>
                {EVENT_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
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
              <p className="text-[10px] text-white/40 mt-1.5">
                Times are anchored to <span className="text-white/55">{city}</span> — attendees in other timezones see this exact time with the local abbreviation.
              </p>
            </div>

            <div className="relative">
              <label className={labelClass}>Venue Name *</label>
              <input
                className={inputClass}
                placeholder="Boulevard Park"
                value={venueName}
                onChange={e => { setVenueName(e.target.value); setShowVenueDropdown(false) }}
                onFocus={() => { if (venueResults.length > 0) setShowVenueDropdown(true) }}
                maxLength={100}
                autoComplete="off"
              />
              {showVenueDropdown && venueResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-[#1C241C] border border-white/15 rounded-2xl overflow-hidden shadow-2xl">
                  {venueResults.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      className="w-full text-left px-4 py-3 border-b border-white/[0.06] last:border-0 active:bg-white/[0.06] transition-colors"
                      onMouseDown={e => {
                        e.preventDefault()
                        setVenueName(r.display_name)
                        setAddress(r.address_line)
                        setLat(parseFloat(r.lat))
                        setLng(parseFloat(r.lon))
                        setVenueResults([])
                        setShowVenueDropdown(false)
                      }}>
                      <div className="text-sm text-[#F0EDE6] font-medium truncate">{r.display_name}</div>
                      <div className="text-[10px] text-white/35 mt-0.5 truncate">{r.address_line}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className={labelClass}>Address</label>
              <input className={inputClass} placeholder="470 Bayview Dr, Bellingham WA" value={address} onChange={e => setAddress(e.target.value)} maxLength={200} />
              {address && (
                <p className="text-[10px] text-white/40 mt-1.5">We'll pin this on the map after you publish</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>City</label>
                <select className={inputClass} value={city} onChange={e => setCity(e.target.value)}>
                  {CITY_NAMES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Capacity</label>
                <input type="number" className={inputClass} placeholder="50" value={capacity} onChange={e => setCapacity(e.target.value)} min={0} max={10000} />
              </div>
            </div>

            {error && <p className="text-[#E85B5B] text-xs">{error}</p>}
          </>
        ) : (
          <>
            <div>
              <label className={labelClass}># Interest Tags</label>
              <div className="flex gap-2">
                <input className={inputClass} placeholder="running, coffee, startups..." value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} />
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
                  <div key={opt.value} onClick={() => setTicketType(opt.value)} className={'flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ' + (ticketType === opt.value ? 'border-[#E8B84B]/40 bg-[#E8B84B]/5' : 'border-white/10 bg-[#1C241C]')}>
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

            {error && <p className="text-[#E85B5B] text-xs">{error}</p>}
          </>
        )}
      </div>

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-10 pt-4 bg-gradient-to-t from-[#0D110D] to-transparent">
        {draftSavedAt && !draftToast && (
          <p className="text-center text-[10px] text-white/20 mb-2">Auto-saved {formatDraftAge(draftSavedAt)}</p>
        )}
        {step === 1 ? (
          <button
            onClick={() => setStep(2)}
            disabled={!title || !category || !date || !startTime || !venueName}
            className="w-full bg-[#E8B84B] text-[#0D110D] rounded-2xl py-4 font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform"
          >
            Next — The Details →
          </button>
        ) : (
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 bg-[#1C241C] border border-white/10 text-[#F0EDE6] rounded-2xl py-4 font-medium text-sm">
              ← Back
            </button>
            <button onClick={handleCreate} disabled={loading} className="flex-[2] bg-[#E8B84B] text-[#0D110D] rounded-2xl py-4 font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2"/>
                    <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Creating…
                </span>
              ) : 'Create Event'}
            </button>
          </div>
        )}
      </div>

      {/* Resume draft bottom sheet */}
      {showDraftModal && pendingDraft && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center" onClick={() => setShowDraftModal(false)}>
          <div className="w-full max-w-md bg-[#1C241C] rounded-t-3xl p-5 pb-10" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />

            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-[#E8B84B]/10 border border-[#E8B84B]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(232,184,75,0.65)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-[#F0EDE6] truncate">
                  {pendingDraft.title || 'Untitled event'}
                </div>
                <div className="text-xs text-white/40 mt-0.5">
                  Draft · saved {formatDraftAge(new Date(pendingDraft.updated_at))}
                </div>
              </div>
            </div>

            {/* Completion bar */}
            <div className="mb-5">
              <div className="flex justify-between text-[10px] text-white/40 mb-1.5">
                <span>Draft completion</span>
                <span>{draftProgress()}%</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#E8B84B] rounded-full transition-all" style={{ width: draftProgress() + '%' }} />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {[
                  { label: 'Title', done: !!pendingDraft.title },
                  { label: 'Category', done: !!pendingDraft.category },
                  { label: 'Date', done: !!pendingDraft.date },
                  { label: 'Time', done: !!pendingDraft.start_time },
                  { label: 'Venue', done: !!pendingDraft.venue_name },
                  { label: 'Description', done: !!pendingDraft.description },
                ].map(f => (
                  <span key={f.label} className={'text-[9px] px-2 py-0.5 rounded border ' + (f.done ? 'text-[#7EC87E] border-[#7EC87E]/20 bg-[#7EC87E]/5' : 'text-white/20 border-white/10')}>
                    {f.done ? '✓ ' : ''}{f.label}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => applyDraft(pendingDraft)}
              className="w-full py-3.5 rounded-2xl bg-[#E8B84B] text-[#0D110D] font-bold text-sm mb-3 active:scale-[0.98] transition-transform"
            >
              Continue Draft
            </button>
            <button
              onClick={() => setShowDraftModal(false)}
              className="w-full py-3.5 rounded-2xl bg-[#0D110D] border border-white/10 text-white/50 text-sm active:scale-[0.98] transition-transform"
            >
              Start Fresh (keep draft)
            </button>
            <button
              onClick={() => userId && discardDraft(userId)}
              className="w-full mt-2 py-2 text-[11px] text-white/25 active:text-red-400 transition-colors"
            >
              Delete this draft
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
