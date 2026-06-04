import { useCallback, useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import { syncAlbumUniverse } from '../utils/albumUniverseSync'
import {
  getActiveAlbumMeta,
  shouldShowAlbumSelector,
} from '../utils/resolveActiveAlbumId'

export function useActiveAlbum() {
  const publishedAlbums = useAppStore((state) => state.publishedAlbums)
  const activeAlbumId = useAppStore((state) => state.activeAlbumId)
  const albumUniverseLoading = useAppStore((state) => state.albumUniverseLoading)
  const setActiveAlbumId = useAppStore((state) => state.setActiveAlbumId)
  const setAlbumUniverseLoading = useAppStore((state) => state.setAlbumUniverseLoading)
  const acknowledgeAlbumSession = useAppStore((state) => state.acknowledgeAlbumSession)
  const replaceCatalogFromRemote = useAppStore((state) => state.replaceCatalogFromRemote)

  const activeAlbum = useMemo(
    () => getActiveAlbumMeta(publishedAlbums, activeAlbumId),
    [activeAlbumId, publishedAlbums],
  )

  const showSelector = useMemo(
    () => shouldShowAlbumSelector(publishedAlbums),
    [publishedAlbums],
  )

  const switchActiveAlbum = useCallback(
    async (nextAlbumId, { acknowledgeSession = false, forceCatalogSync = false } = {}) => {
      if (!nextAlbumId) return false

      const nextId = String(nextAlbumId)
      const sameAlbum = String(activeAlbumId) === nextId
      const shouldSyncCatalog =
        forceCatalogSync || !sameAlbum || useAppStore.getState().figures.length === 0

      setAlbumUniverseLoading(true)
      if (!sameAlbum) {
        setActiveAlbumId(nextId)
      }

      try {
        if (shouldSyncCatalog) {
          await syncAlbumUniverse(nextId, replaceCatalogFromRemote)
          useAppStore.setState({
            nearFigure: null,
            captureSession: null,
            activeTargetFigureId: null,
          })
        }
        if (acknowledgeSession) {
          acknowledgeAlbumSession()
        }
        return true
      } catch (error) {
        console.error('[active-album]', 'switch failed', {
          albumId: nextId,
          message: error?.message,
        })
        return false
      } finally {
        setAlbumUniverseLoading(false)
      }
    },
    [
      activeAlbumId,
      acknowledgeAlbumSession,
      replaceCatalogFromRemote,
      setActiveAlbumId,
      setAlbumUniverseLoading,
    ],
  )

  const playAlbum = useCallback(
    (albumId) =>
      switchActiveAlbum(albumId, {
        acknowledgeSession: true,
        forceCatalogSync: true,
      }),
    [switchActiveAlbum],
  )

  return {
    publishedAlbums,
    activeAlbumId,
    activeAlbum,
    showSelector,
    albumUniverseLoading,
    switchActiveAlbum,
    playAlbum,
  }
}
