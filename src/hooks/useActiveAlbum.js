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
    async (nextAlbumId) => {
      if (!nextAlbumId || String(nextAlbumId) === String(activeAlbumId)) return

      setAlbumUniverseLoading(true)
      setActiveAlbumId(String(nextAlbumId))

      try {
        await syncAlbumUniverse(String(nextAlbumId), replaceCatalogFromRemote)
        useAppStore.setState({
          nearFigure: null,
          captureSession: null,
          activeTargetFigureId: null,
        })
      } finally {
        setAlbumUniverseLoading(false)
      }
    },
    [
      activeAlbumId,
      replaceCatalogFromRemote,
      setActiveAlbumId,
      setAlbumUniverseLoading,
    ],
  )

  return {
    publishedAlbums,
    activeAlbumId,
    activeAlbum,
    showSelector,
    albumUniverseLoading,
    switchActiveAlbum,
  }
}
