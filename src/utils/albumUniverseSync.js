import { fetchPublishedAlbums } from '../services/supabase/albums'
import { fetchPublicFiguresForAlbum } from '../services/supabase/albumFigures'
import { fetchPublicFigures } from '../services/supabase/figures'
import { fetchAlbumCollectionsSafe } from '../services/supabase/collections'
import { fetchAlbumEventsSafe } from '../services/supabase/events'
import { setRemoteAlbumCollections } from './collectionRegistry'
import { setRemoteAlbumEvents } from './eventRegistry'
import {
  getActiveAlbumMeta,
  resolveActiveAlbumId,
} from './resolveActiveAlbumId'

/**
 * Carga catálogo + registries para un álbum.
 * Progreso user_figures no se toca aquí (merge en replaceCatalogFromRemote).
 */
export async function syncAlbumUniverse(albumId, replaceCatalogFromRemote) {
  let catalog = await fetchPublicFiguresForAlbum(albumId)

  if (catalog === null) {
    console.warn('[album-universe]', 'album_figures missing — legacy full catalog')
    catalog = await fetchPublicFigures()
  }

  replaceCatalogFromRemote(catalog ?? [])

  const collectionsResult = await fetchAlbumCollectionsSafe({ albumId })
  if (collectionsResult.collections) {
    setRemoteAlbumCollections(collectionsResult.collections, {
      reason: collectionsResult.reason,
      albumId,
    })
  }

  const eventsResult = await fetchAlbumEventsSafe()
  if (eventsResult.events) {
    setRemoteAlbumEvents(eventsResult.events, { reason: eventsResult.reason })
  }

  return {
    albumId,
    catalogCount: catalog?.length ?? 0,
    collectionsSource: collectionsResult.source,
  }
}

/**
 * Publica álbumes, resuelve activo y sincroniza universo.
 */
export async function bootstrapAlbumUniverse({
  replaceCatalogFromRemote,
  preferredAlbumId = null,
  setAlbumState,
}) {
  const publishedAlbums = await fetchPublishedAlbums()
  const multiAlbum = publishedAlbums.length > 1
  const activeAlbumId = resolveActiveAlbumId(publishedAlbums, preferredAlbumId)

  setAlbumState?.({ publishedAlbums, activeAlbumId })

  if (!activeAlbumId) {
    replaceCatalogFromRemote([])
    return { publishedAlbums, activeAlbumId: null, catalogCount: 0 }
  }

  if (multiAlbum) {
    replaceCatalogFromRemote([])
    console.info('[album-universe]', 'bootstrap deferred catalog (multi-album)', {
      activeAlbumId,
      publishedCount: publishedAlbums.length,
    })
    return {
      publishedAlbums,
      activeAlbumId,
      catalogCount: 0,
      catalogDeferred: true,
    }
  }

  const syncResult = await syncAlbumUniverse(activeAlbumId, replaceCatalogFromRemote)

  console.info('[album-universe]', 'bootstrap', {
    activeAlbumId,
    activeTitle: getActiveAlbumMeta(publishedAlbums, activeAlbumId)?.title ?? null,
    publishedCount: publishedAlbums.length,
    ...syncResult,
  })

  return {
    publishedAlbums,
    activeAlbumId,
    catalogCount: syncResult.catalogCount,
  }
}
