/**
 * Elige el álbum activo entre publicados.
 * - 0 álbumes → null
 * - 1 álbum → ese id (sin selector UI)
 * - N álbumes → preferido persistido si válido, si no is_default, si no el primero
 */
export function resolveActiveAlbumId(publishedAlbums, preferredAlbumId = null) {
  const albums = Array.isArray(publishedAlbums) ? publishedAlbums : []
  if (albums.length === 0) return null

  const ids = new Set(albums.map((album) => String(album.id)))

  if (preferredAlbumId && ids.has(String(preferredAlbumId))) {
    return String(preferredAlbumId)
  }

  const defaultAlbum = albums.find((album) => album.isDefault)
  if (defaultAlbum) return String(defaultAlbum.id)

  return String(albums[0].id)
}

export function shouldShowAlbumSelector(publishedAlbums) {
  return Array.isArray(publishedAlbums) && publishedAlbums.length > 1
}

/** Pantalla inicial de elección (al menos un álbum y aún no eligió en esta sesión). */
export function needsAlbumSelectionScreen(publishedAlbums, albumSessionChosen = false) {
  const albums = Array.isArray(publishedAlbums) ? publishedAlbums : []
  return albums.length >= 1 && !albumSessionChosen
}

export function getActiveAlbumMeta(publishedAlbums, activeAlbumId) {
  if (!activeAlbumId) return null
  return (
    (Array.isArray(publishedAlbums) ? publishedAlbums : []).find(
      (album) => String(album.id) === String(activeAlbumId),
    ) ?? null
  )
}
