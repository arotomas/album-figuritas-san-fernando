import { useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import { useQaMode } from '../utils/qaMode'
import { buildAvailabilityContext } from '../utils/collectionAvailability'

/** Contexto unificado de availability para álbum, dashboard y progreso. */
export function useCollectionAvailabilityContext() {
  const discoveredCollectionIds = useAppStore((state) => state.discoveredCollectionIds)
  const { isQaActive } = useQaMode()

  return useMemo(
    () =>
      buildAvailabilityContext({
        discoveredCollectionIds,
        debugReveal: isQaActive,
      }),
    [discoveredCollectionIds, isQaActive],
  )
}

export function useCollectionAvailabilityOptions() {
  const discoveredCollectionIds = useAppStore((state) => state.discoveredCollectionIds)
  const { isQaActive } = useQaMode()

  return useMemo(
    () => ({
      discoveredCollectionIds,
      debugReveal: isQaActive,
    }),
    [discoveredCollectionIds, isQaActive],
  )
}
