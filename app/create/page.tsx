'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CITY_NAMES, getCityCoords, EVENT_CATEGORIES } from '@/lib/constants'

export default function CreateEventPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
  const [geocoding, setGeocoding] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [privacy, setPrivacy] = useState('public')

  const geocodeAddress = async (addr: string, venue: string, c: string) => {
    const query = [addr || venue, c].filter(Boolean).join(', ')
    if (!query) return
    setGeocoding(true)
    try {
      const res = await fetch(
        'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(query),
        { headers: { 'User-Agent': 'GathrApp/1.0' } }
      )
      const data = await res.json()
      if (data[0]) {
        setLat(parseFloat(data[0].lat))
        setLng(parseFloat(data[0].lon))
      }
    } catch {}
    setGeocoding(false)
  }

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags([...tags, t])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => setTags(tags.filter(t => t !== tag))

  const handleCreate = async () => {
    setLoading(true)
    setError('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return }

    const startDatetime = new Date(date + 'T' + startTime)
    const endDatetime = endTime ? new Date(date + 'T' + endTime) : new Date(date + 'T' + startTime)

    const { error: insertError } = await supabase.from('events').insert({
      title: title.trim(),
      category,
      description: description.trim(),
      start_datetime: startDatetime.toISOString(),
      end_datetime: endDatetime.toISOString(),
      location_name: venueName.trim(),
      location_address: address.trim(),
      city,
      capacity: parseInt(capacity) || 0,
      spots_left: parseInt(capacity) || 0,
      tags,
      visibility: privacy,
      host_id: session.user.id,
      latitude: lat ?? getCityCoords(city).lat,
      longitude: lng ?? getCityCoords(city).lng,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    router.push('/home')
  }

  const inputClass = 'w-full bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-3.5 text-[#F0EDE6] placeholder-white/20 outline-none focus:border-[#E8B84B]/40 text-sm'
  const labelClass = 'text-xs text-white/50 mb-1.5 block'

  return (
    <div className="min-h-screen bg-[#0D110D] flex flex-col">
      <div className="flex items-center gap-3 px-5 pt-14 pb-4 border-b border-white/10">
        <button
          onClick={() => (step === 1 ? router.push('/home') : setStep(1))}
          className="w-9 h-9 bg-[#1C241C] border border-white/10 rounded-xl flex items-center justify-center text-[#F0EDE6] text-sm"
        >
          ←
        </button>
        <h1 className="text-lg font-bold text-[#F0EDE6]">
          {step === 1 ? 'The Basics' : 'The Details'}
        </h1>
        <span className="ml-auto text-xs text-white/30">Save draft</span>
      </div>

      <div className="px-5 pt-4">
        <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-[#E8B84B] rounded-full transition-all duration-300"
            style={{ width: step === 1 ? '50%' : '100%' }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-white/30">
          <span className={step === 1 ? 'text-[#E8B84B]' : ''}>Step 1 — Basics</span>
          <span className={step === 2 ? 'text-[#E8B84B]' : ''}>Step 2 — Details</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 pb-32">
        {step === 1 ? (
          <>
            <div className="w-full h-28 bg-[#1C241C] border border-dashed border-[#E8B84B]/25 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer">
              <span className="text-2xl">🖼</span>
              <span className="text-xs text-white/30">Upload a cover photo</span>
              <span className="text-[10px] text-white/20">JPG, PNG — Recommended 16:9</span>
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
            </div>

            <div>
              <label className={labelClass}>Venue Name *</label>
              <input className={inputClass} placeholder="Boulevard Park" value={venueName} onChange={e => setVenueName(e.target.value)} maxLength={100} />
            </div>

            <div>
              <label className={labelClass}>Address</label>
              <input className={inputClass} placeholder="470 Bayview Dr, Bellingham WA" value={address} onChange={e => setAddress(e.target.value)} onBlur={() => geocodeAddress(address, venueName, city)} maxLength={200} />
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

            {error && <p className="text-[#E85B5B] text-xs">{error}</p>}
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-5 pb-10 pt-4 bg-gradient-to-t from-[#0D110D] to-transparent">
        {step === 1 ? (
          <button
            onClick={() => setStep(2)}
            disabled={!title || !category || !date || !startTime || !venueName}
            className="w-full bg-[#E8B84B] text-[#0D110D] rounded-2xl py-4 font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform"
          >
            {geocoding ? 'Looking up location...' : 'Next — The Details →'}
          </button>
        ) : (
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 bg-[#1C241C] border border-white/10 text-[#F0EDE6] rounded-2xl py-4 font-medium text-sm">
              ← Back
            </button>
            <button onClick={handleCreate} disabled={loading} className="flex-[2] bg-[#E8B84B] text-[#0D110D] rounded-2xl py-4 font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform">
              {loading ? 'Creating...' : 'Create Event 🎉'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}