import { useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import { useQaCore } from '../qa/useQaCore'
import { buildAvailabilityContext } from '../utils/collectionAvailability'
import { getActiveEventIds } from '../utils/eventRegistry'
import { useAvailabilityTick } from './useAvailabilityTick'

/** Contexto unificado de availability para álbum, dashboard y progreso. */
export function useCollectionAvailabilityContext() {
  const discoveredCollectionIds = useAppStore((state) => state.discoveredCollectionIds)
  const { features } = useQaCore()
  const now = useAvailabilityTick({ enabled: true })

  return useMemo(
    () =>
      buildAvailabilityContext({
        discoveredCollectionIds,
        activeEventIds: getActiveEventIds(now),
        debugReveal: features.debugReveal,
        now,
      }),
    [discoveredCollectionIds, features.debugReveal, now],
  )
}

export function useCollectionAvailabilityOptions() {
  const discoveredCollectionIds = useAppStore((state) => state.discoveredCollectionIds)
  const { features } = useQaCore()
  const now = useAvailabilityTick({ enabled: true })

  return useMemo(
    () => ({
      discoveredCollectionIds,
      activeEventIds: getActiveEventIds(now),
      debugReveal: features.debugReveal,
      now,
    }),
    [discoveredCollectionIds, features.debugReveal, now],
  )
}
