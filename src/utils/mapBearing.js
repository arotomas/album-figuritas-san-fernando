import { getDistanceMeters } from './geo'

export function isValidHeading(heading) {
  return Number.isFinite(heading) && heading >= 0 && heading <= 360
}

/** Rumbo inicial → final en grados (sentido horario desde el norte). */
export function bearingFromCoordinates(lat1, lng1, lat2, lng2) {
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180

  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)

  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360
}

export function shortestAngleDelta(from, to) {
  if (from == null || to == null) return 0
  return ((to - from + 540) % 360) - 180
}

export function lerpAngle(from, to, alpha) {
  if (from == null) return to
  if (to == null) return from
  const delta = shortestAngleDelta(from, to)
  return (from + delta * alpha + 360) % 360
}

export function resolveWalkSpeedMps(position, previous) {
  const deviceSpeed = position?.speed
  if (Number.isFinite(deviceSpeed) && deviceSpeed >= 0) {
    return deviceSpeed
  }

  if (
    !previous ||
    position?.lat == null ||
    position?.lng == null ||
    previous.lat == null ||
    previous.lng == null
  ) {
    return null
  }

  const dtMs = Math.max((position.timestamp ?? Date.now()) - (previous.timestamp ?? 0), 1)
  const dtSec = dtMs / 1000
  const dist = getDistanceMeters(previous.lat, previous.lng, position.lat, position.lng)

  return dist / dtSec
}

export function computeCourseOverGround(previous, current, minDistanceM) {
  if (!previous || !current) return null

  const dist = getDistanceMeters(
    previous.lat,
    previous.lng,
    current.lat,
    current.lng,
  )

  if (dist < minDistanceM) return null

  return bearingFromCoordinates(previous.lat, previous.lng, current.lat, current.lng)
}
