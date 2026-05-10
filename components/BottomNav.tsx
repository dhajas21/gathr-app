'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const HomeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a1 1 0 01-1 1H4a1 1 0 01-1-1z"/>
    <polyline points="9,22 9,12 15,12 15,22"/>
  </svg>
)

const CommunitiesIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="7" r="3"/>
    <path d="M3 20c0-2.8 2.7-5 6-5s6 2.2 6 5"/>
    <circle cx="17" cy="8" r="2.5"/>
    <path d="M21 20c0-2.3-2-4-4.5-4"/>
  </svg>
)

const MessageIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
)

const ProfileIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6"/>
  </svg>
)

export default function BottomNav() {
  const router = useRouter()
  const path = usePathname()
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unreadNotifs, setUnreadNotifs] = useState(0)

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | undefined
    let cancelled = false

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled || !session) return
      const uid = session.user.id

      const fetchCounts = async () => {
        const [msgRes, notifRes] = await Promise.all([
          supabase.from('messages').select('*', { count: 'exact', head: true }).eq('recipient_id', uid).is('read_at', null),
          supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('read', false),
        ])
        if (cancelled) return
        if (msgRes.count !== null) setUnreadMessages(msgRes.count)
        if (notifRes.count !== null) setUnreadNotifs(notifRes.count)
      }

      fetchCounts()

      channel = supabase
        .channel('nav-badge')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'recipient_id=eq.' + uid }, fetchCounts)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: 'recipient_id=eq.' + uid }, fetchCounts)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + uid }, fetchCounts)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + uid }, fetchCounts)
        .subscribe()
    })

    return () => { cancelled = true; if (channel) supabase.removeChannel(channel) }
  }, [])

  const active = (href: string) =>
    href === '/home' ? path === '/home'
    : href === '/communities' ? path?.startsWith('/communities')
    : href === '/messages' ? path?.startsWith('/messages')
    : href === '/profile' ? path?.startsWith('/profile')
    : false

  const tabClass = (href: string) =>
    'flex-1 flex flex-col items-center gap-1.5 transition-colors duration-150 ' +
    (active(href) ? 'text-[#E8B84B]' : 'text-white/30')

  const Badge = ({ count }: { count: number }) => count > 0 ? (
    <span className="absolute -top-1.5 -right-2.5 bg-[#E8B84B] text-[#0D110D] text-[8px] font-bold min-w-[14px] h-[14px] rounded-full flex items-center justify-center px-0.5 border border-[#0D110D]">
      {count > 9 ? '9+' : count}
    </span>
  ) : null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="h-6 bg-gradient-to-t from-[#0D110D] to-transparent pointer-events-none" />
      <div className="bg-[#0A0E0A]/92 backdrop-blur-2xl border-t border-white/[0.07] flex items-center px-1 pb-8 pt-2.5">

        <button onClick={() => router.push('/home')} className={tabClass('/home')}>
          <HomeIcon />
          <span className="text-[9px] font-semibold tracking-wider uppercase">Home</span>
        </button>

        <button onClick={() => router.push('/communities')} className={tabClass('/communities')}>
          <CommunitiesIcon />
          <span className="text-[9px] font-semibold tracking-wider uppercase">Groups</span>
        </button>

        <button onClick={() => router.push('/create')} className="flex-1 flex flex-col items-center -mt-3">
          <div className="w-12 h-12 rounded-[18px] bg-[#E8B84B] flex items-center justify-center active:scale-95 transition-transform"
            style={{ boxShadow: '0 4px 20px rgba(232,184,75,0.35), 0 0 0 1px rgba(232,184,75,0.2)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D110D" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </div>
        </button>

        <button onClick={() => router.push('/messages')} className={tabClass('/messages')}>
          <div className="relative">
            <MessageIcon />
            <Badge count={unreadMessages} />
          </div>
          <span className="text-[9px] font-semibold tracking-wider uppercase">Messages</span>
        </button>

        <button onClick={() => router.push('/profile')} className={tabClass('/profile')}>
          <div className="relative">
            <ProfileIcon />
            <Badge count={unreadNotifs} />
          </div>
          <span className="text-[9px] font-semibold tracking-wider uppercase">Profile</span>
        </button>

      </div>
    </div>
  )
}
