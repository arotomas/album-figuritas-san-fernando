import { useActiveAlbum } from '../../hooks/useActiveAlbum'

/**
 * Selector de álbum producto (San Fernando, Histórico, etc.).
 * Solo visible si hay más de un álbum published.
 */
export function ActiveAlbumSelector({ className = '', variant = 'map' }) {
  const {
    publishedAlbums,
    activeAlbumId,
    activeAlbum,
    showSelector,
    albumUniverseLoading,
    switchActiveAlbum,
  } = useActiveAlbum()

  if (!activeAlbum && publishedAlbums.length === 0) {
    return null
  }

  const baseClass =
    variant === 'album'
      ? 'rounded-xl border border-border/60 bg-warm-white/95 px-3 py-2 shadow-sm'
      : 'rounded-xl border border-white/20 bg-charcoal/85 px-3 py-2 text-white shadow-lg backdrop-blur-md'

  if (!showSelector) {
    if (!activeAlbum?.title) return null
    return (
      <div className={`${baseClass} ${className}`.trim()} aria-live="polite">
        <p
          className={
            variant === 'album'
              ? 'text-[10px] font-bold uppercase tracking-wide text-muted'
              : 'text-[10px] font-bold uppercase tracking-wide text-white/60'
          }
        >
          Álbum
        </p>
        <p
          className={
            variant === 'album'
              ? 'font-display text-sm font-bold text-ink'
              : 'font-display text-sm font-bold text-white'
          }
        >
          {activeAlbum.title}
        </p>
      </div>
    )
  }

  return (
    <div className={`${baseClass} ${className}`.trim()}>
      <label
        htmlFor="active-album-select"
        className={
          variant === 'album'
            ? 'mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted'
            : 'mb-1 block text-[10px] font-bold uppercase tracking-wide text-white/60'
        }
      >
        Álbum
      </label>
      <select
        id="active-album-select"
        value={activeAlbumId ?? ''}
        disabled={albumUniverseLoading}
        onChange={(event) => {
          void switchActiveAlbum(event.target.value)
        }}
        className={
          variant === 'album'
            ? 'w-full rounded-lg border border-border/70 bg-white px-2 py-1.5 font-display text-sm font-bold text-ink'
            : 'w-full rounded-lg border border-white/25 bg-black/40 px-2 py-1.5 font-display text-sm font-bold text-white'
        }
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
