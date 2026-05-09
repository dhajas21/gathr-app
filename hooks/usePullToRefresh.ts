import { useRef, useState, useCallback } from 'react'

const THRESHOLD = 72

export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const [refreshing, setRefreshing] = useState(false)
  const [pullProgress, setPullProgress] = useState(0)
  const startYRef = useRef(0)
  const activeRef = useRef(false)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY > 2) return
    startYRef.current = e.touches[0].clientY
    activeRef.current = true
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!activeRef.current) return
    const delta = e.touches[0].clientY - startYRef.current
    if (delta > 0) {
      setPullProgress(Math.min(delta / THRESHOLD, 1))
    } else {
      activeRef.current = false
      setPullProgress(0)
    }
  }, [])

  const handleTouchEnd = useCallback(async () => {
    activeRef.current = false
    if (pullProgress >= 1) {
      setRefreshing(true)
      setPullProgress(0)
      try { await onRefresh() } finally { setRefreshing(false) }
    } else {
      setPullProgress(0)
    }
  }, [pullProgress, onRefresh])

  return { refreshing, pullProgress, handleTouchStart, handleTouchMove, handleTouchEnd }
}
