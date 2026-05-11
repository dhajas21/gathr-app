'use client'

import { useState } from 'react'

interface PasswordInputProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: 'current-password' | 'new-password'
  className?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  maxLength?: number
}

export default function PasswordInput({
  value, onChange, placeholder, autoComplete = 'current-password',
  className, onKeyDown, maxLength = 72,
}: PasswordInputProps) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onKeyDown={onKeyDown}
        maxLength={maxLength}
        className={(className || '') + ' pr-12'}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40 active:text-white/70 transition-colors px-2 py-1">
        {show ? '🙈' : '👁'}
      </button>
    </div>
  )
}
