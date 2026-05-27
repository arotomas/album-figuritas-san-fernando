import { useEffect, useRef, useState } from 'react'
import { isValidHeading, lerpAngle, shortestAngleDelta } from '../utils/mapBearing'

const MIN_WALK_SPEED_MPS = 1.05
const MIN_HEADING_DELTA_DEG = 16
const SMOOTHING = 0.09

/** Heading suavizado — solo caminando, inercia alta, sin jitter. */
export function useSmoothedHeading(position) {
  const [heading, setHeading] = useState(null)
  const smoothedRef = useRef(null)
  const lastAppliedRef = useRef(null)

  useEffect(() => {
    const raw = position?.heading
    const speed = position?.speed

    if (!isValidHeading(raw)) {
      return undefined
    }

    if (speed != null && speed >= 0 && speed < MIN_WALK_SPEED_MPS) {
      return undefined
    }

    if (smoothedRef.current == null) {
      smoothedRef.current = raw
      lastAppliedRef.current = raw
      setHeading(raw)
      return undefined
    }

    const next = lerpAngle(smoothedRef.current, raw, SMOOTHING)
    smoothedRef.current = next

    const delta = Math.abs(shortestAngleDelta(lastAppliedRef.current ?? next, next))
    if (delta < MIN_HEADING_DELTA_DEG) {
      return undefined
    }

    lastAppliedRef.current = next
    setHeading(next)
    return undefined
  }, [position?.heading, position?.speed, position?.timestamp])

  useEffect(() => {
    if (position?.lat == null || position?.lng == null) {
      smoothedRef.current = null
      lastAppliedRef.current = null
      setHeading(null)
    }
  }, [position?.lat, position?.lng])

  return heading
}
