const EARTH_RADIUS_METERS = 6_371_000

function toRadians(degrees) {
  return (degrees * Math.PI) / 180
}

/**
 * Distancia en metros entre dos coordenadas (fórmula de Haversine).
 */
export function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_METERS * c
}

export function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }

  return `${(meters / 1000).toFixed(1)} km`
}

export function isWithinRadius(userLat, userLng, targetLat, targetLng, radiusMeters) {
  return getDistanceMeters(userLat, userLng, targetLat, targetLng) <= radiusMeters
}
