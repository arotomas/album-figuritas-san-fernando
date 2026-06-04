import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { fetchAlbumCollectionsSafe } from '../services/supabase/collections'
import { fetchAlbumEventsSafe } from '../services/supabase/events'
import {
  getCollectionRegistryMeta,
  setRemoteAlbumCollections,
} from '../utils/collectionRegistry'
import { getEventRegistryMeta, setRemoteAlbumEvents } from '../utils/eventRegistry'
import { logUniverseBootstrap } from '../utils/universeDiagnostics'

/** Carga colecciones + eventos remotos con fallback estático (admin + player). */
export function useAlbumCollectionsBootstrap(enabled = true) {
  const activeAlbumId = useAppStore((state) => state.activeAlbumId)
  const [meta, setMeta] = useState(() => ({
    collections: getCollectionRegistryMeta(),
    events: getEventRegistryMeta(),
  }))

  useEffect(() => {
    if (!enabled || !activeAlbumId) return undefined

    let cancelled = false

    void Promise.all([
      fetchAlbumCollectionsSafe({ albumId: activeAlbumId }),
      fetchAlbumEventsSafe(),
    ]).then(
      ([collectionsResult, eventsResult]) => {
        if (cancelled) return
        if (collectionsResult.collections) {
          setRemoteAlbumCollections(collectionsResult.collections, {
            reason: collectionsResult.reason,
          })
        }
        if (eventsResult.events) {
          setRemoteAlbumEvents(eventsResult.events, { reason: eventsResult.reason })
        }
        setMeta({
          collections: getCollectionRegistryMeta(),
          events: getEventRegistryMeta(),
        })
        logUniverseBootstrap({
          collectionsMeta: getCollectionRegistryMeta(),
          eventsMeta: getEventRegistryMeta(),
        })
      },
    )

    return () => {
      cancelled = true
    }
  }, [activeAlbumId, enabled])

  return meta
}
