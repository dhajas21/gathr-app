'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

type PushStatus = 'unsupported' | 'denied' | 'inactive' | 'active' | 'pending'

/**
 * Returns push notification status and an explicit `enable()` action.
 *
 * IMPORTANT: We never auto-request browser notification permission on mount.
 * Browsers (Chrome/Firefox/Safari) penalise sites that request permission
 * before the user takes a clear action. Callers should expose a button
 * that invokes `enable()` so the prompt happens in response to user intent.
 *
 * On mount we only re-bind an *existing* subscription if one is present.
 */
export function usePushNotifications(userId: string | null) {
  const [status, setStatus] = useState<PushStatus>('inactive')

  // On mount: detect support and refresh an existing subscription only.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setStatus('unsupported'); return
    }
    if (Notification.permission === 'denied') { setStatus('denied'); return }
    if (!userId || !VAPID_PUBLIC_KEY) { setStatus('inactive'); return }

    let cancelled = false
    navigator.serviceWorker.ready.then(async (reg) => {
      if (cancelled) return
      const existing = await reg.pushManager.getSubscription()
      if (existing) {
        // Refresh DB row in case the endpoint changed (browser updates)
        const json = existing.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
        await supabase.from('push_subscriptions').upsert(
          { user_id: userId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
          { onConflict: 'user_id,endpoint' },
        )
        if (!cancelled) setStatus('active')
      } else {
        if (!cancelled) setStatus('inactive')
      }
    }).catch(() => { if (!cancelled) setStatus('inactive') })

    return () => { cancelled = true }
  }, [userId])

  const enable = useCallback(async () => {
    if (typeof window === 'undefined') return false
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setStatus('unsupported'); return false
    }
    if (!userId || !VAPID_PUBLIC_KEY) return false
    setStatus('pending')
    try {
      const permission = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'inactive')
        return false
      }
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      const sub = existing ?? (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }))
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      const { error } = await supabase.from('push_subscriptions').upsert(
        { user_id: userId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
        { onConflict: 'user_id,endpoint' },
      )
      if (error) { setStatus('inactive'); return false }
      setStatus('active')
      return true
    } catch {
      setStatus('inactive')
      return false
    }
  }, [userId])

  const disable = useCallback(async () => {
    if (typeof window === 'undefined' || !userId) return
    try {
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) {
        await existing.unsubscribe()
        const json = existing.toJSON() as { endpoint: string }
        await supabase.from('push_subscriptions').delete()
          .eq('user_id', userId).eq('endpoint', json.endpoint)
      }
      setStatus('inactive')
    } catch {
      // ignore
    }
  }, [userId])

  return { status, enable, disable }
}
