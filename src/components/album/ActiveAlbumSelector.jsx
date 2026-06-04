import { useActiveAlbum } from '../../hooks/useActiveAlbum'

/**
 * Selector de álbum en Mi Álbum (cambio entre álbumes published).
 */
export function ActiveAlbumSelector({ className = '' }) {
  const {
    publishedAlbums,
    activeAlbumId,
    albumUniverseLoading,
    switchActiveAlbum,
  } = useActiveAlbum()

  if (!Array.isArray(publishedAlbums) || publishedAlbums.length <= 1) {
    return null
  }

  return (
    <div
      className={`rounded-xl border border-border/60 bg-warm-white/95 px-3 py-2 shadow-sm ${className}`.trim()}
    >
      <label
        htmlFor="active-album-select"
        className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted"
      >
        Álbum
      </label>
      <select
        id="active-album-select"
        value={activeAlbumId ?? ''}
        disabled={albumUniverseLoading}
        onChange={(event) => {
          void switchActiveAlbum(event.target.value, { acknowledgeSession: true })
        }}
        className="w-full rounded-lg border border-border/70 bg-white px-2 py-1.5 font-display text-sm font-bold text-ink"
        aria-busy={albumUniverseLoading}
      >
        {publishedAlbums.map((album) => (
          <option key={album.id} value={album.id}>
            {album.title}
          </option>
        ))}
      </select>
    </div>
  )
}
