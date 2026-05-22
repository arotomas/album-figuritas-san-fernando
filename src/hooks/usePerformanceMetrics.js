import { useEffect, useRef, useState } from 'react'
import { rafThrottle } from '../utils/performance'

export function usePerformanceMetrics(enabled = import.meta.env.DEV) {
  const [fps, setFps] = useState(0)
  const [renderCount, setRenderCount] = useState(0)
  const framesRef = useRef(0)
  const lastTimeRef = useRef(performance.now())
  const renderCountRef = useRef(0)

  useEffect(() => {
    if (!enabled) return

    const tick = rafThrottle(() => {
      framesRef.current += 1
      const now = performance.now()
      const elapsed = now - lastTimeRef.current

      if (elapsed >= 1000) {
        setFps(Math.round((framesRef.current * 1000) / elapsed))
        framesRef.current = 0
        lastTimeRef.current = now
        setRenderCount(renderCountRef.current)
      }
    })

    let id
    const loop = () => {
      tick()
      id = requestAnimationFrame(loop)
    }

    id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [enabled])

  const trackRender = () => {
    renderCountRef.current += 1
  }

  return { fps, renderCount, trackRender }
}

export function useRenderTracker(name, enabled = import.meta.env.DEV) {
  const countRef = useRef(0)
  countRef.current += 1

  useEffect(() => {
    if (!enabled) return
    window.__renderCounts = window.__renderCounts ?? {}
    window.__renderCounts[name] = countRef.current
  })

  return countRef.current
}
