/**
 * Cliente mínimo para OSRM Route API (perfil walking).
 * Geometría GeoJSON — sin polyline encoded.
 */

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

  return {
    latlngs,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  }
}

/** Estimación caminando ~5 km/h cuando no hay ruta OSRM. */
export function estimateWalkingDurationSeconds(distanceMeters) {
  if (distanceMeters == null || !Number.isFinite(distanceMeters) || distanceMeters <= 0) {
    return null
  }
  const walkSpeedMps = 5000 / 3600
  return distanceMeters / walkSpeedMps
}
