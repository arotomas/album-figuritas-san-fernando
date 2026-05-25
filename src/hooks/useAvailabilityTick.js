import { useEffect, useState } from 'react'

const DEFAULT_TICK_MS = 10 * 60 * 1000

/** Tick liviano para recalcular labels temporales sin polling agresivo. */
export function useAvailabilityTick({ enabled = true, intervalMs = DEFAULT_TICK_MS } = {}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!enabled) return undefined

    const safeInterval = Math.max(intervalMs, 60_000)
    setNow(Date.now())

    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, safeInterval)

    return () => window.clearInterval(timer)
  }, [enabled, intervalMs])

  return now
}
