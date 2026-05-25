import { useEffect, useRef, useState } from 'react'
import {
  PROXIMITY_VISUAL_LERP,
  PROXIMITY_VISUAL_SETTLE_EPSILON,
} from '../config/proximity'

/**
 * Suaviza el progreso visual del aro (lerp por frame).
 * El loop se detiene al converger y se reactiva cuando cambia el target.
 */
export function useSmoothedProximityVisual(targetProgress, { enabled = true } = {}) {
  const [visualProgress, setVisualProgress] = useState(0)
  const currentRef = useRef(0)
  const targetRef = useRef(0)
  const enabledRef = useRef(enabled)
  const frameRef = useRef(0)

  useEffect(() => {
    enabledRef.current = enabled
    targetRef.current = enabled ? Math.min(1, Math.max(0, targetProgress ?? 0)) : 0

    if (!enabled) {
      currentRef.current = 0
      setVisualProgress(0)
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = 0
      }
      return undefined
    }

    const step = () => {
      if (!enabledRef.current) {
        frameRef.current = 0
        return
      }

      const target = targetRef.current
      const current = currentRef.current
      const delta = target - current

      if (Math.abs(delta) > PROXIMITY_VISUAL_SETTLE_EPSILON) {
        const next = current + delta * PROXIMITY_VISUAL_LERP
        currentRef.current = next
        setVisualProgress(next)
        frameRef.current = requestAnimationFrame(step)
        return
      }

      if (current !== target) {
        currentRef.current = target
        setVisualProgress(target)
      }

      frameRef.current = 0
    }

    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current)
    }
    frameRef.current = requestAnimationFrame(step)

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = 0
      }
    }
  }, [enabled, targetProgress])

  return visualProgress
}
