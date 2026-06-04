import { Navigate, useLocation } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { PLAYER_HOME_PATH } from '../utils/postAuthRedirect'

/** Un solo álbum published → ir directo al mapa. */
export function AlbumSelectionRoute({ children }) {
  const publishedAlbums = useAppStore((state) => state.publishedAlbums)
  const location = useLocation()

  if (!Array.isArray(publishedAlbums) || publishedAlbums.length <= 1) {
    return (
      <Navigate to={`${PLAYER_HOME_PATH}${location.search}`} replace />
    )
  }

  return children
}
