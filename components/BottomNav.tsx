'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function BottomNav() {
  const router = useRouter()
  const path = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchUnread()
    // Listen for new messages in real-time
    const channel = supabase
      .channel('unread-badge')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, () => fetchUnread())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchUnread = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', session.user.id)
      .is('read_at', null)
    if (count !== null) setUnreadCount(count)
  }

  const tabs = [
    { icon: '🏠', label: 'Home', href: '/home' },
    { icon: '👥', label: 'Communities', href: '/communities' },
    { icon: null, label: '', href: '/create' },
    { icon: '💬', label: 'Messages', href: '/messages' },
    { icon: '👤', label: 'Profile', href: '/profile' },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0D110D]/97 border-t border-white/10 flex items-center px-2 pb-6 pt-2 z-50">
      {tabs.map((tab) => {
        if (!tab.icon) return (
          <button key="create" onClick={() => router.push('/create')}
            className="flex-1 flex flex-col items-center justify-center -mt-3">
            <div className="w-11 h-11 bg-[#E8B84B] rounded-2xl flex items-center justify-center text-xl text-[#0D110D] shadow-lg">＋</div>
          </button>
        )
        const active = path === tab.href || (tab.href === '/messages' && path?.startsWith('/messages'))
        return (
          <button key={tab.href} onClick={() => router.push(tab.href)}
            className="flex-1 flex flex-col items-center gap-1 relative">
            <span className="text-lg relative">
              {tab.icon}
              {tab.href === '/messages' && unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-[#E8B84B] text-[#0D110D] text-[8px] font-bold min-w-[14px] h-[14px] rounded-full flex items-center justify-center px-0.5 border-2 border-[#0D110D]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </span>
            <span className={`text-[9px] ${active ? 'text-[#E8B84B]' : 'text-white/30'}`}>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}