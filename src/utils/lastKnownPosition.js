import { getEffectiveAcceptMaxAccuracyM } from '../qa/qaLocation'
import { isPositionInPlayableArea } from '../geo/geoPolicy'

const STORAGE_KEY = 'figuritas-last-known-pos'
const MAX_AGE_MS = 30 * 60 * 1000

function isValidCached(parsed) {
  if (!parsed || parsed.lat == null || parsed.lng == null) return false
  if (!isPositionInPlayableArea(parsed.lat, parsed.lng)) return false
  const age = Date.now() - (parsed.timestamp ?? 0)
  if (parsed.timestamp && age > MAX_AGE_MS) return false
  return true
}

export function loadLastKnownPosition() {
  if (typeof sessionStorage === 'undefined') return null

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!isValidCached(parsed)) {
      sessionStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    return null
  }
}

export function saveLastKnownPosition(position) {
  if (typeof sessionStorage === 'undefined' || !position) return
  if (!isPositionInPlayableArea(position.lat, position.lng)) return
  const acceptMax = getEffectiveAcceptMaxAccuracyM()
  if (position.accuracy > acceptMax) return

  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        lat: position.lat,
        lng: position.lng,
        accuracy: position.accuracy,
        timestamp: position.timestamp ?? Date.now(),
      }),
    )
  } catch {
    // quota / private mode
  }
}

export function clearLastKnownPosition() {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
