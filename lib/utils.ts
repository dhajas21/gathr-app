const ALLOWED_IMG_ORIGINS = [
  'https://adhahiqpiqwlvkykhbtf.supabase.co',
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

export function formatDate(dt: string) {
  const d = new Date(dt)
  if (isToday(dt)) return 'Today · ' + formatTime(dt)
  if (isTomorrow(dt)) return 'Tomorrow · ' + formatTime(dt)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + formatTime(dt)
}
