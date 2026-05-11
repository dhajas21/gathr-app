'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { supabase } from '@/lib/supabase'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
// Default to the US ingest endpoint; override to https://eu.i.posthog.com for EU
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'

let initialized = false

function initPostHog() {
  if (initialized) return
  if (typeof window === 'undefined' || !POSTHOG_KEY) return
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    // Disable autocapture — we'll send purposeful events instead. Cleaner, cheaper.
    autocapture: false,
    capture_pageview: false, // we capture manually in the effect below so we get App Router transitions
    capture_pageleave: true,
    person_profiles: 'identified_only', // don't create person rows for anons
    persistence: 'localStorage+cookie',
    // PII safety
    mask_all_text: false,
    mask_all_element_attributes: false,
  })
  initialized = true
}

export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Boot PostHog once on mount
  useEffect(() => { initPostHog() }, [])

  // Identify the user when a session exists; reset on sign-out
  useEffect(() => {
    if (!POSTHOG_KEY) return
    const sync = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        posthog.identify(session.user.id, {
          email: session.user.email,
          created_at: session.user.created_at,
        })
      } else {
        posthog.reset()
      }
    }
    sync()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') sync()
      if (event === 'SIGNED_OUT') posthog.reset()
    })
    return () => { subscription.unsubscribe() }
  }, [])

  // Track route changes (manual pageview capture)
  useEffect(() => {
    if (!POSTHOG_KEY || !initialized) return
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
    posthog.capture('$pageview', { $current_url: window.location.origin + url })
  }, [pathname, searchParams])

  return <>{children}</>
}

/**
 * Send a single event. Safe to call from anywhere — no-ops if PostHog isn't configured.
 *
 * Recommended events to track (uniform names so dashboards stay clean):
 *   - 'signup_completed'
 *   - 'event_rsvp_joined' / 'event_rsvp_cancelled'
 *   - 'event_created'
 *   - 'community_joined' / 'community_created'
 *   - 'connection_requested' / 'connection_accepted'
 *   - 'message_sent'
 *   - 'wave_sent'
 *   - 'gathr_plus_trial_claimed' / 'gathr_plus_subscribed'
 */
export function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !POSTHOG_KEY || !initialized) return
  try { posthog.capture(event, properties) } catch { /* swallow */ }
}
