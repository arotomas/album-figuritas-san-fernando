import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { useActiveAlbum } from '../hooks/useActiveAlbum'
import { useAppStore } from '../store/useAppStore'
import { fetchAlbumFigureMemberships } from '../services/supabase/albumFigures'
import { countAlbumProgressFromMemberships } from '../utils/albumSelectionProgress'
import { useQaMode } from '../utils/qaMode'
import { PLAYER_HOME_PATH } from '../utils/postAuthRedirect'

function AlbumCover({ album }) {
  const src = album?.coverImage
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />
    )
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-surface px-2 text-center">
      <span className="font-body text-[11px] leading-snug text-muted">
        Foto destacada del álbum
      </span>
    </div>
  )
}

function AlbumSelectionCard({ album, progress, loading, onPlay }) {
  const description =
    album.description?.trim() ||
    album.subtitle?.trim() ||
    'Explorá el mapa y completá tu colección.'

  return (
    <article className="overflow-hidden rounded-2xl border border-border/70 bg-warm-white shadow-[0_4px_18px_rgba(17,17,19,0.06)]">
      <div className="flex min-h-[7.5rem]">
        <div className="w-[34%] shrink-0 border-r border-border/50 bg-surface">
          <AlbumCover album={album} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 px-4 py-3">
          <div>
            <h2 className="font-display text-lg font-bold leading-tight text-ink">
              {album.title}
            </h2>
            <p className="mt-1 font-body text-sm leading-snug text-muted line-clamp-2">
              {description}
            </p>
          </div>
          <div className="flex items-end justify-between gap-3">
            <p className="text-sm font-bold tabular-nums text-ink">
              {progress.obtained}
              <span className="font-normal text-muted"> / {progress.total}</span>
            </p>
            <Button
              type="button"
              size="sm"
              className="shrink-0 px-4"
              disabled={loading}
              onClick={() => onPlay(album.id)}
            >
              Jugar
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}

export function AlbumSelectionScreen() {
  const navigate = useNavigate()
  const { withQa } = useQaMode()
  const { publishedAlbums, albumUniverseLoading, playAlbum } = useActiveAlbum()
  const progressRecords = useAppStore((state) => state._figureProgressRecords)
  const figures = useAppStore((state) => state.figures)
  const [progressByAlbumId, setProgressByAlbumId] = useState({})
  const [loadingProgress, setLoadingProgress] = useState(true)

  const mergedProgressRecords = useMemo(() => {
    const byId = new Map()
    for (const record of [...progressRecords, ...figures]) {
      if (record?.id == null) continue
      byId.set(String(record.id), record)
    }
    return [...byId.values()]
  }, [figures, progressRecords])

  useEffect(() => {
    let cancelled = false

    async function loadProgress() {
      setLoadingProgress(true)
      const next = {}

      await Promise.all(
        publishedAlbums.map(async (album) => {
          try {
            const memberships = await fetchAlbumFigureMemberships(album.id)
            next[album.id] = countAlbumProgressFromMemberships(
              memberships,
              mergedProgressRecords,
            )
          } catch (error) {
            console.warn('[album-selection]', 'progress load failed', {
              albumId: album.id,
              message: error?.message,
            })
            next[album.id] = { obtained: 0, total: 0 }
          }
        }),
      )

      if (!cancelled) {
        setProgressByAlbumId(next)
        setLoadingProgress(false)
      }
    }

    if (publishedAlbums.length === 0) {
      setProgressByAlbumId({})
      setLoadingProgress(false)
      return undefined
    }

    void loadProgress()
    return () => {
      cancelled = true
    }
  }, [mergedProgressRecords, publishedAlbums])

  const handlePlay = useCallback(
    async (albumId) => {
      const ok = await playAlbum(albumId)
      if (ok) {
        navigate(withQa(PLAYER_HOME_PATH), { replace: true })
      }
    },
    [navigate, playAlbum, withQa],
  )

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-white">
      <div className="safe-x mx-auto w-full max-w-lg flex-1 px-4 py-5">
        <header className="mb-5">
          <h1 className="font-display text-xl font-bold text-ink">Elegí tu álbum</h1>
          <p className="mt-1 font-body text-sm text-muted">
            Cada álbum tiene su mapa y figuritas. Tu progreso en figuritas compartidas se
            mantiene entre álbumes.
          </p>
        </header>

        <div className="flex flex-col gap-4">
          {publishedAlbums.map((album) => (
            <AlbumSelectionCard
              key={album.id}
              album={album}
              progress={progressByAlbumId[album.id] ?? { obtained: 0, total: 0 }}
              loading={albumUniverseLoading || loadingProgress}
              onPlay={handlePlay}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
