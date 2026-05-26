import { useEffect, useRef, useState } from 'react'
import {
  PROXIMITY_VISUAL_LERP_APPROACH,
  PROXIMITY_VISUAL_LERP_RECEDE,
  PROXIMITY_VISUAL_SETTLE_EPSILON,
  PROXIMITY_VISUAL_UPDATE_EVERY_N_FRAMES,
} from '../config/proximity'

function pickLerp(delta, snap) {
  if (snap || delta > 0.35) return 0.42
  return delta >= 0 ? PROXIMITY_VISUAL_LERP_APPROACH : PROXIMITY_VISUAL_LERP_RECEDE
}

/**
 * Suaviza el progreso visual del aro (lerp adaptativo + throttle de renders).
 * Target = eased progress (post-curva); una sola capa antes del ring UI.
 */
export function useSmoothedProximityVisual(
  targetProgress,
  { enabled = true, snap = false } = {},
) {
  const [visualProgress, setVisualProgress] = useState(0)
  const currentRef = useRef(0)
  const targetRef = useRef(0)
  const enabledRef = useRef(enabled)
  const snapRef = useRef(snap)
  const frameRef = useRef(0)
  const frameCounterRef = useRef(0)

  useEffect(() => {
    enabledRef.current = enabled
    snapRef.current = snap
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
        const lerp = pickLerp(delta, snapRef.current)
        const next = current + delta * lerp
        currentRef.current = next
        frameCounterRef.current += 1
        if (frameCounterRef.current >= PROXIMITY_VISUAL_UPDATE_EVERY_N_FRAMES) {
          frameCounterRef.current = 0
          setVisualProgress(next)
        }
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
    frameCounterRef.current = 0
    frameRef.current = requestAnimationFrame(step)

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = 0
      }
    }
  }, [enabled, snap, targetProgress])

  return visualProgress
}
