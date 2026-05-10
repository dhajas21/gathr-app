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

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        setError('Failed to load your profile. Please try again.')
        return
      }

      if (!profile) {
        const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Gathr User'
        const { error: insertError } = await supabase.from('profiles').insert({
          id: session.user.id,
          name,
          city: 'Bellingham',
          profile_mode: 'both',
          hosted_count: 0,
          attended_count: 0,
          interests: [],
          avatar_url: session.user.user_metadata?.avatar_url ?? null,
        })
        if (insertError) { setError('Failed to create your profile. Please try again.'); return }
        router.push('/setup')
      } else {
        router.push('/home')
      }
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
