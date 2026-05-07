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

const MapIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21s-8-6-8-11a8 8 0 0116 0c0 5-8 11-8 11z"/>
    <circle cx="12" cy="10" r="2.5" fill="currentColor" stroke="none"/>
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
    fetchCounts()
    const channel = supabase
      .channel('nav-badge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, fetchCounts)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, fetchCounts)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, fetchCounts)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchCounts = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const [msgRes, notifRes] = await Promise.all([
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('recipient_id', session.user.id).is('read_at', null),
      supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id).eq('read', false),
    ])
    if (msgRes.count !== null) setUnreadMessages(msgRes.count)
    if (notifRes.count !== null) setUnreadNotifs(notifRes.count)
  }

  const active = (href: string) =>
    href === '/home' ? path === '/home'
    : href === '/map' ? path?.startsWith('/map')
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

        <button onClick={() => router.push('/map')} className={tabClass('/map')}>
          <MapIcon />
          <span className="text-[9px] font-semibold tracking-wider uppercase">Map</span>
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
