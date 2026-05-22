import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'

export function usePersistedAlbum() {
  const hasHydrated = useAppStore((state) => state._hasHydrated)
  const albumStatus = useAppStore((state) => state.albumStatus)
  const lastSavedAt = useAppStore((state) => state.lastSavedAt)
  const figures = useAppStore((state) => state.figures)

  const [ready, setReady] = useState(hasHydrated)

  useEffect(() => {
    if (hasHydrated) {
      setReady(true)
      return
    }

    const unsub = useAppStore.persist.onFinishHydration(() => {
      setReady(true)
    })

    return unsub
  }, [hasHydrated])

  return {
    hasHydrated: ready,
    albumStatus,
    lastSavedAt,
    figureCount: figures.length,
  }
}
