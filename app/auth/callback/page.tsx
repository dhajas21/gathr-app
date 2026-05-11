'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session }, error: sessionError }) => {
      if (sessionError || !session) {
        setError('Sign-in failed. Please try again.')
        return
      }

      // Profile is auto-created by the handle_new_auth_user DB trigger from
      // raw_user_meta_data. We use the interests array as the durable
      // "have they done setup?" marker — neither email nor Google signup
      // populates it, so it's reliably zero-length until /setup is finished.
      // (Previously we also checked avatar_url, but Google users come in with
      // an avatar pre-set, which incorrectly routed them past /setup.)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, interests')
        .eq('id', session.user.id)
        .maybeSingle()

      if (profileError) {
        setError('Failed to load your profile. Please try again.')
        return
      }

      const isFreshUser = !profile || (profile.interests?.length ?? 0) === 0
      router.push(isFreshUser ? '/setup' : '/home')
    })
  }, [router])

  if (error) return (
    <div className="min-h-screen bg-[#0D110D] flex flex-col items-center justify-center gap-4 px-6">
      <div className="text-[#E8B84B] text-2xl font-bold mb-2">Gathr.</div>
      <div className="bg-[#E85B5B]/8 border border-[#E85B5B]/20 rounded-2xl px-5 py-4 text-center max-w-xs">
        <p className="text-sm text-[#E85B5B] mb-3">{error}</p>
        <button onClick={() => router.push('/auth')}
          className="text-xs text-white/50 underline">Back to sign in</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0D110D] flex items-center justify-center">
      <div className="text-[#E8B84B] text-2xl font-bold">Gathr.</div>
    </div>
  )
}
