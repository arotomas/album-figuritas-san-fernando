import { useEffect, useState } from 'react'

/**
 * Etiqueta de distancia en captura — telemetría legible al caminar.
 * Experimental: sin buckets, EMA, arrived_lock ni ready_lock.
 * No alimenta ringProgress, isReady ni validaciones.
 */
export function useLiveRingDistanceLabel(distanceMeters) {
  const [displayMeters, setDisplayMeters] = useState(null)

  useEffect(() => {
    if (distanceMeters == null || !Number.isFinite(distanceMeters)) {
      setDisplayMeters(null)
      return
    }

    const rounded = Math.max(0, Math.round(distanceMeters))
    setDisplayMeters((prev) => (prev === rounded ? prev : rounded))
  }, [distanceMeters])

  return displayMeters
}
