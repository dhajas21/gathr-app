'use client'

import { useRouter, usePathname } from 'next/navigation'

export default function BottomNav() {
  const router = useRouter()
  const path = usePathname()

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
        const active = path === tab.href
        return (
          <button key={tab.href} onClick={() => router.push(tab.href)}
            className="flex-1 flex flex-col items-center gap-1">
            <span className="text-lg">{tab.icon}</span>
            <span className={`text-[9px] ${active ? 'text-[#E8B84B]' : 'text-white/30'}`}>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}