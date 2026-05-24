import { useEffect, useRef, useState } from 'react'
import {
  PROXIMITY_VISUAL_LERP,
  PROXIMITY_VISUAL_SETTLE_EPSILON,
} from '../config/proximity'

/**
 * Suaviza el progreso visual del aro (lerp por frame, se detiene al estabilizar).
 */
export function useSmoothedProximityVisual(targetProgress, { enabled = true } = {}) {
  const [visualProgress, setVisualProgress] = useState(0)
  const currentRef = useRef(0)
  const targetRef = useRef(0)
  const frameRef = useRef(0)
  const animatingRef = useRef(false)

  useEffect(() => {
    targetRef.current = enabled ? Math.min(1, Math.max(0, targetProgress ?? 0)) : 0
    if (!enabled) {
      currentRef.current = 0
      setVisualProgress(0)
      animatingRef.current = false
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      return undefined
    }

    const step = () => {
      const target = targetRef.current
      const current = currentRef.current
      const delta = target - current

      if (Math.abs(delta) <= PROXIMITY_VISUAL_SETTLE_EPSILON) {
        currentRef.current = target
        setVisualProgress(target)
        animatingRef.current = false
        return
      }

      const next = current + delta * PROXIMITY_VISUAL_LERP
      currentRef.current = next
      setVisualProgress(next)
      frameRef.current = requestAnimationFrame(step)
    }

    const startLoop = () => {
      if (animatingRef.current) return
      animatingRef.current = true
      frameRef.current = requestAnimationFrame(step)
    }

    startLoop()

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      frameRef.current = 0
      animatingRef.current = false
    }
  }, [enabled, targetProgress])

  return visualProgress
}
