import { Navigate, useLocation } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { needsAlbumSelectionScreen } from '../utils/resolveActiveAlbumId'
import { ALBUM_SELECTION_PATH } from '../utils/postAuthRedirect'

/** Bloquea /map hasta elegir álbum cuando hay varios published. */
export function RequireAlbumChoiceRoute({ children }) {
  const publishedAlbums = useAppStore((state) => state.publishedAlbums)
  const albumSessionChosen = useAppStore((state) => state.albumSessionChosen)
  const location = useLocation()

  if (
    needsAlbumSelectionScreen(publishedAlbums, albumSessionChosen)
  ) {
    return (
      <Navigate
        to={`${ALBUM_SELECTION_PATH}${location.search}`}
        replace
      />
    )
  }

  return children
}
