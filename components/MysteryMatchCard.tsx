'use client'

import SafetyBadge from './SafetyBadge'
import { safeImgSrc, optimizedImgSrc } from '@/lib/utils'

interface Props {
  match: any
  eventState: 'upcoming' | 'ongoing' | 'ended'
  gathrPlus: boolean
  eventId: string
  connStatus: string | undefined
  waved: boolean
  incomingMutual: boolean
  matchConnLoading: string | null
  onHi: (id: string) => void
  onWave: (id: string) => void
  onNavigate: (path: string) => void
  onMessage?: () => void
  isPostEvent: boolean
}

export default function MysteryMatchCard({
  match, eventState, gathrPlus, eventId, connStatus,
  waved, incomingMutual, matchConnLoading, onHi, onWave, onNavigate, onMessage, isPostEvent,
}: Props) {
  const isRevealed = eventState === 'ongoing' || eventState === 'ended'

  // Progressive name reveal
  const displayName = isRevealed
    ? (eventState === 'ongoing' ? match.name?.split(' ')[0] : match.name)
    : gathrPlus
    ? (incomingMutual ? match.name?.split(' ')[0] : (match.name?.slice(0, 3) + '…'))
    : match.name?.charAt(0) + '.'

  // Progressive interest reveal
  const interests: string[] = match.shared?.length > 0 ? match.shared : (match.interests || [])
  const visibleInterests = interests.slice(0, isRevealed ? 3 : gathrPlus ? 2 : 1)
  const hiddenInterestCount = interests.length - visibleInterests.length

  return (
    <div className="flex items-center gap-3">

      {/* Avatar */}
      <button
        onClick={() => isRevealed && onNavigate('/profile/' + match.id + '?from=' + eventId)}
        className={'flex-shrink-0 ' + (isRevealed ? 'cursor-pointer' : 'cursor-default')}>
        {isRevealed ? (
          optimizedImgSrc(match.avatar_url, 96) ? (
            <img
              src={optimizedImgSrc(match.avatar_url, 96)!}
              alt=""
              className={'w-11 h-11 rounded-xl object-cover border border-white/10 ' + (eventState === 'ongoing' ? 'blur-[3px]' : '')}
            />
          ) : (
            <div className="w-11 h-11 bg-[#2A4A2A] rounded-xl flex items-center justify-center text-base border border-white/10">
              {match.name?.charAt(0) || '?'}
            </div>
          )
        ) : (
          <div className="w-11 h-11 bg-[#161E16] rounded-xl border border-white/[0.07] flex items-center justify-center relative overflow-hidden flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white/10">
              <circle cx="12" cy="8" r="4" fill="currentColor" />
              <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" fill="currentColor" />
            </svg>
            <div className="absolute inset-0 bg-gradient-to-br from-[#E8B84B]/6 to-transparent" />
            <span className="absolute bottom-0.5 right-0.5 text-[7px]">🔒</span>
          </div>
        )}
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className={'text-sm font-semibold truncate ' + (isRevealed ? 'text-[#F0EDE6]' : 'text-white/45')}>
            {displayName}
          </span>
          {eventState === 'ongoing' && (
            <span className="text-[8px] bg-[#7EC87E]/15 border border-[#7EC87E]/25 text-[#7EC87E] px-1.5 py-0.5 rounded-md font-bold tracking-wide">
              LIVE
            </span>
          )}
          {isRevealed && (
            <SafetyBadge tier={match.safety_tier || 'new'} reviewCount={match.review_count} size="sm" />
          )}
          {incomingMutual && !isRevealed && (
            <span className="text-[9px] text-[#E8B84B]/60 font-medium">mutual 👋</span>
          )}
        </div>

        {visibleInterests.length > 0 ? (
          <div className={'text-[10px] truncate ' + (isRevealed ? 'text-white/35' : 'text-white/20')}>
            {visibleInterests.join(' · ')}
            {hiddenInterestCount > 0 && !isRevealed && (
              <span className="text-white/15"> +{hiddenInterestCount}</span>
            )}
          </div>
        ) : (
          <div className="text-[10px] text-white/20">Also going to this event</div>
        )}

        <div className="text-[9px] mt-0.5">
          {eventState === 'upcoming' && !gathrPlus && (
            <span className="text-white/18">Reveal unlocks when you attend</span>
          )}
          {eventState === 'upcoming' && gathrPlus && !incomingMutual && (
            <span className="text-[#E8B84B]/35">Also going ✦</span>
          )}
          {eventState === 'ongoing' && (
            <span className="text-[#7EC87E]/50">They're here right now — find them</span>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        {!isRevealed ? (
          gathrPlus ? (
            waved ? (
              <span className="text-[10px] text-[#E8B84B]/40">Waved ✓</span>
            ) : (
              <button
                onClick={() => onWave(match.id)}
                className="bg-white/5 border border-white/10 text-white/50 text-[10px] font-semibold px-2.5 py-1.5 rounded-xl active:scale-95 transition-transform">
                👋 Wave
              </button>
            )
          ) : (
            <button
              onClick={() => onNavigate('/gathr-plus')}
              className="bg-[#E8B84B]/6 border border-[#E8B84B]/15 text-[#E8B84B]/50 text-[9px] font-semibold px-2 py-1 rounded-xl active:scale-95 transition-transform">
              Gathr+
            </button>
          )
        ) : !connStatus ? (
          <button
            onClick={() => onHi(match.id)}
            disabled={matchConnLoading === match.id}
            className="bg-[#E8B84B]/10 border border-[#E8B84B]/30 text-[#E8B84B] text-[10px] font-semibold px-3 py-1.5 rounded-xl active:scale-95 transition-transform disabled:opacity-50">
            {matchConnLoading === match.id ? '…' : '+ Hi'}
          </button>
        ) : connStatus === 'accepted' ? (
          <div className="flex flex-col items-end gap-1">
            {onMessage && (
              <button
                onClick={onMessage}
                className="bg-[#1C241C] border border-white/15 text-white/60 text-[10px] font-semibold px-3 py-1.5 rounded-xl active:scale-95 transition-transform">
                Message
              </button>
            )}
            {!onMessage && <span className="text-[10px] text-[#7EC87E]">✓ Connected</span>}
            {isPostEvent && (
              <button onClick={() => onNavigate('/events/' + eventId + '/survey')} className="text-[9px] text-[#E8B84B]/60">
                Rate →
              </button>
            )}
          </div>
        ) : (
          <span className="text-[10px] text-white/30">Sent</span>
        )}
      </div>
    </div>
  )
}
