'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function usePushNotifications(userId: string | null) {
  useEffect(() => {
    if (!userId || typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (!VAPID_PUBLIC_KEY) {
      if (process.env.NODE_ENV === 'development') console.warn('[usePushNotifications] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set — push disabled')
      return
    }

    navigator.serviceWorker.ready
      .then(async (reg) => {
        if (Notification.permission === 'denied') return

        const permission =
          Notification.permission === 'granted'
            ? 'granted'
            : await Notification.requestPermission()
        if (permission !== 'granted') return

        const existing = await reg.pushManager.getSubscription()
        const sub =
          existing ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          }))

        const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
        await supabase.from('push_subscriptions').upsert(
          {
            user_id: userId,
            endpoint: json.endpoint,
            p256dh: json.keys.p256dh,
            auth: json.keys.auth,
          },
          { onConflict: 'user_id,endpoint' }
        )
      })
      .catch(console.error)
  }, [userId])
}
