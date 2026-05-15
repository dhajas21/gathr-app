export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function isValidUUID(id: string): boolean { return UUID_RE.test(id) }

const ALLOWED_IMG_ORIGINS = [
  new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin,
  'https://lh3.googleusercontent.com',
]

export function safeImgSrc(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const { origin } = new URL(url)
    return ALLOWED_IMG_ORIGINS.includes(origin) ? url : null
  } catch {
    return null
  }
}

/**
 * Returns an image URL safe to render.
 *
 * If `NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM` is set to `"true"` (requires the
 * Supabase Pro plan with Image Transformations enabled), Supabase Storage
 * object URLs are rewritten to the `/render/image/` endpoint so the CDN
 * serves a resized, quality-capped JPEG/WebP. On the free tier the render
 * endpoint returns 403 ("feature not enabled"), so by default we return the
 * raw object URL untouched.
 *
 * Non-Supabase URLs (e.g. Google profile photos) are always returned as-is.
 *
 * @param width  Target width in CSS pixels — double for 2× retina (e.g. 64 for a w-8 avatar). Only honoured when transforms are enabled.
 * @param quality JPEG/WebP quality 1–100, default 80. Only honoured when transforms are enabled.
 */
const TRANSFORM_ENABLED = process.env.NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM === 'true'

export function optimizedImgSrc(
  url: string | null | undefined,
  width: number,
  quality = 80,
): string | null {
  const safe = safeImgSrc(url)
  if (!safe) return null
  if (!TRANSFORM_ENABLED) return safe
  if (!safe.includes('/storage/v1/object/public/')) return safe
  const renderUrl = safe.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
  const sep = renderUrl.includes('?') ? '&' : '?'
  return `${renderUrl}${sep}width=${width}&quality=${quality}`
}

/**
 * All formatters below accept an optional `timeZone` IANA string. When passed,
 * the value is rendered in that timezone instead of the viewer's local one.
 * For event start/end times, pass `cityToTimezone(event.city)` so a Bellingham
 * event reads as "7 PM PDT" everywhere instead of getting auto-converted to
 * the viewer's local clock.
 * Non-event timestamps (messages, notifications, "created 5m ago") should
 * NOT pass a timeZone — those should stay in viewer-local.
 */

function ymdInZone(dt: Date, timeZone?: string): [number, number, number] {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  })
  return fmt.format(dt).split('-').map(Number) as [number, number, number]
}

export function isToday(dt: string, timeZone?: string) {
  const [vy, vm, vd] = ymdInZone(new Date(dt), timeZone)
  const [ty, tm, td] = ymdInZone(new Date(), timeZone)
  return vy === ty && vm === tm && vd === td
}

export function isTomorrow(dt: string, timeZone?: string) {
  const tom = new Date(); tom.setDate(tom.getDate() + 1)
  const [vy, vm, vd] = ymdInZone(new Date(dt), timeZone)
  const [ty, tm, td] = ymdInZone(tom, timeZone)
  return vy === ty && vm === tm && vd === td
}

export function formatTime(dt: string, timeZone?: string) {
  return new Date(dt).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', timeZone,
  })
}

/**
 * Short timezone abbreviation for a date in a given zone ("PDT", "EST").
 * Append to event times so viewers in other zones know the time is anchored
 * to the event location.
 */
export function tzAbbreviation(dt: string, timeZone?: string): string {
  if (!timeZone) return ''
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone, timeZoneName: 'short',
    }).formatToParts(new Date(dt))
    return parts.find(p => p.type === 'timeZoneName')?.value ?? ''
  } catch { return '' }
}

/** "Today · 3:00 PM" / "Tomorrow · 3:00 PM" / "Tue, Jan 1 · 3:00 PM" */
export function formatDate(dt: string, timeZone?: string) {
  const d = new Date(dt)
  if (isToday(dt, timeZone)) return 'Today · ' + formatTime(dt, timeZone)
  if (isTomorrow(dt, timeZone)) return 'Tomorrow · ' + formatTime(dt, timeZone)
  return d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone,
  }) + ' · ' + formatTime(dt, timeZone)
}

/** "Tue, Jan 1" — date only, no time */
export function formatDateShort(dt: string, timeZone?: string) {
  return new Date(dt).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone,
  })
}

/** "Jan 1, 2026" — month/day/year, no weekday */
export function formatDateLong(dt: string, timeZone?: string) {
  return new Date(dt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone,
  })
}

/** "Tuesday, January 1" — full weekday and month name */
export function formatDateVerbose(dt: string, timeZone?: string) {
  return new Date(dt).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone,
  })
}

/**
 * Convert a wall-clock date+time entered in a target timezone into a UTC
 * Date object suitable for storage. Use this when the user types "7:00 PM"
 * intending the event's local time — without it, `new Date(date + 'T' + time)`
 * interprets the input in the *browser's* timezone, which is wrong if the
 * host is travelling or scheduling for a different city.
 *
 * Implementation: pretend the wall-clock is UTC, format that "fake UTC" back
 * in the target timezone, and use the difference as the offset to apply.
 */
export function fromZonedTime(dateStr: string, timeStr: string, timeZone: string): Date {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [h, mi] = timeStr.split(':').map(Number)
  const fakeUTC = Date.UTC(y, mo - 1, d, h, mi)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date(fakeUTC))
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value ?? '0')
  const rawHour = get('hour')
  const midnight = rawHour === 24
  const asTzMs = Date.UTC(
    get('year'), get('month') - 1, get('day') + (midnight ? 1 : 0),
    midnight ? 0 : rawHour, get('minute'), get('second'),
  )
  const offset = fakeUTC - asTzMs
  return new Date(fakeUTC + offset)
}
