import { useEffect, useMemo, useRef, useState } from 'react'
import { getDistanceMeters } from '../utils/geo'
import {
  GPS_CAPTURE_MAX_ACCURACY_M,
  GPS_PROXIMITY_MAX_ACCURACY_M,
} from '../config/gps'
import { GPS_STABILITY_UNSTABLE_READINGS } from '../config/ux'

const STABILITY_WINDOW_MS = 5_000
const MIN_READINGS = 3
const MAX_MOVEMENT_METERS = 8

function isGoodReading(reading) {
  return reading.accuracy <= GPS_PROXIMITY_MAX_ACCURACY_M
}

function computeStability(readings) {
  if (readings.length === 0) {
    return { isStable: false, progress: 0, accuracy: null, goodStreak: 0 }
  }

  const latest = readings[readings.length - 1]
  const goodReadings = readings.filter(isGoodReading)
  const recentGood = readings.slice(-MIN_READINGS).filter(isGoodReading)
  const goodStreak = recentGood.length

  const readingProgress = Math.min(goodReadings.length / MIN_READINGS, 1)

  const accuracyScore =
    latest.accuracy <= GPS_CAPTURE_MAX_ACCURACY_M
      ? 1
      : Math.max(
          0,
          1 -
            (latest.accuracy - GPS_CAPTURE_MAX_ACCURACY_M) /
              (GPS_PROXIMITY_MAX_ACCURACY_M - GPS_CAPTURE_MAX_ACCURACY_M + 1),
        )

  let movementScore = 1

  if (readings.length >= 2) {
    const anchor = readings[Math.max(0, readings.length - MIN_READINGS)]
    const maxMovement = readings.slice(-MIN_READINGS).reduce((max, reading) => {
      const distance = getDistanceMeters(
        anchor.lat,
        anchor.lng,
        reading.lat,
        reading.lng,
      )
      return Math.max(max, distance)
    }, 0)

    movementScore =
      maxMovement <= MAX_MOVEMENT_METERS
        ? 1
        : Math.max(0, 1 - (maxMovement - MAX_MOVEMENT_METERS) / 20)
  }

  const progress = Math.min(
    readingProgress * 0.4 + accuracyScore * 0.35 + movementScore * 0.25,
    1,
  )

  const consecutiveCaptureReady =
    recentGood.length >= MIN_READINGS &&
    recentGood.every((r) => r.accuracy <= GPS_CAPTURE_MAX_ACCURACY_M)

  const isStable =
    consecutiveCaptureReady &&
    latest.accuracy <= GPS_CAPTURE_MAX_ACCURACY_M &&
    movementScore >= 0.8 &&
    progress >= 0.9

  return {
    isStable,
    progress: isStable ? 1 : progress,
    accuracy: latest.accuracy,
    goodStreak,
  }
}

/**
 * GPS estable: exige 3 fixes consecutivos ≤30m antes de habilitar captura.
 * Ignora lecturas peores que 50m y saltos absurdos.
 */
export function useGpsStability(position) {
  const [readings, setReadings] = useState([])
  const [stableLocked, setStableLocked] = useState(false)
  const unstableStreakRef = useRef(0)
  const lastReadingRef = useRef(null)

  useEffect(() => {
    if (!position || position.accuracy > GPS_PROXIMITY_MAX_ACCURACY_M) {
      setReadings([])
      setStableLocked(false)
      unstableStreakRef.current = 0
      lastReadingRef.current = null
      return
    }

    const prev = lastReadingRef.current
    if (prev) {
      const jump = getDistanceMeters(
        prev.lat,
        prev.lng,
        position.lat,
        position.lng,
      )
      const dtSec = Math.max((position.timestamp - prev.timestamp) / 1000, 0.1)
      const allowed = Math.max(prev.accuracy, position.accuracy) * 2 + 8 * dtSec
      if (jump > allowed && jump > 60) {
        return
      }
    }

    lastReadingRef.current = position
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
      goodStreak: computed.goodStreak,
      requiredReadings: MIN_READINGS,
    }),
    [computed.accuracy, computed.goodStreak, computed.progress, isStable],
  )
}
