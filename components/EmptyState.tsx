'use client'

interface EmptyStateAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

interface EmptyStateProps {
  icon: React.ReactNode
  headline: string
  body?: string
  action?: EmptyStateAction
}

export default function EmptyState({ icon, headline, body, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-14 h-14 bg-[#1C241C] border border-white/10 rounded-2xl flex items-center justify-center">
        {icon}
      </div>
      <div className="text-center px-4">
        <p className="font-editorial-italic text-base text-[#F0EDE6] mb-1">{headline}</p>
        {body && <p className="text-sm text-white/40 max-w-[240px] mx-auto">{body}</p>}
      </div>
      {action && (
        action.variant === 'secondary' ? (
          <button
            onClick={action.onClick}
            className="mt-1 bg-[#1C241C] border border-white/10 text-white/60 px-5 py-2.5 rounded-2xl font-semibold text-sm active:scale-95 transition-transform">
            {action.label}
          </button>
        ) : (
          <button
            onClick={action.onClick}
            className="mt-1 bg-[#E8B84B] text-[#0D110D] px-5 py-2.5 rounded-2xl font-semibold text-sm active:scale-95 transition-transform">
            {action.label}
          </button>
        )
      )}
    </div>
  )
}
