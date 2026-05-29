import { useEffect, useRef, useState } from 'react'
import { isValidHeading, lerpAngle, shortestAngleDelta } from '../utils/mapBearing'
import { logRotationDelta } from '../utils/rotationDeltaLog'

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
      logRotationDelta({
        file: 'useSmoothedHeading.js',
        fn: 'useEffect',
        line: 29,
        field: 'compassHeading',
        reason: 'initial-heading',
        prev: null,
        next: raw,
      })
      setHeading(raw)
      return undefined
    }

    const next = lerpAngle(smoothedRef.current, raw, SMOOTHING)
    smoothedRef.current = next

    const delta = Math.abs(shortestAngleDelta(lastAppliedRef.current ?? next, next))
    if (delta < MIN_HEADING_DELTA_DEG) {
      return undefined
    }

    logRotationDelta({
      file: 'useSmoothedHeading.js',
      fn: 'useEffect',
      line: 42,
      field: 'compassHeading',
      reason: 'smoothed-heading',
      prev: lastAppliedRef.current,
      next,
      meta: { delta: Math.round(delta * 10) / 10 },
    })
    lastAppliedRef.current = next
    setHeading(next)
    return undefined
  }, [position?.heading, position?.speed, position?.timestamp])

  useEffect(() => {
    if (position?.lat == null || position?.lng == null) {
      logRotationDelta({
        file: 'useSmoothedHeading.js',
        fn: 'useEffect',
        line: 50,
        field: 'compassHeading',
        reason: 'position-lost-reset',
        prev: lastAppliedRef.current,
        next: null,
      })
      smoothedRef.current = null
      lastAppliedRef.current = null
      setHeading(null)
    }
  }, [position?.lat, position?.lng])

  return heading
}
