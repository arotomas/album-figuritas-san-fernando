import { useEffect, useRef, useState } from 'react'
import {
  MAP_ROTATION_DRIFT_MAX_STEP_M,
  MAP_ROTATION_EMA_ALPHA,
  MAP_ROTATION_MAX_ACCURACY_M,
  MAP_ROTATION_MIN_COG_DISTANCE_M,
  MAP_ROTATION_MIN_DELTA_DEG,
  MAP_ROTATION_MIN_SPEED_MPS,
  MAP_ROTATION_QUIET_LOCK_MS,
  MAP_ROTATION_STOP_SPEED_MPS,
  MAP_ROTATION_UPDATE_MS,
  MAP_ROTATION_WAKE_DISTANCE_M,
  MAP_ROTATION_WAKE_SPEED_CONFIRM_MS,
  MAP_ROTATION_WAKE_SPEED_MPS,
} from '../config/mapRotation'
import { getDistanceMeters } from '../utils/geo'
import {
  computeCourseOverGround,
  isValidHeading,
  lerpAngle,
  resolveWalkSpeedMps,
  shortestAngleDelta,
} from '../utils/mapBearing'

const DEV = import.meta.env.DEV

function syncDebug(setDebug, patch) {
  if (!DEV || !setDebug) return
  setDebug((prev) => ({ ...prev, ...patch }))
}

/**
 * Bearing suavizado para orientar overlays (COG primero, compass fallback).
 * El mapa permanece norte-arriba; no modifica mapPane.
 */
export function useCinematicMapBearing(position, { enabled = true, paused = false } = {}) {
  const [bearing, setBearing] = useState(null)
  const [debug, setDebug] = useState(null)

  const displayRef = useRef(null)
  const targetRef = useRef(null)
  const cogAnchorRef = useRef(null)
  const prevPositionRef = useRef(null)
  const lastPublishedRef = useRef(null)
  const lastCogRef = useRef(null)
  const lastSpeedRef = useRef(null)

  const walkingRef = useRef(false)
  const quietLockedRef = useRef(false)
  const quietLockAnchorRef = useRef(null)
  const lowSpeedSinceRef = useRef(null)
  const wakeSpeedSinceRef = useRef(null)

  function enterQuietLock(anchorPosition) {
    if (quietLockedRef.current) return
    quietLockedRef.current = true
    walkingRef.current = false
    wakeSpeedSinceRef.current = null
    quietLockAnchorRef.current = anchorPosition
      ? { lat: anchorPosition.lat, lng: anchorPosition.lng }
      : null
  }

  function exitQuietLock() {
    if (!quietLockedRef.current && !lowSpeedSinceRef.current) return
    quietLockedRef.current = false
    quietLockAnchorRef.current = null
    lowSpeedSinceRef.current = null
    wakeSpeedSinceRef.current = null
    walkingRef.current = true
    cogAnchorRef.current = null
  }

  useEffect(() => {
    if (!enabled || paused || !position?.lat || !position?.lng) {
      if (!enabled || paused) {
        targetRef.current = null
        walkingRef.current = false
        quietLockedRef.current = false
        lowSpeedSinceRef.current = null
        wakeSpeedSinceRef.current = null
      }
      syncDebug(setDebug, {
        paused: Boolean(paused),
        quietLocked: quietLockedRef.current,
        wakePending: false,
        mode: paused ? 'paused' : 'idle',
      })
      return
    }

    const accuracy = position.accuracy
    if (accuracy != null && accuracy > MAP_ROTATION_MAX_ACCURACY_M) {
      return
    }

    const previous = prevPositionRef.current
    let speed = resolveWalkSpeedMps(position, previous)
    let stepDistanceM = 0
    let impliedSpeedMps = null

    if (previous?.lat != null && previous?.lng != null) {
      stepDistanceM = getDistanceMeters(
        previous.lat,
        previous.lng,
        position.lat,
        position.lng,
      )
      const dtMs = Math.max(
        (position.timestamp ?? Date.now()) - (previous.timestamp ?? Date.now()),
        1,
      )
      impliedSpeedMps = stepDistanceM / (dtMs / 1000)
    }

    prevPositionRef.current = {
      lat: position.lat,
      lng: position.lng,
      timestamp: position.timestamp ?? Date.now(),
    }
    lastSpeedRef.current = speed

    const debugBase = {
      speed,
      impliedSpeed: impliedSpeedMps,
      stepDistanceM,
      paused: false,
      quietLocked: quietLockedRef.current,
      wakePending: Boolean(wakeSpeedSinceRef.current),
      mode: quietLockedRef.current
        ? 'quiet_locked'
        : walkingRef.current
          ? 'walking'
          : wakeSpeedSinceRef.current
            ? 'wake_pending'
            : lowSpeedSinceRef.current
              ? 'settling'
              : 'idle',
    }

    if (quietLockedRef.current) {
      const anchor = quietLockAnchorRef.current
      const distFromLock =
        anchor != null
          ? getDistanceMeters(anchor.lat, anchor.lng, position.lat, position.lng)
          : 0

      if (distFromLock >= MAP_ROTATION_WAKE_DISTANCE_M) {
        exitQuietLock()
      } else if (speed != null && speed >= MAP_ROTATION_WAKE_SPEED_MPS) {
        if (!wakeSpeedSinceRef.current) {
          wakeSpeedSinceRef.current = Date.now()
        } else if (
          Date.now() - wakeSpeedSinceRef.current >=
          MAP_ROTATION_WAKE_SPEED_CONFIRM_MS
        ) {
          exitQuietLock()
        }
      } else if (wakeSpeedSinceRef.current) {
        wakeSpeedSinceRef.current = null
      }

      syncDebug(setDebug, {
        ...debugBase,
        quietLocked: quietLockedRef.current,
        wakePending: Boolean(wakeSpeedSinceRef.current),
        distFromLock,
      })
      return
    }

    if (
      stepDistanceM > 0 &&
      stepDistanceM < MAP_ROTATION_DRIFT_MAX_STEP_M &&
      impliedSpeedMps != null &&
      impliedSpeedMps < MAP_ROTATION_STOP_SPEED_MPS &&
      (speed == null || speed > MAP_ROTATION_STOP_SPEED_MPS)
    ) {
      speed = impliedSpeedMps
    }

    if (speed == null || speed < MAP_ROTATION_STOP_SPEED_MPS) {
      if (!lowSpeedSinceRef.current) {
        lowSpeedSinceRef.current = Date.now()
      }
      walkingRef.current = false
      wakeSpeedSinceRef.current = null

      if (Date.now() - lowSpeedSinceRef.current >= MAP_ROTATION_QUIET_LOCK_MS) {
        enterQuietLock(position)
      }

      syncDebug(setDebug, {
        ...debugBase,
        quietLocked: false,
        mode: 'settling',
        lowSpeedMs: Date.now() - lowSpeedSinceRef.current,
      })
      return
    }

    if (speed < MAP_ROTATION_MIN_SPEED_MPS) {
      walkingRef.current = false
      wakeSpeedSinceRef.current = null
      syncDebug(setDebug, {
        ...debugBase,
        mode: 'idle',
        quietLocked: false,
      })
      return
    }

    lowSpeedSinceRef.current = null
    wakeSpeedSinceRef.current = null
    walkingRef.current = true

    const cogFrom = cogAnchorRef.current ?? previous
    const cog = computeCourseOverGround(
      cogFrom,
      position,
      MAP_ROTATION_MIN_COG_DISTANCE_M,
    )

    if (cog != null) {
      lastCogRef.current = cog
      cogAnchorRef.current = {
        lat: position.lat,
        lng: position.lng,
        timestamp: position.timestamp ?? Date.now(),
      }
      targetRef.current = cog
      syncDebug(setDebug, {
        ...debugBase,
        rawCog: cog,
        target: cog,
        mode: 'walking',
      })
      return
    }

    const rawHeading = position.heading
    if (isValidHeading(rawHeading)) {
      targetRef.current = rawHeading
      syncDebug(setDebug, {
        ...debugBase,
        target: rawHeading,
        mode: 'walking',
      })
    }
  }, [
    enabled,
    paused,
    position?.accuracy,
    position?.heading,
    position?.lat,
    position?.lng,
    position?.speed,
    position?.timestamp,
  ])

  useEffect(() => {
    if (!enabled) {
      displayRef.current = null
      targetRef.current = null
      cogAnchorRef.current = null
      prevPositionRef.current = null
      lastPublishedRef.current = null
      lastCogRef.current = null
      lastSpeedRef.current = null
      walkingRef.current = false
      quietLockedRef.current = false
      quietLockAnchorRef.current = null
      lowSpeedSinceRef.current = null
      wakeSpeedSinceRef.current = null
      setBearing(null)
      if (DEV) setDebug(null)
      return undefined
    }

    if (paused) {
      syncDebug(setDebug, {
        paused: true,
        quietLocked: quietLockedRef.current,
        mode: 'paused',
      })
      return undefined
    }

    const tick = () => {
      const quietLocked = quietLockedRef.current
      const target = targetRef.current
      const shouldWalk = walkingRef.current && target != null && !paused && !quietLocked

      syncDebug(setDebug, {
        target: quietLocked ? targetRef.current : target,
        smoothed: displayRef.current,
        published: lastPublishedRef.current,
        rawCog: lastCogRef.current,
        speed: lastSpeedRef.current,
        quietLocked,
        wakePending: Boolean(wakeSpeedSinceRef.current),
        mode: quietLocked
          ? 'quiet_locked'
          : shouldWalk
            ? 'walking'
            : wakeSpeedSinceRef.current
              ? 'wake_pending'
              : lowSpeedSinceRef.current
                ? 'settling'
                : 'hold',
        paused: false,
      })

      if (quietLocked) {
        return
      }

      if (shouldWalk) {
        if (displayRef.current == null) {
          displayRef.current = target
        } else {
          displayRef.current = lerpAngle(
            displayRef.current,
            target,
            MAP_ROTATION_EMA_ALPHA,
          )
        }

        const delta = Math.abs(
          shortestAngleDelta(lastPublishedRef.current ?? displayRef.current, displayRef.current),
        )

        if (lastPublishedRef.current == null || delta >= MAP_ROTATION_MIN_DELTA_DEG) {
          lastPublishedRef.current = displayRef.current
          setBearing(displayRef.current)
        }
        return
      }

      // Idle / settling: hold last bearing — no return-to-north (evita quiet drift).
    }

    const id = window.setInterval(tick, MAP_ROTATION_UPDATE_MS)
    return () => window.clearInterval(id)
  }, [enabled, paused])

  useEffect(() => {
    if (position?.lat == null || position?.lng == null) {
      cogAnchorRef.current = null
      prevPositionRef.current = null
    }
  }, [position?.lat, position?.lng])

  return { bearing, debug: DEV ? debug : null }
}
