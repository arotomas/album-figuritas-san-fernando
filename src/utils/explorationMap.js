import distance from '@turf/distance'
import { point } from '@turf/helpers'
import {
  EXPLORATION_BOUNDS_PADDING,
  EXPLORATION_DISTANCE_NEAR_M,
  EXPLORATION_FLY_DURATION_S,
  EXPLORATION_MAX_ZOOM,
  EXPLORATION_MAX_ZOOM_NEAR,
} from '../config/exploration'
import { formatDistance } from './geo'

export function measureExplorationDistanceMeters(user, target) {
  if (!user?.lat || !user?.lng || !target?.lat || !target?.lng) return null

  return (
    distance(point([user.lng, user.lat]), point([target.lng, target.lat]), {
      units: 'kilometers',
    }) * 1000
  )
}

export function formatExplorationDistance(meters) {
  if (meters == null || !Number.isFinite(meters)) return '—'
  return formatDistance(meters)
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
