'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import SafetyBadge from '@/components/SafetyBadge'

interface Reviewee {
  id: string
  name: string
  avatar_url: string | null
  safety_tier: string
  review_count: number
  alreadyReviewed: boolean
}

const FLAG_OPTIONS = [
  { value: null, label: 'No issues', emoji: '👍' },
  { value: 'uncomfortable', label: 'Felt uncomfortable', emoji: '😟' },
  { value: 'inappropriate', label: 'Inappropriate behavior', emoji: '🚫' },
  { value: 'threatening', label: 'Felt threatened', emoji: '🆘' },
]

export default function SurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const [eventId, setEventId] = useState('')
  const [eventTitle, setEventTitle] = useState('')
  const [user, setUser] = useState<any>(null)
  const [reviewees, setReviewees] = useState<Reviewee[]>([])
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [skippedAll, setSkippedAll] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submittedCount, setSubmittedCount] = useState(0)
  const [showSkipAllConfirm, setShowSkipAllConfirm] = useState(false)

  // Per-person form state
  const [showedUp, setShowedUp] = useState<boolean | null>(null)
  const [wasRespectful, setWasRespectful] = useState<boolean | null>(null)
  const [wouldAttendAgain, setWouldAttendAgain] = useState<boolean | null>(null)
  const [safetyFlag, setSafetyFlag] = useState<string | null>(null)

  const router = useRouter()

  useEffect(() => {
    params.then(({ id }) => {
      setEventId(id)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) { router.push('/auth'); return }
        setUser(session.user)
        fetchReviewees(id, session.user.id)
      })
    })
  }, [])

  const fetchReviewees = async (evtId: string, userId: string) => {
    const [eventRes, myRsvpRes, rsvpRes, reviewedRes, connectionsRes] = await Promise.all([
      supabase.from('events').select('title, end_datetime').eq('id', evtId).single(),
      supabase.from('rsvps').select('id').eq('event_id', evtId).eq('user_id', userId).maybeSingle(),
      supabase.from('rsvps').select('user_id').eq('event_id', evtId).neq('user_id', userId),
      supabase.from('user_reviews').select('reviewed_id').eq('reviewer_id', userId).eq('event_id', evtId),
      supabase.from('connections').select('requester_id, addressee_id').or(`requester_id.eq.${userId},addressee_id.eq.${userId}`).eq('status', 'accepted'),
    ])

    if (eventRes.data) setEventTitle(eventRes.data.title)

    // Reviewer must have attended the event and event must have ended
    if (!myRsvpRes.data) { setLoading(false); setSkippedAll(true); return }
    const eventEnded = eventRes.data ? new Date(eventRes.data.end_datetime).getTime() < Date.now() : false
    if (!eventEnded) { setLoading(false); setSkippedAll(true); return }

    const attendeeIds = (rsvpRes.data || []).map((r: any) => r.user_id)
    if (!attendeeIds.length) { setLoading(false); setDone(true); return }

    const alreadyReviewedIds = new Set((reviewedRes.data || []).map((r: any) => r.reviewed_id))
    const connectedIds = new Set(
      (connectionsRes.data || []).map((c: any) => c.requester_id === userId ? c.addressee_id : c.requester_id)
    )

    // Only show people user is connected with or matched with (matching_enabled)
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, safety_tier, review_count, matching_enabled')
      .in('id', attendeeIds)

    const eligible = (profilesData || [])
      .filter((p: any) => p.matching_enabled || connectedIds.has(p.id))
      .map((p: any) => ({ ...p, alreadyReviewed: alreadyReviewedIds.has(p.id) }))

    setReviewees(eligible)
    setLoading(false)
  }

  const resetForm = () => {
    setShowedUp(null)
    setWasRespectful(null)
    setWouldAttendAgain(null)
    setSafetyFlag(null)
  }

  const handleSkip = () => {
    const isLast = current >= reviewees.length - 1
    if (isLast && submittedCount === 0) {
      setShowSkipAllConfirm(true)
      return
    }
    if (isLast) {
      setDone(true)
    } else {
      resetForm()
      setCurrent(prev => prev + 1)
    }
  }

  const handleSubmit = async () => {
    if (!user || !eventId || submitting) return
    const reviewee = reviewees[current]
    if (!reviewee || reviewee.alreadyReviewed) { handleSkip(); return }

    setSubmitting(true)
    setSubmitError('')
    try {
      const { error: reviewError } = await supabase.from('user_reviews').insert({
        reviewer_id: user.id,
        reviewed_id: reviewee.id,
        event_id: eventId,
        showed_up: showedUp,
        was_respectful: wasRespectful,
        would_attend_again: wouldAttendAgain,
        safety_flag: safetyFlag,
      })

      if (reviewError) throw reviewError

      if (safetyFlag === 'threatening' || safetyFlag === 'inappropriate') {
        await supabase.from('notifications').insert({
          user_id: user.id,
          actor_id: reviewee.id,
          type: 'survey_prompt',
          title: 'Safety report submitted',
          body: 'Our team will review your report. Thank you for keeping Gathr safe.',
          link: '/events/' + eventId,
          read: false,
        })
      }

      setSubmittedCount(prev => prev + 1)
      if (current >= reviewees.length - 1) {
        setDone(true)
      } else {
        resetForm()
        setCurrent(prev => prev + 1)
      }
    } catch {
      setSubmitError('Something went wrong — tap Submit to try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const pending = reviewees.filter(r => !r.alreadyReviewed)
  const reviewee = reviewees[current]

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D110D] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#E8B84B]/30 border-t-[#E8B84B] animate-spin" />
      </div>
    )
  }

  if (done || skippedAll || reviewees.length === 0 || pending.length === 0) {
    return (
      <div className="min-h-screen bg-[#0D110D] flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-5">✨</div>
        <h1 className="text-xl font-bold text-[#F0EDE6] mb-2">All done!</h1>
        <p className="text-sm text-white/40 mb-8 max-w-[260px]">
          {skippedAll
            ? 'Reviews are only available to people who attended the event after it ends.'
            : reviewees.length === 0
            ? 'No one to review from this event yet.'
            : 'Your feedback helps everyone in the community stay safe and find their people.'}
        </p>
        <button
          onClick={() => router.push('/events/' + eventId)}
          className="w-full max-w-xs py-3.5 rounded-2xl bg-[#E8B84B] text-[#0D110D] text-sm font-bold active:scale-95 transition-transform">
          Back to Event
        </button>
      </div>
    )
  }

  const isAnswered = showedUp !== null || wasRespectful !== null || wouldAttendAgain !== null

  return (
    <div className="min-h-screen bg-[#0D110D] flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-4">
        <button onClick={() => router.back()} className="text-white/30 text-sm">← Back</button>
        <div className="text-[10px] text-white/20">
          {current + 1} of {reviewees.length}
        </div>
        <button onClick={handleSkip} className="text-[10px] text-white/30">Skip</button>
      </div>

      {/* Progress */}
      <div className="flex gap-1 px-5 mb-6">
        {reviewees.map((r, i) => (
          <div key={i} className={'flex-1 h-[3px] rounded-full ' + (i < current ? 'bg-[#E8B84B]' : i === current ? 'bg-[#E8B84B]/50' : r.alreadyReviewed ? 'bg-[#4A90D9]/40' : 'bg-white/10')} />
        ))}
      </div>

      {/* Context */}
      <div className="px-5 mb-4">
        <div className="text-[9px] uppercase tracking-widest text-white/20 mb-1">After {eventTitle}</div>
        <div className="text-xs text-white/30">Rate your experience with this person</div>
      </div>

      {/* Person card */}
      <div className="mx-5 bg-[#1C241C] border border-white/[0.07] rounded-2xl p-4 mb-5 flex items-center gap-3">
        {reviewee?.avatar_url ? (
          <img src={reviewee.avatar_url} alt="" className="w-14 h-14 rounded-2xl object-cover border border-white/10" />
        ) : (
          <div className="w-14 h-14 bg-[#2A4A2A] rounded-2xl flex items-center justify-center text-2xl border border-white/10">
            {reviewee?.name?.charAt(0) || '?'}
          </div>
        )}
        <div>
          <div className="text-base font-bold text-[#F0EDE6] mb-1">{reviewee?.name}</div>
          <SafetyBadge tier={reviewee?.safety_tier || 'new'} reviewCount={reviewee?.review_count} size="sm" />
          {(reviewee?.review_count || 0) > 0 && (
            <div className="text-[9px] text-white/20 mt-1">{reviewee.review_count} review{reviewee.review_count !== 1 ? 's' : ''}</div>
          )}
        </div>
      </div>

      {reviewee?.alreadyReviewed ? (
        <div className="mx-5 bg-[#1C241C] border border-[#4A90D9]/15 rounded-2xl p-4 text-center mb-5">
          <div className="text-[#4A90D9] text-sm font-semibold mb-1">Already reviewed</div>
          <div className="text-xs text-white/30">You've already submitted feedback for this person.</div>
        </div>
      ) : (
        <div className="px-5 space-y-4 flex-1">

          {/* Q1 */}
          <div className="bg-[#1C241C] border border-white/[0.07] rounded-2xl p-4">
            <div className="text-sm font-semibold text-[#F0EDE6] mb-3">Did they show up?</div>
            <div className="flex gap-2">
              {[true, false].map(val => (
                <button key={String(val)} onClick={() => setShowedUp(val)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${showedUp === val ? (val ? 'bg-[#7EC87E]/20 border border-[#7EC87E]/40 text-[#7EC87E]' : 'bg-red-500/15 border border-red-500/30 text-red-400') : 'bg-white/5 border border-white/10 text-white/40'}`}>
                  {val ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
          </div>

          {/* Q2 */}
          <div className="bg-[#1C241C] border border-white/[0.07] rounded-2xl p-4">
            <div className="text-sm font-semibold text-[#F0EDE6] mb-3">Were they respectful?</div>
            <div className="flex gap-2">
              {[true, false].map(val => (
                <button key={String(val)} onClick={() => setWasRespectful(val)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${wasRespectful === val ? (val ? 'bg-[#7EC87E]/20 border border-[#7EC87E]/40 text-[#7EC87E]' : 'bg-red-500/15 border border-red-500/30 text-red-400') : 'bg-white/5 border border-white/10 text-white/40'}`}>
                  {val ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
          </div>

          {/* Q3 */}
          <div className="bg-[#1C241C] border border-white/[0.07] rounded-2xl p-4">
            <div className="text-sm font-semibold text-[#F0EDE6] mb-3">Would you attend another event with them?</div>
            <div className="flex gap-2">
              {[true, false].map(val => (
                <button key={String(val)} onClick={() => setWouldAttendAgain(val)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${wouldAttendAgain === val ? (val ? 'bg-[#7EC87E]/20 border border-[#7EC87E]/40 text-[#7EC87E]' : 'bg-red-500/15 border border-red-500/30 text-red-400') : 'bg-white/5 border border-white/10 text-white/40'}`}>
                  {val ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
          </div>

          {/* Q4 — Report */}
          <div className="bg-[#1C241C] border border-white/[0.07] rounded-2xl p-4">
            <div className="text-sm font-semibold text-[#F0EDE6] mb-3">Anything to report?</div>
            <div className="space-y-2">
              {FLAG_OPTIONS.map(opt => (
                <button key={String(opt.value)} onClick={() => setSafetyFlag(opt.value)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all active:scale-95 ${safetyFlag === opt.value ? (opt.value ? 'bg-red-500/10 border border-red-500/30' : 'bg-[#7EC87E]/10 border border-[#7EC87E]/30') : 'bg-white/[0.03] border border-white/[0.07]'}`}>
                  <span className="text-base">{opt.emoji}</span>
                  <span className={`text-sm font-medium ${safetyFlag === opt.value ? (opt.value ? 'text-red-400' : 'text-[#7EC87E]') : 'text-white/50'}`}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 pb-10 pt-5">
        {submitError && (
          <div className="mb-3 bg-red-500/10 border border-red-500/25 rounded-2xl px-4 py-2.5 text-xs text-red-400 text-center">
            {submitError}
          </div>
        )}
        <button
          onClick={reviewee?.alreadyReviewed ? handleSkip : handleSubmit}
          disabled={submitting || (!reviewee?.alreadyReviewed && !isAnswered)}
          className="w-full py-3.5 rounded-2xl bg-[#E8B84B] text-[#0D110D] text-sm font-bold active:scale-95 transition-transform disabled:opacity-40"
          style={{ boxShadow: '0 4px 20px rgba(232,184,75,0.25)' }}>
          {submitting ? 'Submitting...' : reviewee?.alreadyReviewed ? 'Next →' : current >= reviewees.length - 1 ? 'Submit & Finish' : 'Submit & Next →'}
        </button>
        {!reviewee?.alreadyReviewed && (
          <p className="text-[9px] text-white/20 text-center mt-3">
            Reviews are anonymous. Repeated safety flags trigger a community review.
          </p>
        )}
      </div>

      {showSkipAllConfirm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center" onClick={() => setShowSkipAllConfirm(false)}>
          <div className="w-full max-w-md bg-[#1C241C] rounded-t-3xl p-6 pb-10" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />
            <div className="text-center mb-5">
              <div className="text-3xl mb-3">🤔</div>
              <h3 className="text-base font-bold text-[#F0EDE6] mb-1">Skip all reviews?</h3>
              <p className="text-xs text-white/40 leading-relaxed">Your feedback keeps the community safe and helps people build trust. It only takes a moment.</p>
            </div>
            <button
              onClick={() => { setShowSkipAllConfirm(false); setDone(true) }}
              className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white/50 text-sm font-medium mb-2">
              Skip anyway
            </button>
            <button
              onClick={() => setShowSkipAllConfirm(false)}
              className="w-full py-3.5 rounded-2xl bg-[#E8B84B] text-[#0D110D] text-sm font-bold active:scale-95 transition-transform">
              Leave a quick review →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
