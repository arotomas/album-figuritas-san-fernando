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

/**
 * Bearing suavizado para rotar el mapa según movimiento real (COG primero, compass fallback).
 * Actualización limitada (~400ms), inercia alta, sin jitter.
 */
export function useCinematicMapBearing(position, { enabled = true, paused = false } = {}) {
  const [bearing, setBearing] = useState(null)

  const displayRef = useRef(null)
  const targetRef = useRef(null)
  const cogAnchorRef = useRef(null)
  const prevPositionRef = useRef(null)
  const lastPublishedRef = useRef(null)
  const stoppedAtRef = useRef(null)
  const walkingRef = useRef(false)

  useEffect(() => {
    if (!enabled || paused || !position?.lat || !position?.lng) {
      targetRef.current = null
      walkingRef.current = false
      return
    }

    const accuracy = position.accuracy
    if (accuracy != null && accuracy > MAP_ROTATION_MAX_ACCURACY_M) {
      return
    }

    const previous = prevPositionRef.current
    const speed = resolveWalkSpeedMps(position, previous)
    prevPositionRef.current = {
      lat: position.lat,
      lng: position.lng,
      timestamp: position.timestamp ?? Date.now(),
    }

    if (speed != null && speed < MAP_ROTATION_STOP_SPEED_MPS) {
      if (!stoppedAtRef.current) {
        stoppedAtRef.current = Date.now()
      }
      walkingRef.current = false
      return
    }

    if (speed != null && speed >= MAP_ROTATION_MIN_SPEED_MPS) {
      stoppedAtRef.current = null
      walkingRef.current = true
    } else if (!walkingRef.current) {
      return
    }

    if (stoppedAtRef.current && Date.now() - stoppedAtRef.current > MAP_ROTATION_STOP_HOLD_MS) {
      walkingRef.current = false
      return
    }

    const cogFrom = cogAnchorRef.current ?? previous
    const cog = computeCourseOverGround(
      cogFrom,
      position,
      MAP_ROTATION_MIN_COG_DISTANCE_M,
    )

    if (cog != null) {
      cogAnchorRef.current = {
        lat: position.lat,
        lng: position.lng,
        timestamp: position.timestamp ?? Date.now(),
      }
      targetRef.current = cog
      return
    }

    const rawHeading = position.heading
    if (isValidHeading(rawHeading) && speed != null && speed >= MAP_ROTATION_MIN_SPEED_MPS) {
      targetRef.current = rawHeading
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
      setBearing(null)
      return undefined
    }

    if (paused) {
      return undefined
    }

    const tick = () => {
      const target = targetRef.current
      const shouldWalk = walkingRef.current && target != null && !paused

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
        }
        return
      }

      if (displayRef.current == null) {
        if (lastPublishedRef.current != null) {
          lastPublishedRef.current = null
          setBearing(null)
        }
        return
      }

      displayRef.current = lerpAngle(displayRef.current, 0, MAP_ROTATION_RETURN_NORTH_ALPHA)

      if (Math.abs(displayRef.current) < 0.8 || Math.abs(displayRef.current - 360) < 0.8) {
        displayRef.current = null
        lastPublishedRef.current = null
        setBearing(null)
        return
      }

      const delta = Math.abs(shortestAngleDelta(lastPublishedRef.current ?? 0, displayRef.current))
      if (delta >= MAP_ROTATION_MIN_DELTA_DEG) {
        lastPublishedRef.current = displayRef.current
        setBearing(displayRef.current)
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

  return { bearing }
}
