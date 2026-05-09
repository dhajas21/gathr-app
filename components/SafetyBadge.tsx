interface SafetyBadgeProps {
  tier: string
  reviewCount?: number
  size?: 'sm' | 'md'
}

export default function SafetyBadge({ tier, reviewCount, size = 'sm' }: SafetyBadgeProps) {
  if (!tier || tier === 'new') {
    if (!reviewCount) return null
    return (
      <span className={`inline-flex items-center gap-0.5 ${size === 'md' ? 'text-[10px] px-2 py-0.5' : 'text-[9px] px-1.5 py-0.5'} rounded-lg bg-white/5 border border-white/10 text-white/30 font-medium`}>
        🌱 New
      </span>
    )
  }

  const config = {
    verified: {
      label: 'Verified',
      icon: '✓',
      bg: 'bg-[#4A90D9]/10',
      border: 'border-[#4A90D9]/25',
      text: 'text-[#4A90D9]',
    },
    trusted: {
      label: 'Trusted',
      icon: '⭐',
      bg: 'bg-[#E8B84B]/10',
      border: 'border-[#E8B84B]/25',
      text: 'text-[#E8B84B]',
    },
    flagged: {
      label: 'Flagged',
      icon: '⚠',
      bg: 'bg-red-500/10',
      border: 'border-red-500/25',
      text: 'text-red-400',
    },
  }[tier]

  if (!config) return null

  return (
    <span className={`inline-flex items-center gap-0.5 ${size === 'md' ? 'text-[10px] px-2 py-0.5' : 'text-[9px] px-1.5 py-0.5'} rounded-lg ${config.bg} border ${config.border} ${config.text} font-semibold`}>
      {config.icon} {config.label}
    </span>
  )
}
