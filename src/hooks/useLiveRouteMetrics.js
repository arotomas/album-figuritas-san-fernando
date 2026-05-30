import { useMemo } from 'react'
import { ARRIVAL_RADIUS_METERS } from '../config/navigationUx'
import { calculateNavigationDurationSeconds } from '../utils/navigationDuration'
import { getDistanceMeters } from '../utils/geo'

export function useLiveRouteMetrics(
  userPosition,
  targetCoordinates,
  metrics,
  transportProfile = 'walking',
) {
  return useMemo(() => {
    if (!metrics?.distanceMeters) {
      return {
        remainingMeters: null,
        remainingSeconds: null,
        arrived: false,
      }
    }

    let remainingMeters = metrics.distanceMeters

    if (
      userPosition?.lat != null &&
      userPosition?.lng != null &&
      targetCoordinates?.lat != null &&
      targetCoordinates?.lng != null
    ) {
      const direct = getDistanceMeters(
        userPosition.lat,
        userPosition.lng,
        targetCoordinates.lat,
        targetCoordinates.lng,
      )
      if (direct != null) {
        remainingMeters = Math.min(direct, metrics.distanceMeters)
      }
    }

    const remainingSeconds = calculateNavigationDurationSeconds(
      remainingMeters,
      transportProfile,
    )

    const arrived =
      remainingMeters != null && remainingMeters <= ARRIVAL_RADIUS_METERS

    return {
      remainingMeters,
      remainingSeconds,
      arrived,
    }
  }, [
    metrics?.distanceMeters,
    targetCoordinates?.lat,
    targetCoordinates?.lng,
    transportProfile,
    userPosition?.lat,
    userPosition?.lng,
  ])
}
