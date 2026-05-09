'use client'

import { useState, useEffect } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const raw = localStorage.getItem('gathr_theme')
    const stored: 'dark' | 'light' = raw === 'light' || raw === 'dark' ? raw : 'dark'
    setTheme(stored)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('gathr_theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  return { theme, toggleTheme }
}
