/**
 * Cliente mínimo para OSRM Route API (perfil walking).
 * Geometría GeoJSON — sin polyline encoded.
 */

import { getDistanceMeters } from './geo'

function measurePolylinePathMeters(latlngs) {
  if (!Array.isArray(latlngs) || latlngs.length < 2) return 0

  let total = 0
  for (let i = 1; i < latlngs.length; i += 1) {
    const [lat1, lng1] = latlngs[i - 1]
    const [lat2, lng2] = latlngs[i]
    const segment = getDistanceMeters(lat1, lng1, lat2, lng2)
    if (segment != null) total += segment
  }
  return total
}

export async function fetchOsrmWalkingRoute(from, to, { baseUrl, profile = 'walking', signal } = {}) {
  const origin = `${from.lng},${from.lat}`
  const destination = `${to.lng},${to.lat}`
  const url =
    `${baseUrl}/route/v1/${profile}/${origin};${destination}` +
    '?overview=full&geometries=geojson&steps=false'

  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new Error(`OSRM HTTP ${response.status}`)
  }

  const data = await response.json()
  if (data.code !== 'Ok' || !data.routes?.[0]) {
    throw new Error(data.message || `OSRM ${data.code ?? 'error'}`)
  }

  const route = data.routes[0]
  const latlngs = route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
  const polylinePathMeters = measurePolylinePathMeters(latlngs)

  if (import.meta.env.DEV) {
    console.info('[ROUTE_POINTS_OSRM]', latlngs.length)
    console.info('[OSRM_ROUTE_POINTS]', latlngs.length)
    console.info('[OSRM_ROUTE_FIRST]', latlngs[0] ?? null)
    console.info('[OSRM_ROUTE_LAST]', latlngs[latlngs.length - 1] ?? null)
    console.info('[ROUTE_DISTANCE_COMPARE_OSRM]', {
      osrmDistanceMeters: route.distance,
      polylinePathMeters,
      deltaMeters: route.distance - polylinePathMeters,
      requestOrigin: { lat: from.lat, lng: from.lng },
      requestDestination: { lat: to.lat, lng: to.lng },
      geometryFirst: latlngs[0] ?? null,
      geometryLast: latlngs[latlngs.length - 1] ?? null,
      originToFirstMeters: latlngs[0]
        ? getDistanceMeters(from.lat, from.lng, latlngs[0][0], latlngs[0][1])
        : null,
      destinationToLastMeters: latlngs[latlngs.length - 1]
        ? getDistanceMeters(to.lat, to.lng, latlngs.at(-1)[0], latlngs.at(-1)[1])
        : null,
    })
  }

  return {
    latlngs,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    profile,
  }
}

/** Estimación por perfil cuando no hay ruta OSRM. */
export function estimateDurationSecondsForProfile(distanceMeters, profile = 'walking') {
  if (distanceMeters == null || !Number.isFinite(distanceMeters) || distanceMeters <= 0) {
    return null
  }

  const speedKmhByProfile = {
    walking: 5,
    cycling: 15,
    driving: 30,
  }
  const speedKmh = speedKmhByProfile[profile] ?? speedKmhByProfile.walking
  const speedMps = (speedKmh * 1000) / 3600
  return distanceMeters / speedMps
}

/** Estimación caminando ~5 km/h cuando no hay ruta OSRM. */
export function estimateWalkingDurationSeconds(distanceMeters) {
  return estimateDurationSecondsForProfile(distanceMeters, 'walking')
}

export async function fetchOsrmRoute(from, to, options = {}) {
  return fetchOsrmWalkingRoute(from, to, options)
}
