import { useEffect, useRef } from 'react'
import {
  EXPLORATION_DISTANCE_UPDATE_MIN_M,
  EXPLORATION_DISTANCE_UPDATE_MIN_MS,
} from '../config/exploration'
import { useExplorationStore } from '../store/explorationStore'
import { measureExplorationDistanceMeters } from '../utils/explorationMap'

/**
 * Sincroniza distancia usuario → destino sin tocar captura ni proximidad.
 */
export function useExplorationDistanceSync(userPosition) {
  const active = useExplorationStore((state) => state.active)
  const targetCoordinates = useExplorationStore((state) => state.targetCoordinates)
  const setDistanceMeters = useExplorationStore((state) => state.setDistanceMeters)
  const setHasUserLocation = useExplorationStore((state) => state.setHasUserLocation)
  const metaRef = useRef({ at: 0, meters: null })

  useEffect(() => {
    const hasFix = Boolean(active && userPosition?.lat != null && userPosition?.lng != null)
    setHasUserLocation(hasFix)

    if (!active || !hasFix || !targetCoordinates) {
      metaRef.current = { at: 0, meters: null }
      return undefined
    }

    const commit = (meters) => {
      metaRef.current = { at: Date.now(), meters }
      setDistanceMeters(meters)
    }

    const meters = measureExplorationDistanceMeters(userPosition, targetCoordinates)
    if (meters == null) return undefined

    const meta = metaRef.current
    const elapsed = Date.now() - meta.at
    const delta =
      meta.meters == null ? EXPLORATION_DISTANCE_UPDATE_MIN_M + 1 : Math.abs(meta.meters - meters)

    if (meta.meters == null || delta >= EXPLORATION_DISTANCE_UPDATE_MIN_M || elapsed >= EXPLORATION_DISTANCE_UPDATE_MIN_MS) {
      commit(meters)
      return undefined
    }

    const timer = window.setTimeout(() => {
      const next = measureExplorationDistanceMeters(userPosition, targetCoordinates)
      if (next != null) commit(next)
    }, EXPLORATION_DISTANCE_UPDATE_MIN_MS - elapsed)

    return () => window.clearTimeout(timer)
  }, [
    active,
    setDistanceMeters,
    setHasUserLocation,
    targetCoordinates,
    userPosition?.lat,
    userPosition?.lng,
  ])
}

export function useExplorationMode() {
  const active = useExplorationStore((state) => state.active)
  const targetName = useExplorationStore((state) => state.targetName)
  const distanceMeters = useExplorationStore((state) => state.distanceMeters)
  const startExploration = useExplorationStore((state) => state.startExploration)
  const stopExploration = useExplorationStore((state) => state.stopExploration)

  return {
    active,
    targetName,
    distanceMeters,
    startExploration,
    stopExploration,
  }
}
