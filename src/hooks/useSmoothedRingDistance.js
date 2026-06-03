import { useEffect, useRef, useState } from 'react'
import {
  captureGpsDiagEnabled,
  captureGpsDiagRecordDisplay,
} from '../utils/captureGpsDiagnostics'

const APPROACH_UPDATE_MS = 700
const REGRESS_UPDATE_MS = 2400
const EMA_ALPHA = 0.14
const ARRIVED_ENTER_M = 8
const ARRIVED_EXIT_M = 15

function bucketDisplayMeters(meters) {
  if (meters >= 120) return Math.round(meters / 10) * 10
  if (meters >= 45) return Math.round(meters / 5) * 5
  if (meters >= 14) return Math.round(meters / 3) * 3
  return Math.max(1, Math.round(meters))
}

function reportDisplay(payload) {
  if (!captureGpsDiagEnabled()) return
  captureGpsDiagRecordDisplay(payload)
}

/**
 * Distancia legible caminando — sin telemetría frame-perfect.
 * Se acerca rápido, retrocede lento, buckets humanos.
 */
export function useSmoothedRingDistance(distanceMeters, { isReady = false } = {}) {
  const [displayMeters, setDisplayMeters] = useState(null)
  const smoothRef = useRef(null)
  const displayedRef = useRef(null)
  const arrivedRef = useRef(false)
  const lastUpdateRef = useRef(0)

  useEffect(() => {
    if (isReady) {
      arrivedRef.current = true
      displayedRef.current = 0
      setDisplayMeters(0)
      reportDisplay({
        inputMeters: distanceMeters,
        displayMeters: 0,
        smoothInternal: smoothRef.current,
        isReady: true,
        skipReason: 'ready_lock',
      })
      return
    }

    if (distanceMeters == null || !Number.isFinite(distanceMeters)) {
      reportDisplay({
        inputMeters: distanceMeters,
        displayMeters: displayedRef.current,
        smoothInternal: smoothRef.current,
        isReady: false,
        skipReason: 'input_invalid',
      })
      return
    }

    smoothRef.current =
      smoothRef.current == null
        ? distanceMeters
        : smoothRef.current + (distanceMeters - smoothRef.current) * EMA_ALPHA

    const smooth = smoothRef.current

    if (!arrivedRef.current && smooth <= ARRIVED_ENTER_M) {
      arrivedRef.current = true
    } else if (arrivedRef.current && smooth > ARRIVED_EXIT_M) {
      arrivedRef.current = false
    }

    if (arrivedRef.current) {
      if (displayedRef.current !== 0) {
        displayedRef.current = 0
        setDisplayMeters(0)
        reportDisplay({
          inputMeters: distanceMeters,
          displayMeters: 0,
          smoothInternal: smooth,
          isReady: false,
          skipReason: 'arrived_lock',
        })
      } else {
        reportDisplay({
          inputMeters: distanceMeters,
          displayMeters: 0,
          smoothInternal: smooth,
          isReady: false,
          skipReason: 'arrived_hold',
        })
      }
      return
    }

    const bucketed = bucketDisplayMeters(smooth)
    const now = Date.now()
    const prev = displayedRef.current

    if (prev == null) {
      displayedRef.current = bucketed
      lastUpdateRef.current = now
      setDisplayMeters(bucketed)
      reportDisplay({
        inputMeters: distanceMeters,
        displayMeters: bucketed,
        smoothInternal: smooth,
        isReady: false,
        skipReason: 'display_updated',
      })
      return
    }

    if (bucketed === prev) {
      reportDisplay({
        inputMeters: distanceMeters,
        displayMeters: prev,
        smoothInternal: smooth,
        isReady: false,
        skipReason: 'bucket_unchanged',
      })
      return
    }

    const interval = bucketed < prev ? APPROACH_UPDATE_MS : REGRESS_UPDATE_MS
    if (now - lastUpdateRef.current < interval) {
      reportDisplay({
        inputMeters: distanceMeters,
        displayMeters: prev,
        smoothInternal: smooth,
        isReady: false,
        skipReason: bucketed < prev ? 'throttle_approach' : 'throttle_regress',
      })
      return
    }

    displayedRef.current = bucketed
    lastUpdateRef.current = now
    setDisplayMeters(bucketed)
    reportDisplay({
      inputMeters: distanceMeters,
      displayMeters: bucketed,
      smoothInternal: smooth,
      isReady: false,
      skipReason: 'display_updated',
    })
  }, [distanceMeters, isReady])

  useEffect(() => {
    if (distanceMeters == null) {
      smoothRef.current = null
      displayedRef.current = null
      arrivedRef.current = false
      setDisplayMeters(null)
      reportDisplay({
        inputMeters: null,
        displayMeters: null,
        smoothInternal: null,
        isReady: false,
        skipReason: 'reset',
      })
    }
  }, [distanceMeters])

  return displayMeters
}
