import { MAP_ISOLATION_NO_EXPLORATION_CAMERA_ROTATION } from '../config/mapIsolationPreview'
import {
  EXPLORATION_BOUNDS_PADDING,
  EXPLORATION_DISTANCE_NEAR_M,
  EXPLORATION_FLY_DURATION_S,
  EXPLORATION_MAX_ZOOM,
  EXPLORATION_MAX_ZOOM_NEAR,
} from '../config/exploration'
import { formatDistance, getDistanceMeters } from './geo'

export function measureExplorationDistanceMeters(user, target) {
  if (!user?.lat || !user?.lng || !target?.lat || !target?.lng) return null
  return getDistanceMeters(user.lat, user.lng, target.lat, target.lng)
}

export function formatExplorationDistance(meters) {
  if (meters == null || !Number.isFinite(meters)) return '—'
  return formatDistance(meters)
}

function mapHasLayout(map) {
  const container = map?.getContainer?.()
  return Boolean(container && container.clientWidth >= 2 && container.clientHeight >= 2)
}

function safeMapCamera(map, run) {
  try {
    run()
    return true
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[exploration] camera skipped', error?.message ?? error)
    }
    return false
  }
}

/**
 * Centra suavemente usuario + destino con padding mobile-safe.
 * @param {import('leaflet').Map} map
 */
export function fitBoundsBetweenUserAndTarget(
  map,
  user,
  target,
  { reducedMotion = false } = {},
) {
  if (MAP_ISOLATION_NO_EXPLORATION_CAMERA_ROTATION) return
  if (!map || !user?.lat || !user?.lng || !target?.lat || !target?.lng) return

  const distanceM = measureExplorationDistanceMeters(user, target)
  const maxZoom =
    distanceM != null && distanceM < EXPLORATION_DISTANCE_NEAR_M
      ? EXPLORATION_MAX_ZOOM_NEAR
      : EXPLORATION_MAX_ZOOM

  const bounds = [
    [user.lat, user.lng],
    [target.lat, target.lng],
  ]

  map.flyToBounds(bounds, {
    padding: EXPLORATION_BOUNDS_PADDING,
    maxZoom,
    duration: reducedMotion ? 0 : EXPLORATION_FLY_DURATION_S,
    easeLinearity: 0.24,
  })
}

/** Si aún no hay GPS, al menos centra el destino. */
export function flyToExplorationTarget(map, target, { reducedMotion = false } = {}) {
  if (MAP_ISOLATION_NO_EXPLORATION_CAMERA_ROTATION) return
  if (!map || !target?.lat || !target?.lng) return

  map.flyTo([target.lat, target.lng], EXPLORATION_MAX_ZOOM, {
    duration: reducedMotion ? 0 : EXPLORATION_FLY_DURATION_S,
    easeLinearity: 0.24,
  })
}

export function runExplorationCamera(
  map,
  user,
  target,
  { reducedMotion = false } = {},
) {
  if (MAP_ISOLATION_NO_EXPLORATION_CAMERA_ROTATION) return false
  if (!map || !target?.lat || !target?.lng) return false

  let attempts = 0
  const maxAttempts = 48

  const apply = () => {
    if (!mapHasLayout(map)) return false

    return safeMapCamera(map, () => {
      if (user?.lat != null && user?.lng != null) {
        fitBoundsBetweenUserAndTarget(map, user, target, { reducedMotion })
      } else {
        flyToExplorationTarget(map, target, { reducedMotion })
      }
    })
  }

  const schedule = () => {
    if (apply() || attempts >= maxAttempts) return
    attempts += 1
    requestAnimationFrame(schedule)
  }

  if (map._loaded) {
    schedule()
  } else {
    map.whenReady(schedule)
  }

  return true
}
