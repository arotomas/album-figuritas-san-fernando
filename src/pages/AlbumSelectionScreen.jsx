import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { FigureStickerIcon } from '../components/album/FigureStickerIcon'
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

function AlbumProgressLine({ obtained, total }) {
  return (
    <p className="flex min-w-0 max-w-full items-center gap-1.5 whitespace-nowrap text-[11px] font-bold leading-none tabular-nums text-ink sm:text-xs">
      <FigureStickerIcon className="h-4 w-4 opacity-90" />
      <span className="min-w-0 truncate">
        {obtained} / {total} figuritas
      </span>
    </p>
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
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2.5 px-3 py-3 sm:px-4">
          <div className="min-w-0 pr-1">
            <h2 className="font-display text-lg font-bold leading-tight text-ink">
              {album.title}
            </h2>
            <p className="mt-1 font-body text-sm leading-snug text-muted line-clamp-2">
              {description}
            </p>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <AlbumProgressLine obtained={progress.obtained} total={progress.total} />
            <Button
              type="button"
              variant="progress"
              size="sm"
              className="!w-auto shrink-0 px-4 py-2 text-xs sm:text-sm"
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
      <div className="safe-x mx-auto w-full max-w-lg flex-1 px-5 py-5 sm:px-6 sm:py-6">
        <header className="mb-5 sm:mb-6">
          <h1 className="font-display text-xl font-bold text-ink">Elegí tu álbum</h1>
          <p className="mt-1 font-body text-sm text-muted">
            Cada álbum tiene su mapa y figuritas. Tu progreso en figuritas compartidas se
            mantiene entre álbumes.
          </p>
        </header>

        <div className="flex flex-col gap-4 sm:gap-5">
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
