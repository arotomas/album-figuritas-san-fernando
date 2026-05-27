import { useEffect, useRef, useState } from 'react'
import {
  MAP_ROTATION_EMA_ALPHA,
  MAP_ROTATION_MAX_ACCURACY_M,
  MAP_ROTATION_MIN_COG_DISTANCE_M,
  MAP_ROTATION_MIN_DELTA_DEG,
  MAP_ROTATION_MIN_SPEED_MPS,
  MAP_ROTATION_RETURN_NORTH_ALPHA,
  MAP_ROTATION_STOP_HOLD_MS,
  MAP_ROTATION_STOP_SPEED_MPS,
  MAP_ROTATION_UPDATE_MS,
} from '../config/mapRotation'
import {
  computeCourseOverGround,
  isValidHeading,
  lerpAngle,
  resolveWalkSpeedMps,
  shortestAngleDelta,
} from '../utils/mapBearing'
import { rotationTrace } from '../utils/rotationTrace'

const DEV = import.meta.env.DEV

function syncDebug(setDebug, patch) {
  if (!DEV || !setDebug) return
  setDebug((prev) => ({ ...prev, ...patch }))
}

/**
 * Bearing suavizado para rotar el mapa según movimiento real (COG primero, compass fallback).
 */
export function useCinematicMapBearing(position, { enabled = true, paused = false } = {}) {
  const [bearing, setBearing] = useState(null)
  const [debug, setDebug] = useState(null)

  const displayRef = useRef(null)
  const targetRef = useRef(null)
  const cogAnchorRef = useRef(null)
  const prevPositionRef = useRef(null)
  const lastPublishedRef = useRef(null)
  const stoppedAtRef = useRef(null)
  const walkingRef = useRef(false)
  const lastCogRef = useRef(null)
  const lastSpeedRef = useRef(null)
  const pausedLoggedRef = useRef(false)

  useEffect(() => {
    if (!enabled || paused) {
      if (DEV && paused && !pausedLoggedRef.current) {
        pausedLoggedRef.current = true
        rotationTrace('paused by interaction')
      }
      if (!paused) pausedLoggedRef.current = false
    }

    if (!enabled || paused || !position?.lat || !position?.lng) {
      if (!enabled || paused) {
        targetRef.current = null
        walkingRef.current = false
      }
      syncDebug(setDebug, { paused: Boolean(paused), quiet: !walkingRef.current })
      return
    }

    const accuracy = position.accuracy
    if (accuracy != null && accuracy > MAP_ROTATION_MAX_ACCURACY_M) {
      return
    }

    const previous = prevPositionRef.current
    const speed = resolveWalkSpeedMps(position, previous)
    lastSpeedRef.current = speed
    prevPositionRef.current = {
      lat: position.lat,
      lng: position.lng,
      timestamp: position.timestamp ?? Date.now(),
    }

    syncDebug(setDebug, {
      speed,
      paused: false,
      quiet: false,
    })

    if (speed != null && speed < MAP_ROTATION_STOP_SPEED_MPS) {
      if (!stoppedAtRef.current) {
        stoppedAtRef.current = Date.now()
        if (DEV) {
          rotationTrace('quiet mode — speed below stop threshold', {
            speed,
            threshold: MAP_ROTATION_STOP_SPEED_MPS,
          })
        }
      }
      walkingRef.current = false
      syncDebug(setDebug, { quiet: true, speed })
      return
    }

    if (speed != null && speed >= MAP_ROTATION_MIN_SPEED_MPS) {
      if (stoppedAtRef.current && DEV) {
        rotationTrace('quiet mode end — walking resumed', { speed })
      }
      stoppedAtRef.current = null
      walkingRef.current = true
    } else if (!walkingRef.current) {
      return
    }

    if (stoppedAtRef.current && Date.now() - stoppedAtRef.current > MAP_ROTATION_STOP_HOLD_MS) {
      walkingRef.current = false
      if (DEV) {
        rotationTrace('quiet mode — hold elapsed', {
          holdMs: MAP_ROTATION_STOP_HOLD_MS,
          speed,
        })
      }
      syncDebug(setDebug, { quiet: true, speed })
      return
    }

    const cogFrom = cogAnchorRef.current ?? previous
    const cog = computeCourseOverGround(
      cogFrom,
      position,
      MAP_ROTATION_MIN_COG_DISTANCE_M,
    )

    if (cog != null) {
      const prevCog = lastCogRef.current
      lastCogRef.current = cog
      cogAnchorRef.current = {
        lat: position.lat,
        lng: position.lng,
        timestamp: position.timestamp ?? Date.now(),
      }
      targetRef.current = cog
      if (DEV && (prevCog == null || Math.abs(shortestAngleDelta(prevCog, cog)) >= 2)) {
        rotationTrace('raw COG', {
          cog: Math.round(cog * 10) / 10,
          speed,
          minDistanceM: MAP_ROTATION_MIN_COG_DISTANCE_M,
        })
      }
      syncDebug(setDebug, {
        rawCog: cog,
        target: cog,
        speed,
        quiet: false,
      })
      return
    }

    const rawHeading = position.heading
    if (isValidHeading(rawHeading) && speed != null && speed >= MAP_ROTATION_MIN_SPEED_MPS) {
      targetRef.current = rawHeading
      if (DEV) {
        rotationTrace('compass fallback target', {
          heading: Math.round(rawHeading * 10) / 10,
          speed,
        })
      }
      syncDebug(setDebug, { target: rawHeading, speed, quiet: false })
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
      stoppedAtRef.current = null
      walkingRef.current = false
      lastCogRef.current = null
      lastSpeedRef.current = null
      setBearing(null)
      if (DEV) setDebug(null)
      return undefined
    }

    if (paused) {
      syncDebug(setDebug, { paused: true, quiet: !walkingRef.current })
      return undefined
    }

    const tick = () => {
      const target = targetRef.current
      const shouldWalk = walkingRef.current && target != null && !paused

      syncDebug(setDebug, {
        target,
        smoothed: displayRef.current,
        published: lastPublishedRef.current,
        rawCog: lastCogRef.current,
        speed: lastSpeedRef.current,
        quiet: !shouldWalk && displayRef.current != null,
        paused: false,
      })

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

        if (
          lastPublishedRef.current == null ||
          delta >= MAP_ROTATION_MIN_DELTA_DEG
        ) {
          lastPublishedRef.current = displayRef.current
          setBearing(displayRef.current)
          if (DEV) {
            rotationTrace('publish bearing', {
              published: Math.round(displayRef.current * 10) / 10,
              target: Math.round(target * 10) / 10,
              smoothed: Math.round(displayRef.current * 10) / 10,
              delta: Math.round(delta * 10) / 10,
            })
          }
          syncDebug(setDebug, {
            published: displayRef.current,
            smoothed: displayRef.current,
            target,
          })
        } else if (DEV && delta > 0.2) {
          rotationTrace('ignored delta', {
            delta: Math.round(delta * 10) / 10,
            minDelta: MAP_ROTATION_MIN_DELTA_DEG,
            smoothed: Math.round(displayRef.current * 10) / 10,
            target: Math.round(target * 10) / 10,
          })
        }
        return
      }

      if (displayRef.current == null) {
        if (lastPublishedRef.current != null) {
          lastPublishedRef.current = null
          setBearing(null)
          if (DEV) {
            rotationTrace('bearing cleared')
            setDebug(null)
          }
        }
        return
      }

      displayRef.current = lerpAngle(displayRef.current, 0, MAP_ROTATION_RETURN_NORTH_ALPHA)

      if (Math.abs(displayRef.current) < 0.8 || Math.abs(displayRef.current - 360) < 0.8) {
        displayRef.current = null
        lastPublishedRef.current = null
        setBearing(null)
        if (DEV) setDebug(null)
        return
      }

      const delta = Math.abs(shortestAngleDelta(lastPublishedRef.current ?? 0, displayRef.current))
      if (delta >= MAP_ROTATION_MIN_DELTA_DEG) {
        lastPublishedRef.current = displayRef.current
        setBearing(displayRef.current)
        if (DEV) {
          rotationTrace('publish bearing — return north', {
            published: Math.round(displayRef.current * 10) / 10,
            delta: Math.round(delta * 10) / 10,
          })
        }
      }
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
