'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const slides = [
  {
    icon: '🌆',
    eyebrow: 'Welcome to Gathr',
    title: 'Your city is full of',
    highlight: 'people like you.',
    body: 'Somewhere nearby, someone shares your passions, your drive, your vibe. Gathr helps you find them — in real life.',
  },
  {
    icon: '🎉',
    eyebrow: 'Events built for you',
    title: 'Host anything.',
    highlight: 'In 2 minutes.',
    body: 'Create events that attract the right people. Or discover what\'s happening around you — tonight, this weekend, whenever.',
  },
  {
    icon: '🤝',
    eyebrow: 'Real connections',
    title: 'Show up.',
    highlight: 'The rest follows.',
    body: 'The best relationships don\'t start online — they start in a room. Gathr gets you in the room.',
  },
]

export default function OnboardingPage() {
  const [current, setCurrent] = useState(0)
  const router = useRouter()

  const handleNext = () => {
    if (current < slides.length - 1) {
      setCurrent(current + 1)
    } else {
      router.push('/auth')
    }
  }

  const slide = slides[current]

  return (
    <div className="min-h-screen bg-[#0D110D] flex flex-col">

      {/* Slide */}
      <div className="flex-1 flex flex-col items-center justify-center px-7 text-center">
        <div className="w-20 h-20 rounded-3xl bg-[#1E3A1E] border border-[#E8B84B]/20 flex items-center justify-center text-4xl mb-7">
          {slide.icon}
        </div>
        <div className="text-[10px] tracking-[0.18em] uppercase text-[#E8B84B]/70 mb-2">{slide.eyebrow}</div>
        <h1 className="text-[26px] font-bold text-[#F0EDE6] leading-tight tracking-tight mb-3" style={{ fontFamily: 'sans-serif' }}>
          {slide.title}<br />
          <span className="text-[#E8B84B]">{slide.highlight}</span>
        </h1>
        <p className="text-sm text-white/45 leading-relaxed max-w-[240px] font-light">{slide.body}</p>

        {/* Dots */}
        <div className="flex gap-1.5 mt-6">
          {slides.map((_, i) => (
            <div key={i} className={'h-[5px] rounded-full transition-all duration-300 ' + (i === current ? 'w-5 bg-[#E8B84B]' : 'w-[5px] bg-white/15')} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 pb-10 pt-3 flex flex-col gap-2">
        <button onClick={handleNext}
          className="w-full py-4 rounded-2xl bg-[#E8B84B] text-[#0D110D] text-sm font-bold active:scale-95 transition-transform"
          style={{ boxShadow: '0 4px 20px rgba(232,184,75,0.25)' }}>
          {current < slides.length - 1 ? 'Next →' : 'Let\'s Go →'}
        </button>
        {current < slides.length - 1 && (
          <button onClick={() => router.push('/auth')}
            className="w-full py-3 text-sm text-white/40">
            Skip for now
          </button>
        )}
      </div>
    </div>
  )
}