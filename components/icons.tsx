// Shared SVG icon components — Gathr standard: strokeWidth 1.75, round linecap/join.
// Usage: <MapPinIcon size={16} className="text-white/40" />

interface IconProps {
  size?: number
  className?: string
  strokeWidth?: number
}

function Svg({ size, className, strokeWidth = 1.75, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      {children}
    </svg>
  )
}

export function MapPinIcon({ size = 16, className = '', strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg size={size} className={className} strokeWidth={strokeWidth}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </Svg>
  )
}

export function CalendarIcon({ size = 16, className = '', strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg size={size} className={className} strokeWidth={strokeWidth}>
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </Svg>
  )
}

export function SearchIcon({ size = 16, className = '', strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg size={size} className={className} strokeWidth={strokeWidth}>
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </Svg>
  )
}

export function BookmarkIcon({ size = 16, className = '', strokeWidth = 1.75, filled = false }:
  IconProps & { filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'} stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

export function BellIcon({ size = 16, className = '', strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg size={size} className={className} strokeWidth={strokeWidth}>
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 01-3.46 0"/>
    </Svg>
  )
}

export function UserIcon({ size = 16, className = '', strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg size={size} className={className} strokeWidth={strokeWidth}>
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6"/>
    </Svg>
  )
}

export function PeopleIcon({ size = 16, className = '', strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg size={size} className={className} strokeWidth={strokeWidth}>
      <circle cx="7.5" cy="6.5" r="3.5"/>
      <path d="M1 21v-1c0-3.3 2.9-5.5 6.5-5.5"/>
      <circle cx="16.5" cy="6.5" r="3.5"/>
      <path d="M23 21v-1c0-3.3-2.9-5.5-6.5-5.5"/>
      <path d="M12 21v-2.5"/>
      <path d="M9.5 18.5h5"/>
    </Svg>
  )
}

export function InfoCircleIcon({ size = 16, className = '', strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg size={size} className={className} strokeWidth={strokeWidth}>
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 8v4M12 16h.01"/>
    </Svg>
  )
}

export function ChevronDownIcon({ size = 16, className = '', strokeWidth = 2.5 }: IconProps) {
  return (
    <Svg size={size} className={className} strokeWidth={strokeWidth}>
      <polyline points="6 9 12 15 18 9"/>
    </Svg>
  )
}

export function XIcon({ size = 16, className = '', strokeWidth = 2.5 }: IconProps) {
  return (
    <Svg size={size} className={className} strokeWidth={strokeWidth}>
      <path d="M18 6 6 18M6 6l12 12"/>
    </Svg>
  )
}
