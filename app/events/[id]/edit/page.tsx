'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const EVENT_CATEGORIES = ['Social', 'Networking', 'Fitness', 'Food & Drink', 'Arts & Culture', 'Music', 'Outdoors', 'Tech']

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
  const [geocoding, setGeocoding] = useState(false)

  useEffect(() => {
    params.then(({ id }) => {
      setEventId(id)
      loadEvent(id)
    })
  }, [])

  const loadEvent = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return }

    const { data } = await supabase.from('events').select('*').eq('id', id).single()
    if (!data) { router.push('/home'); return }
    if (data.host_id !== session.user.id) { router.push('/events/' + id); return }

    setTitle(data.title)
    setCategory(data.category)
    setDescription(data.description || '')
    setVenueName(data.location_name || '')
    setAddress(data.location_address || '')
    setCity(data.city || '')
    setCapacity(data.capacity ? String(data.capacity) : '')
    setTags(data.tags || [])
    setPrivacy(data.visibility || 'public')

    const start = new Date(data.start_datetime)
    const end = new Date(data.end_datetime)
    setDate(start.toISOString().slice(0, 10))
    setStartTime(start.toTimeString().slice(0, 5))
    setEndTime(end.toTimeString().slice(0, 5))

    setLoading(false)
  }

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
        await supabase.from('events').update({
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
        }).eq('id', eventId)
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

  const handleSave = async () => {
    if (!title || !category || !date || !startTime || !venueName) {
      setError('Please fill in all required fields')
      return
    }
    setSaving(true)
    setError('')

    const startDatetime = new Date(date + 'T' + startTime)
    const endDatetime = endTime ? new Date(date + 'T' + endTime) : startDatetime
    const cap = parseInt(capacity) || 0

    const { error: updateError } = await supabase.from('events').update({
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
    }).eq('id', eventId)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    router.push('/events/' + eventId)
  }

  const inputClass = 'w-full bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-3.5 text-[#F0EDE6] placeholder-white/20 outline-none focus:border-[#E8B84B]/40 text-sm'
  const labelClass = 'text-xs text-white/50 mb-1.5 block'

  if (loading) return (
    <div className="min-h-screen bg-[#0D110D] flex items-center justify-center">
      <div className="text-[#E8B84B] text-2xl font-bold">Gathr.</div>
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
          <input className={inputClass} placeholder="Street address" value={address} onChange={e => setAddress(e.target.value)} onBlur={() => geocodeAddress(address, venueName, city)} maxLength={200} />
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