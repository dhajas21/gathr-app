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

export function isToday(dt: string) {
  const d = new Date(dt), now = new Date()
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

export function isTomorrow(dt: string) {
  const d = new Date(dt), tom = new Date(); tom.setDate(tom.getDate() + 1)
  return d.getDate() === tom.getDate() && d.getMonth() === tom.getMonth() && d.getFullYear() === tom.getFullYear()
}

export function formatTime(dt: string) {
  return new Date(dt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/** "Today · 3:00 PM" / "Tomorrow · 3:00 PM" / "Tue, Jan 1 · 3:00 PM" */
export function formatDate(dt: string) {
  const d = new Date(dt)
  if (isToday(dt)) return 'Today · ' + formatTime(dt)
  if (isTomorrow(dt)) return 'Tomorrow · ' + formatTime(dt)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + formatTime(dt)
}

/** "Tue, Jan 1" — date only, no time */
export function formatDateShort(dt: string) {
  return new Date(dt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

/** "Jan 1, 2026" — month/day/year, no weekday */
export function formatDateLong(dt: string) {
  return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** "Tuesday, January 1" — full weekday and month name */
export function formatDateVerbose(dt: string) {
  return new Date(dt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}
