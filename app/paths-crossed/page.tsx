'use client'

// Paths Crossed — Gathr+ exclusive view showing everyone the user has
// co-attended events with, sorted by recency. Data comes from the
// get_paths_crossed() SECURITY DEFINER RPC which gates identity at the
// query layer; this page only ever receives data for authorized callers.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { SkeletonBlock } from '@/components/Skeleton'
import SafetyBadge from '@/components/SafetyBadge'
import FadeIn from '@/components/FadeIn'
import BottomNav from '@/components/BottomNav'
import { optimizedImgSrc } from '@/lib/utils'

function PathsCardSkeleton() {
  return (
    <div className="bg-[#1C241C] border border-white/[0.06] rounded-2xl p-3.5 space-y-2.5">
      <div className="flex items-center gap-3">
        <SkeletonBlock className="w-11 h-11 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <SkeletonBlock className="h-3.5 w-24" />
          <SkeletonBlock className="h-2.5 w-36" />
        </div>
        <div className="flex flex-col gap-1.5">
          <SkeletonBlock className="h-7 w-14 rounded-xl" />
          <SkeletonBlock className="h-7 w-14 rounded-xl" />
        </div>
      </div>
      <SkeletonBlock className="h-2.5 w-full rounded-lg" />
    </div>
  )
}

export default function PathsCrossedPage() {
  const [user, setUser]                 = useState<any>(null)
  const [isGathrPlus, setIsGathrPlus]   = useState(false)
  const [loading, setLoading]           = useState(true)
  const [items, setItems]               = useState<any[]>([])
  const [cursor, setCursor]             = useState<string | null>(null)
  const [hasMore, setHasMore]           = useState(false)
  const [loadingMore, setLoadingMore]   = useState(false)
  const [error, setError]               = useState('')
  const [expandedId, setExpandedId]     = useState<string | null>(null)
  const [wavedIds, setWavedIds]         = useState<Set<string>>(new Set())
  const [connStatuses, setConnStatuses] = useState<Record<string, string>>({})
  const [connLoading, setConnLoading]   = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUser(session.user)

      supabase
        .from('profiles')
        .select('gathr_plus, gathr_plus_expires_at')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          const isPlus =
            data?.gathr_plus === true ||
            (data?.gathr_plus_expires_at && new Date(data.gathr_plus_expires_at) > new Date())
          setIsGathrPlus(!!isPlus)
          if (isPlus) {
            fetchPage(session.user.id, null)
          } else {
            setLoading(false)
          }
        })
    })
  }, [router])

  const fetchPage = async (userId: string, pageCursor: string | null) => {
    try {
      const { data, error: rpcErr } = await supabase.rpc('get_paths_crossed', {
        p_user_id: userId,
        p_cursor: pageCursor ?? undefined,
        p_limit: 30,
      })
      if (rpcErr) throw rpcErr
      const rows: any[] = data || []
      setItems(prev => pageCursor ? [...prev, ...rows] : rows)
      setHasMore(rows.length === 30)
      if (rows.length > 0) setCursor(rows[rows.length - 1].most_recent_event_date)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const handleLoadMore = () => {
    if (!user || !cursor || loadingMore) return
    setLoadingMore(true)
    fetchPage(user.id, cursor)
  }

  const handleRetry = () => {
    if (!user) return
    setError('')
    setLoading(true)
    fetchPage(user.id, null)
  }

  const handleWave = async (otherId: string, eventId: string) => {
    if (!user || wavedIds.has(otherId) || !eventId) return
    setWavedIds(prev => new Set([...prev, otherId]))
    const { error: waveErr } = await supabase.from('waves').insert({
      sender_id: user.id,
      receiver_id: otherId,
      event_id: eventId,
    })
    // 23505 = duplicate — wave already exists, optimistic state is correct
    if (waveErr && waveErr.code !== '23505') {
      setWavedIds(prev => { const next = new Set(prev); next.delete(otherId); return next })
    }
  }

  const handleConnect = async (otherId: string) => {
    if (!user || connLoading || connStatuses[otherId]) return
    setConnLoading(otherId)
    const { error: connErr } = await supabase.from('connections').insert({
      requester_id: user.id,
      addressee_id: otherId,
    })
    if (!connErr) setConnStatuses(prev => ({ ...prev, [otherId]: 'pending' }))
    setConnLoading(null)
  }

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D110D] pb-24">
        <div className="flex items-center gap-3 px-4 pt-14 pb-4">
          <SkeletonBlock className="w-9 h-9 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <SkeletonBlock className="h-5 w-36" />
            <SkeletonBlock className="h-2.5 w-24" />
          </div>
        </div>
        <div className="px-4 space-y-3">
          {[1, 2, 3, 4, 5].map(i => <PathsCardSkeleton key={i} />)}
        </div>
        <BottomNav />
      </div>
    )
  }

  // ── Locked (free users) ──────────────────────────────────────────────────

  if (!isGathrPlus) {
    return (
      <div className="min-h-screen bg-[#0D110D] flex flex-col pb-24">
        <div className="flex items-center px-4 pt-14 pb-4">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-[#F0EDE6] active:scale-95 transition-transform">
            ←
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center pb-10">
          <div className="w-16 h-16 rounded-2xl bg-[#E8B84B]/8 border border-[#E8B84B]/15 flex items-center justify-center mb-5">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(232,184,75,0.55)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[#F0EDE6] mb-2">Paths Crossed</h1>
          <p className="text-sm text-white/40 leading-relaxed mb-7 max-w-[260px]">
            See everyone you've been at the same event as — sorted by recency, with shared interests and a wave option.
          </p>
          <button
            onClick={() => router.push('/gathr-plus')}
            aria-label="Unlock Paths Crossed with Gathr+"
            className="w-full max-w-xs py-4 rounded-2xl bg-[#E8B84B] text-[#0D110D] text-base font-bold active:scale-95 transition-transform"
            style={{ boxShadow: '0 4px 24px rgba(232,184,75,0.35)' }}>
            Unlock with Gathr+
          </button>
          <p className="text-[10px] text-white/20 mt-3">$4.99/mo · 7-day free trial available</p>
        </div>
        <BottomNav />
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="min-h-screen bg-[#0D110D] flex flex-col pb-24">
        <div className="flex items-center px-4 pt-14 pb-4">
          <button onClick={() => router.back()}
            className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-[#F0EDE6] active:scale-95 transition-transform">
            ←
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4 pb-10">
          <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.7)" strokeWidth="1.75" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <p className="text-white/40 text-sm max-w-[220px] leading-relaxed">{error}</p>
          <button
            onClick={handleRetry}
            className="bg-[#E8B84B]/10 border border-[#E8B84B]/30 text-[#E8B84B] text-sm px-5 py-2.5 rounded-xl active:scale-95 transition-transform">
            Try again
          </button>
        </div>
        <BottomNav />
      </div>
    )
  }

  // ── Empty ────────────────────────────────────────────────────────────────

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#0D110D] flex flex-col pb-24">
        <div className="flex items-center gap-3 px-4 pt-14 pb-4">
          <button onClick={() => router.back()}
            className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-[#F0EDE6] active:scale-95 transition-transform flex-shrink-0">
            ←
          </button>
          <div>
            <h1 className="font-bold text-[#F0EDE6] text-lg">Paths Crossed</h1>
            <p className="text-[10px] text-[#E8B84B]/50">✦ Gathr+</p>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3 pb-20">
          <div className="w-14 h-14 bg-[#1C241C] border border-white/10 rounded-2xl flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <p className="text-white/40 text-sm">No paths crossed yet</p>
          <p className="text-white/25 text-xs max-w-[220px] leading-relaxed">
            Attend events and your co-attendees will appear here after the event ends.
          </p>
          <button
            onClick={() => router.push('/home')}
            className="mt-2 bg-[#E8B84B] text-[#0D110D] px-5 py-2.5 rounded-2xl font-semibold text-sm active:scale-95 transition-transform">
            Browse Events
          </button>
        </div>
        <BottomNav />
      </div>
    )
  }

  // ── Main list ────────────────────────────────────────────────────────────

  return (
    <FadeIn className="min-h-screen bg-[#0D110D] pb-24">

      <div className="flex items-center gap-3 px-4 pt-14 pb-4">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-[#F0EDE6] active:scale-95 transition-transform flex-shrink-0">
          ←
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-[#F0EDE6] text-lg">Paths Crossed</h1>
          <p className="text-[10px] text-[#E8B84B]/50 mt-0.5">✦ Gathr+ · {items.length}{hasMore ? '+' : ''} people</p>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {items.map((item) => {
          const events: any[] = item.co_attended_events || []
          const mostRecentEventId = events[0]?.id
          const isExpanded = expandedId === item.other_user_id

          return (
            <div key={item.other_user_id} className="bg-[#1C241C] border border-white/[0.06] rounded-2xl p-3.5">

              {/* Avatar · name · actions */}
              <div className="flex items-start gap-3 mb-2.5">
                <button
                  onClick={() => router.push('/profile/' + item.other_user_id)}
                  className="flex-shrink-0 mt-0.5 active:opacity-70 transition-opacity">
                  {optimizedImgSrc(item.avatar_url, 96) ? (
                    <img
                      src={optimizedImgSrc(item.avatar_url, 96)!}
                      alt=""
                      className="w-11 h-11 rounded-xl object-cover border border-white/10"
                      loading="lazy" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-[#2A4A2A] border border-white/10 flex items-center justify-center text-base font-semibold text-[#7EC87E]">
                      {item.name?.charAt(0) || '?'}
                    </div>
                  )}
                </button>

                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span className="text-sm font-semibold text-[#F0EDE6]">{item.name}</span>
                    <SafetyBadge tier={item.safety_tier || 'new'} reviewCount={item.review_count} size="sm" />
                  </div>
                  <div className="text-[10px] text-white/35">
                    {item.shared_event_count} shared event{item.shared_event_count !== 1 ? 's' : ''}
                    {item.shared_interest_count > 0 && (
                      <span className="ml-1.5 text-[#E8B84B]/50">
                        · {item.shared_interest_count} shared interest{item.shared_interest_count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  {connStatuses[item.other_user_id] ? (
                    <span className="text-[10px] text-white/30">Sent</span>
                  ) : (
                    <button
                      onClick={() => handleConnect(item.other_user_id)}
                      disabled={connLoading === item.other_user_id}
                      aria-label={'Connect with ' + item.name}
                      className="bg-[#E8B84B]/10 border border-[#E8B84B]/30 text-[#E8B84B] text-[10px] font-semibold px-2.5 py-1.5 rounded-xl active:scale-95 transition-transform disabled:opacity-50">
                      {connLoading === item.other_user_id ? '…' : '+ Hi'}
                    </button>
                  )}
                  {wavedIds.has(item.other_user_id) ? (
                    <span className="text-[10px] text-[#E8B84B]/40">Waved ✓</span>
                  ) : (
                    <button
                      onClick={() => handleWave(item.other_user_id, mostRecentEventId)}
                      disabled={!mostRecentEventId}
                      aria-label={'Wave at ' + item.name}
                      className="bg-white/5 border border-white/10 text-white/50 text-[10px] font-semibold px-2.5 py-1.5 rounded-xl active:scale-95 transition-transform disabled:opacity-30">
                      👋 Wave
                    </button>
                  )}
                </div>
              </div>

              {/* Collapsible event list */}
              <div className="border-t border-white/[0.06] pt-2.5">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : item.other_user_id)}
                  className="flex items-center justify-between w-full active:opacity-70 transition-opacity">
                  <span className="text-[10px] text-white/25 uppercase tracking-wide font-medium">
                    {isExpanded ? 'Hide events' : `${events.length} event${events.length !== 1 ? 's' : ''} together`}
                  </span>
                  <svg
                    width="11" height="11" viewBox="0 0 24 24" fill="none"
                    stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round"
                    className={'transition-transform duration-150 ' + (isExpanded ? 'rotate-180' : '')}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                {isExpanded && (
                  <div className="mt-2 space-y-1">
                    {events.map((ev: any, idx: number) => (
                      <button
                        key={ev.id ?? idx}
                        onClick={() => router.push('/events/' + ev.id)}
                        className="w-full flex items-center gap-2 text-left active:opacity-70 transition-opacity py-1">
                        <div className="w-1 h-1 rounded-full bg-[#E8B84B]/30 flex-shrink-0 mt-px" />
                        <span className="text-[11px] text-white/45 truncate flex-1">{ev.title}</span>
                        <span className="text-[10px] text-white/25 flex-shrink-0 ml-2">
                          {new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {hasMore && (
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="w-full py-3.5 rounded-2xl bg-[#1C241C] border border-white/10 text-white/50 text-sm font-medium active:scale-[0.98] transition-transform disabled:opacity-50">
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>

      <BottomNav />
    </FadeIn>
  )
}
