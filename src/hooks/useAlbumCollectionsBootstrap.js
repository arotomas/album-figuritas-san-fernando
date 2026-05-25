import { useEffect, useState } from 'react'
import { fetchAlbumCollectionsSafe } from '../services/supabase/collections'
import {
  getCollectionRegistryMeta,
  setRemoteAlbumCollections,
} from '../utils/collectionRegistry'

/** Carga colecciones remotas con fallback estático (admin + player). */
export function useAlbumCollectionsBootstrap(enabled = true) {
  const [meta, setMeta] = useState(() => getCollectionRegistryMeta())

  useEffect(() => {
    if (!enabled) return undefined

    let cancelled = false

    void fetchAlbumCollectionsSafe().then((result) => {
      if (cancelled) return
      if (result.collections) {
        setRemoteAlbumCollections(result.collections, { reason: result.reason })
      }
      setMeta(getCollectionRegistryMeta())
    })

    return () => {
      cancelled = true
    }
  }, [enabled])

  return meta
}
