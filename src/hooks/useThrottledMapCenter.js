import { useEffect, useRef, useState } from 'react'
import { getDistanceMeters } from '../utils/geo'

/**
 * Centros de mapa throttled — el dot del usuario sigue en vivo; el pan no.
 */
export function useThrottledMapCenter(
  position,
  { minIntervalMs = 850, minMoveMeters = 3.5 } = {},
) {
  const [center, setCenter] = useState(null)
  const metaRef = useRef({ at: 0, lat: null, lng: null })
  const latestRef = useRef(position)
  latestRef.current = position

  useEffect(() => {
    if (!position) {
      metaRef.current = { at: 0, lat: null, lng: null }
      setCenter(null)
      return undefined
    }

    const commit = (next) => {
      metaRef.current = {
        at: Date.now(),
        lat: next.lat,
        lng: next.lng,
      }
      setCenter({
        lat: next.lat,
        lng: next.lng,
        accuracy: next.accuracy ?? null,
      })
    }

    const meta = metaRef.current
    if (meta.lat == null) {
      commit(position)
      return undefined
    }

    const moved = getDistanceMeters(meta.lat, meta.lng, position.lat, position.lng)
    const elapsed = Date.now() - meta.at

    if (moved >= minMoveMeters || elapsed >= minIntervalMs) {
      commit(position)
      return undefined
    }

    const timer = setTimeout(() => {
      const latest = latestRef.current
      if (latest) commit(latest)
    }, minIntervalMs - elapsed)

    return () => clearTimeout(timer)
  }, [minIntervalMs, minMoveMeters, position])

  return center
}
