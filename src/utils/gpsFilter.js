import { getDistanceMeters } from './geo'
import {
  GPS_FAST_MAX_AGE_MS,
} from '../config/gps'
import { getEffectiveAcceptMaxAccuracyM } from '../qa/qaLocation'

/** Edad del fix respecto al reloj del dispositivo. */
export function getFixAgeMs(position) {
  if (!position?.timestamp) return null
  return Math.max(0, Date.now() - position.timestamp)
}

/**
 * Estima si el fix vino de caché del SO vs lectura nueva.
 * Heurística: maximumAge permitido + edad real del timestamp.
 */
export function estimateFixSource(geoPosition, { maximumAge = 0 } = {}) {
  const ageMs = geoPosition.timestamp
    ? Math.max(0, Date.now() - geoPosition.timestamp)
    : 0

  if (ageMs <= 0) return 'fresh'
  if (maximumAge > 0 && ageMs >= maximumAge * 0.85) return 'cache'
  if (ageMs > GPS_FAST_MAX_AGE_MS) return 'stale'
  if (ageMs > 3_000) return 'cached'
  return 'fresh'
}

export function isAbsurdJump(from, to, { maxSpeedMps = 12 } = {}) {
  if (!from || !to) return false

  const dist = getDistanceMeters(from.lat, from.lng, to.lat, to.lng)
  const dtMs = Math.max(to.timestamp - from.timestamp, 1)
  const dtSec = dtMs / 1000

  const minAccuracy = Math.min(from.accuracy ?? 999, to.accuracy ?? 999)
  const allowed = Math.max(minAccuracy * 2.5, 25) + maxSpeedMps * dtSec

  if (dist > 120 && dist > allowed * 2) return true
  if (dtSec < 2 && dist > 150) return true

  return false
}

export function rejectFixReason(current, next, { maximumAge = 0, isCoarsePhase = false } = {}) {
  if (!next) return 'empty'

  const acceptMax = getEffectiveAcceptMaxAccuracyM()
  if (next.accuracy > acceptMax) {
    return 'accuracy_too_poor'
  }

  if (isAbsurdJump(current, next)) {
    return 'absurd_jump'
  }

  if (current && !shouldReplacePosition(current, next)) {
    return 'worse_or_redundant'
  }

  const source = estimateFixSource(
    { timestamp: next.timestamp },
    { maximumAge },
  )
  if (!isCoarsePhase && source === 'cache' && next.accuracy > 40) {
    return 'cached_coarse'
  }

  return null
}

/** ¿Reemplazar la posición actual por una nueva lectura? */
export function shouldReplacePosition(current, next) {
  if (!current) return true

  const ageMs = getFixAgeMs(current)

  if (next.accuracy < current.accuracy - 3) return true

  if (next.accuracy <= current.accuracy) return true

  if (ageMs != null && ageMs > 12_000 && next.accuracy <= getEffectiveAcceptMaxAccuracyM()) {
    return true
  }

  return false
}

export function normalizeGeoPosition(geoPosition, { phase = 'refine' } = {}) {
  const ageMs = geoPosition.timestamp
    ? Math.max(0, Date.now() - geoPosition.timestamp)
    : 0

  return {
    lat: geoPosition.coords.latitude,
    lng: geoPosition.coords.longitude,
    accuracy: geoPosition.coords.accuracy,
    heading: geoPosition.coords.heading,
    altitude: geoPosition.coords.altitude,
    altitudeAccuracy: geoPosition.coords.altitudeAccuracy,
    speed: geoPosition.coords.speed,
    timestamp: geoPosition.timestamp ?? Date.now(),
    ageMs,
    phase,
  }
}
