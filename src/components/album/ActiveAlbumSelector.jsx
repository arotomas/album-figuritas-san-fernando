import { useActiveAlbum } from '../../hooks/useActiveAlbum'

const VARIANTS = {
  card: {
    wrapper: 'rounded-xl border border-border/60 bg-warm-white/95 px-3 py-2 shadow-sm',
    label: 'mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted',
    select:
      'w-full rounded-lg border border-border/70 bg-white px-2 py-1.5 font-display text-sm font-bold text-ink',
    readOnly:
      'w-full rounded-lg border border-border/50 bg-white/80 px-2 py-1.5 font-display text-sm font-bold text-ink',
  },
  header: {
    wrapper: 'flex min-w-0 flex-1 items-center gap-2 overflow-hidden',
    label: 'shrink-0 text-[10px] font-bold uppercase tracking-wide text-muted',
    select:
      'min-w-0 w-full max-w-full flex-1 truncate rounded-lg border border-border/60 bg-white px-2.5 py-1 font-display text-xs font-bold text-ink shadow-sm sm:text-sm',
    readOnly:
      'min-w-0 flex-1 truncate font-display text-xs font-bold text-ink sm:text-sm',
  },
}

/**
 * Selector de álbum activo — card (Mi Álbum) o header (layout principal).
 */
export function ActiveAlbumSelector({ className = '', variant = 'card' }) {
  const {
    publishedAlbums,
    activeAlbumId,
    activeAlbum,
    albumUniverseLoading,
    switchActiveAlbum,
  } = useActiveAlbum()

  const styles = VARIANTS[variant] ?? VARIANTS.card
  const selectId = variant === 'header' ? 'active-album-select-header' : 'active-album-select'
  const hasMultipleAlbums = Array.isArray(publishedAlbums) && publishedAlbums.length > 1
  const albumTitle = activeAlbum?.title?.trim()

  if (!albumTitle && !hasMultipleAlbums) return null

  return (
    <div className={`${styles.wrapper} ${className}`.trim()}>
      <label htmlFor={selectId} className={styles.label}>
        Álbum
      </label>
      {hasMultipleAlbums ? (
        <select
          id={selectId}
          value={activeAlbumId ?? ''}
          disabled={albumUniverseLoading}
          onChange={(event) => {
            void switchActiveAlbum(event.target.value, { acknowledgeSession: true })
          }}
          className={styles.select}
          aria-busy={albumUniverseLoading}
        >
          {publishedAlbums.map((album) => (
            <option key={album.id} value={album.id}>
              {album.title}
            </option>
          ))}
        </select>
      ) : (
        <p id={selectId} className={styles.readOnly} aria-label={`Álbum activo: ${albumTitle}`}>
          {albumTitle}
        </p>
      )}
    </div>
  )
}
