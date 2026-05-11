'use client'

import { Component, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0D110D] flex flex-col items-center justify-center px-6 text-center gap-4">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-lg font-bold text-[#F0EDE6]">Something went wrong</h1>
          <p className="text-sm text-white/40 max-w-[260px]">
            An unexpected error occurred. Reload the page to continue.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-6 py-3 rounded-2xl bg-[#E8B84B] text-[#0D110D] text-sm font-bold active:scale-95 transition-transform">
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
