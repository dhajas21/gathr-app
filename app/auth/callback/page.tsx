'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push('/auth')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .single()

      if (!profile) {
        const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Gathr User'
        await supabase.from('profiles').insert({
          id: session.user.id,
          name,
          city: 'Bellingham',
          profile_mode: 'both',
          hosted_count: 0,
          attended_count: 0,
          interests: [],
          avatar_url: session.user.user_metadata?.avatar_url ?? null,
        })
        router.push('/setup')
      } else {
        router.push('/home')
      }
    })
  }, [])

  return (
    <div className="min-h-screen bg-[#0D110D] flex items-center justify-center">
      <div className="text-[#E8B84B] text-2xl font-bold">Gathr.</div>
    </div>
  )
}
