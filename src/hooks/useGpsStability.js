import { useEffect, useMemo, useRef, useState } from 'react'
import { getDistanceMeters } from '../utils/geo'
import { GPS_STABILITY_UNSTABLE_READINGS } from '../config/ux'

const STABILITY_WINDOW_MS = 4_000
const MIN_READINGS = 4
const MAX_ACCURACY_METERS = 30
const MAX_MOVEMENT_METERS = 6

function computeStability(readings) {
  if (readings.length === 0) {
    return { isStable: false, progress: 0, accuracy: null }
  }

  const latest = readings[readings.length - 1]
  const readingProgress = Math.min(readings.length / MIN_READINGS, 1)

  const accuracyScore =
    latest.accuracy <= MAX_ACCURACY_METERS
      ? 1
      : Math.max(0, 1 - (latest.accuracy - MAX_ACCURACY_METERS) / 40)

  let movementScore = 1

  if (readings.length >= 2) {
    const first = readings[0]
    const maxMovement = readings.reduce((max, reading) => {
      const distance = getDistanceMeters(
        first.lat,
        first.lng,
        reading.lat,
        reading.lng,
      )
      return Math.max(max, distance)
    }, 0)

    movementScore =
      maxMovement <= MAX_MOVEMENT_METERS
        ? 1
        : Math.max(0, 1 - (maxMovement - MAX_MOVEMENT_METERS) / 15)
  }

  const progress = Math.min(
    readingProgress * 0.35 + accuracyScore * 0.35 + movementScore * 0.3,
    1,
  )

  const isStable =
    readings.length >= MIN_READINGS &&
    latest.accuracy <= MAX_ACCURACY_METERS &&
    movementScore >= 0.85 &&
    progress >= 0.92

  return {
    isStable,
    progress: isStable ? 1 : progress,
    accuracy: latest.accuracy,
  }
}

/**
 * GPS estable con histéresis de salida — evita parpadeo del botón de captura.
 */
export function useGpsStability(position) {
  const [readings, setReadings] = useState([])
  const [stableLocked, setStableLocked] = useState(false)
  const unstableStreakRef = useRef(0)

  useEffect(() => {
    if (!position) {
      setReadings([])
      setStableLocked(false)
      unstableStreakRef.current = 0
      return
    }

    const now = Date.now()
    setReadings((previous) => [
      ...previous.filter((reading) => now - reading.timestamp < STABILITY_WINDOW_MS),
      {
        lat: position.lat,
        lng: position.lng,
        accuracy: position.accuracy,
        timestamp: now,
      },
    ])
  }, [position])

  const computed = useMemo(() => computeStability(readings), [readings])

  useEffect(() => {
    if (computed.isStable) {
      unstableStreakRef.current = 0
      setStableLocked(true)
      return
    }

    if (stableLocked) {
      unstableStreakRef.current += 1
      if (unstableStreakRef.current >= GPS_STABILITY_UNSTABLE_READINGS) {
        setStableLocked(false)
        unstableStreakRef.current = 0
      }
    }
  }, [computed.isStable, stableLocked])

  const isStable = stableLocked

  return useMemo(
    () => ({
      isStable,
      progress: isStable ? 1 : computed.progress,
      accuracy: computed.accuracy,
    }),
    [computed.accuracy, computed.progress, isStable],
  )
}
