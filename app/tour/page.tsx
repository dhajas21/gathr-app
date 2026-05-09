'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const tourSlides = [
  {
    icon: '🏠',
    title: 'Your Home Feed',
    highlight: 'Discover what\'s happening',
    body: 'Browse trending events, get picks tailored to your interests, and see what your friends are going to — all in one scrollable feed.',
    tip: 'Swipe the tabs: Trending, For You, Near Me, Friends, and Mine. Tap the map icon in the top-right corner to explore events as pins on a map.',
    bg: 'linear-gradient(135deg,#1E3A1E,#0E1A0E)',
  },
  {
    icon: '＋',
    title: 'Create an Event',
    highlight: 'In under 2 minutes',
    body: 'Hosting a meetup, run club, open mic, or coffee chat? Tap the gold + button. Choose from 40+ categories and set public, unlisted, or private visibility.',
    tip: 'Your progress auto-saves as a draft — leave mid-way and it\'ll be waiting when you come back. Add a cover photo and interest tags so the right people find you.',
    bg: 'linear-gradient(135deg,#2A2010,#1A1408)',
  },
  {
    icon: '👥',
    title: 'Groups & Communities',
    highlight: 'Find your people',
    body: 'Join communities built around shared interests — running crews, coffee clubs, tech meetups, and more. Members can post events directly within a community.',
    tip: 'Tap Groups in the bottom nav to browse and join communities. Community events show up in your home feed so you never miss a gathering.',
    bg: 'linear-gradient(135deg,#1A2A1E,#0E1A14)',
  },
  {
    icon: '✨',
    title: 'People Matching',
    highlight: 'Meet before & after events',
    body: 'Gathr surfaces people going to the same event as you who share your interests. Connect before you go, or get a follow-up notification after the event ends.',
    tip: 'Toggle People Matching on/off in Settings → Privacy. You\'ll see matches on any event you\'ve RSVP\'d to, up to 48 hours after it ends.',
    bg: 'linear-gradient(135deg,#1E2A1E,#2A1A2A)',
  },
  {
    icon: '💬',
    title: 'Connect & Message',
    highlight: 'Real conversations',
    body: 'See someone interesting at an event? View their profile, send a connection request, and start a direct conversation — all within Gathr.',
    tip: 'Connection requests show up in your notifications — tap the bell on the home screen to see them. Accept, decline, or view their profile right from the notification.',
    bg: 'linear-gradient(135deg,#2A1A1A,#1A0E0E)',
  },
  {
    icon: '⭐',
    title: 'Your Profile',
    highlight: 'Level up, earn badges, customize',
    body: 'Every event you host, attend, and connection you make earns XP. Unlock achievements, pin your favorites to your profile, and switch between light and dark mode any time.',
    tip: 'Find your level and badges in Profile → Stats tab. Tap Pin on any unlocked badge to show it on your profile. Toggle the theme via the sun icon on your profile or in Settings.',
    bg: 'linear-gradient(135deg,#2A2010,#1A1A08)',
  },
]

export default function TourPage() {
  const [current, setCurrent] = useState(0)
  const router = useRouter()

  const slide = tourSlides[current]
  const isLast = current === tourSlides.length - 1

  const handleNext = () => {
    if (isLast) {
      router.push('/home')
    } else {
      setCurrent(current + 1)
    }
  }

  const handleBack = () => {
    if (current > 0) setCurrent(current - 1)
  }

  return (
    <div className="min-h-screen bg-[#0D110D] flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-2">
        <div className="text-base font-bold text-[#F0EDE6]" style={{ fontFamily: 'sans-serif' }}>
          Gathr<span className="text-[#E8B84B]">.</span> <span className="text-xs font-normal text-white/30 ml-1">Quick Tour</span>
        </div>
        <button onClick={() => router.push('/home')} className="text-xs text-white/40">
          Skip tour
        </button>
      </div>

      {/* Progress */}
      <div className="flex gap-1 px-5 mb-2">
        {tourSlides.map((_, i) => (
          <div key={i} className={'flex-1 h-[3px] rounded-full transition-all duration-300 ' + (i <= current ? 'bg-[#E8B84B]' : 'bg-white/10')} />
        ))}
      </div>

      {/* Slide */}
      <div className="flex-1 flex flex-col items-center px-7 pt-6">

        <div className="w-full h-40 rounded-3xl flex items-center justify-center text-6xl mb-6 relative overflow-hidden"
          style={{ background: slide.bg }}>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D110D]/30 to-transparent"></div>
          <span className="relative z-10">{slide.icon}</span>
          <div className="absolute bottom-3 right-3 bg-[#0D110D]/60 border border-white/10 rounded-lg px-2 py-0.5 text-[9px] text-white/40">
            {current + 1} / {tourSlides.length}
          </div>
        </div>

        <h1 className="text-2xl font-bold text-[#F0EDE6] text-center leading-tight mb-1" style={{ fontFamily: 'sans-serif' }}>
          {slide.title}
        </h1>
        <p className="text-base font-bold text-[#E8B84B] text-center mb-3">{slide.highlight}</p>
        <p className="text-sm text-white/50 text-center leading-relaxed max-w-[280px] font-light mb-5">{slide.body}</p>

        <div className="w-full bg-[#1C241C] border border-[#E8B84B]/15 rounded-2xl p-3.5 flex items-start gap-3">
          <div className="w-8 h-8 bg-[#E8B84B]/10 rounded-xl flex items-center justify-center text-sm flex-shrink-0">💡</div>
          <div>
            <div className="text-[9px] uppercase tracking-widest text-[#E8B84B]/60 mb-1 font-medium">Pro tip</div>
            <div className="text-xs text-white/50 leading-relaxed">{slide.tip}</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 pb-10 pt-4">
        <div className="flex gap-3">
          {current > 0 && (
            <button onClick={handleBack}
              className="flex-1 py-3.5 rounded-2xl bg-[#1C241C] border border-white/10 text-white/50 text-sm font-medium active:scale-95 transition-transform">
              ← Back
            </button>
          )}
          <button onClick={handleNext}
            className={'py-3.5 rounded-2xl bg-[#E8B84B] text-[#0D110D] text-sm font-bold active:scale-95 transition-transform ' + (current > 0 ? 'flex-[2]' : 'w-full')}
            style={{ boxShadow: '0 4px 20px rgba(232,184,75,0.25)' }}>
            {isLast ? 'Start Using Gathr →' : 'Next →'}
          </button>
        </div>

        <div className="flex justify-center gap-1.5 mt-4">
          {tourSlides.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={'h-[5px] rounded-full transition-all duration-300 ' + (i === current ? 'w-5 bg-[#E8B84B]' : 'w-[5px] bg-white/15')} />
          ))}
        </div>
      </div>
    </div>
  )
}