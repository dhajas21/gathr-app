'use client'

interface Props {
  title: string
  body: string
  step: string
  onDismiss: () => void
  onBackdropDismiss?: () => void
  style?: React.CSSProperties
  arrowPosition?: 'bottom-center' | 'bottom-left' | 'bottom-right'
}

export default function OnboardingTooltip({
  title, body, step, onDismiss, onBackdropDismiss, style,
  arrowPosition = 'bottom-center',
}: Props) {
  const arrowLeft =
    arrowPosition === 'bottom-center' ? '50%' :
    arrowPosition === 'bottom-left'   ? '28%' : '72%'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[55]"
        onClick={onBackdropDismiss ?? onDismiss}
      />
      {/* Card */}
      <div
        className="fixed z-[56] w-[220px]"
        style={style}
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-[#1C241C] border border-[#E8B84B]/30 rounded-[14px] p-[12px_14px]"
          style={{ boxShadow: '0 12px 32px rgba(0,0,0,.5)' }}>
          <h4 className="font-display font-bold text-[12.5px] text-[#F0EDE6] mb-1 tracking-tight">{title}</h4>
          <p className="text-[11.5px] text-white/55 leading-[1.45]">{body}</p>
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/[0.06]">
            <span className="font-mono-ui text-[8.5px] tracking-[.14em] uppercase text-[#E8B84B]/50">{step}</span>
            <button onClick={onDismiss} className="text-[10.5px] font-semibold text-[#E8B84B] active:opacity-70">
              Got it →
            </button>
          </div>
        </div>
        {/* Arrow pointing down */}
        <div
          className="absolute w-[10px] h-[10px] bg-[#1C241C] border-b border-r border-[#E8B84B]/30"
          style={{
            bottom: -6,
            left: arrowLeft,
            transform: 'translateX(-50%) rotate(45deg)',
          }}
        />
      </div>
    </>
  )
}
