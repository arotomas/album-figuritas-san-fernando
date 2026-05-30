import { TRANSPORT_SPEED_KMH } from '../config/navigationUx'

/** Duración estimada local según distancia OSRM y modo de transporte activo. */
export function calculateNavigationDurationSeconds(
  distanceMeters,
  transportProfile = 'walking',
) {
  if (distanceMeters == null || !Number.isFinite(distanceMeters) || distanceMeters <= 0) {
    return null
  }

  const speedKmH = TRANSPORT_SPEED_KMH[transportProfile] ?? TRANSPORT_SPEED_KMH.walking
  const speedMps = (speedKmH * 1000) / 3600
  return distanceMeters / speedMps
}
