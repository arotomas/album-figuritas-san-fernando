import { useCallback, useEffect, useMemo } from 'react'
import { m } from 'framer-motion'
import { useAppStore, ALBUM_STATUS } from '../store/useAppStore'
import { AlbumBackground } from '../components/album/AlbumBackground'
import { AlbumProgress } from '../components/album/AlbumProgress'
import { AlbumScreenSkeleton } from '../components/album/AlbumFigureSkeleton'
import { LockedFigureCard } from '../components/album/LockedFigureCard'
import { NewBadge } from '../components/album/NewBadge'
import { RarityBadge } from '../components/ui/RarityBadge'
import { albumClasses } from '../theme/album'
import { getRarity } from '../theme/rarity'
import { typeClasses } from '../theme/typography'
import { vibrateAlbumSwipe } from '../utils/vibration'
import {
  myFiguresLog,
  sanitizeAlbumFigures,
} from '../utils/myFiguresLog'
import {
  getBonusFigures,
  getMainProgressState,
  getRevealedNormalFigures,
} from '../utils/figureGameRules'

const STATUS_LABELS = {
  [ALBUM_STATUS.EN_PROGRESO]: 'En progreso',
  [ALBUM_STATUS.COMPLETADO]: 'Completado',
  [ALBUM_STATUS.EN_REVISION]: 'En revisión',
}

function ProgressDots({ progress, total }) {
  return (
    <div className="mt-3 flex items-center gap-1.5" aria-label={`${progress} de ${total} descubiertas`}>
      {Array.from({ length: total }).map((_, index) => {
        const filled = index < progress
        return (
          <span
            key={index}
            className={`h-2.5 w-2.5 rounded-full border transition ${
              filled
                ? 'border-progress bg-progress shadow-[0_0_12px_rgba(140,198,63,0.45)]'
                : 'border-ink/15 bg-white/70'
            }`}
          />
        )
      })}
    </div>
  )
}

function AlbumSlotCard({ figure, isNew, onSelect }) {
  const rarity = getRarity(figure.rareza)
  const obtained = Boolean(figure.obtenida)
  const isBonus = Boolean(figure.is_bonus)
  const photo = figure.foto

  return (
    <m.button
      type="button"
      layout={false}
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(figure.id)}
      className={`album-slot-card ${obtained ? 'album-slot-obtained' : 'album-slot-locked'} ${
        isBonus ? 'album-slot-bonus' : ''
      } relative overflow-hidden rounded-[1.35rem] border-2 text-left ${rarity.tailwind.border}`}
      style={{
        boxShadow: obtained
          ? `0 12px 28px rgba(17,17,19,0.14), ${rarity.cssGlow}`
          : undefined,
      }}
    >
      <div className={`h-1 w-full ${rarity.tailwind.accent}`} />

      {obtained ? (
        <>
          <div className={`relative bg-gradient-to-b ${rarity.tailwind.gradient}`}>
            <div className="absolute left-2 top-2 z-20">
              <RarityBadge rareza={figure.rareza} size="sm" />
            </div>
            {isNew && (
              <span className="absolute right-2 top-2 z-20">
                <NewBadge />
              </span>
            )}
            <div className="relative aspect-[3/4] p-2.5">
              <div className={`h-full overflow-hidden rounded-2xl border ${rarity.tailwind.border} bg-black/25 p-1`}>
                {photo ? (
                  <img
                    src={photo}
                    alt={figure.nombre}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full rounded-xl object-cover"
                    onError={(event) => {
                      myFiguresLog.warn('missing photo fallback', {
                        figureId: figure.id,
                        reason: 'grid-image-load-error',
                        src: photo,
                      })
                      event.currentTarget.style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center rounded-xl bg-charcoal text-4xl">
                    {figure.emoji}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="bg-white/95 px-3 pb-3 pt-2">
            <p className="line-clamp-2 min-h-[2rem] font-display text-sm font-black leading-tight text-ink">
              {figure.nombre}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted">
              Descubierta
            </p>
          </div>
        </>
      ) : (
        <>
          <LockedFigureCard figure={figure} variant="thumb" className="rounded-none" />
          <div className="bg-charcoal px-3 pb-3 pt-2">
            <p className="font-display text-sm font-black text-white/75">????</p>
            <p className="mt-1 text-[10px] leading-4 text-white/45">
              {isBonus
                ? 'Se revela cuando algo especial esté cerca.'
                : 'Se revela al completar más figuritas.'}
            </p>
            <div className="mt-2 opacity-75">
              <RarityBadge rareza={figure.rareza} size="sm" />
            </div>
          </div>
        </>
      )}
    </m.button>
  )
}

export function MyFiguresScreen() {
  const rawFigures = useAppStore((state) => state.figures)
  const albumStatus = useAppStore((state) => state.albumStatus)
  const lastObtenidaFigureId = useAppStore((state) => state.lastObtenidaFigureId)
  const setLastViewedFigure = useAppStore((state) => state.setLastViewedFigure)
  const nearFigure = useAppStore((state) => state.nearFigure)
  const hasHydrated = useAppStore((state) => state._hasHydrated)

  const sanitizedFigures = useMemo(() => sanitizeAlbumFigures(rawFigures), [rawFigures])
  const mainProgress = useMemo(() => getMainProgressState(sanitizedFigures), [sanitizedFigures])
  const mainFigures = useMemo(() => getRevealedNormalFigures(sanitizedFigures), [sanitizedFigures])
  const bonusFigures = useMemo(() => getBonusFigures(sanitizedFigures), [sanitizedFigures])
  const visibleBonusFigures = useMemo(
    () =>
      bonusFigures.filter(
        (figure) =>
          figure.obtenida ||
          !figure.is_hidden ||
          (nearFigure?.is_bonus && String(nearFigure.id) === String(figure.id)),
      ),
    [bonusFigures, nearFigure],
  )
  const nextMissionFigure = mainFigures.find((figure) => !figure.obtenida) ?? null
  const lastObtainedFigure = sanitizedFigures.find(
    (figure) => figure.id === lastObtenidaFigureId,
  )
  const featuredRarity = nearFigure?.rareza ?? lastObtainedFigure?.rareza ?? nextMissionFigure?.rareza

  const handleSelect = useCallback(
    (figureId) => {
      const selected = sanitizedFigures.find((figure) => String(figure.id) === String(figureId))
      if (!selected) {
        myFiguresLog.warn('render guard — select ignored for missing figure', { figureId })
        return
      }

      vibrateAlbumSwipe()
      setLastViewedFigure(figureId)
    },
    [sanitizedFigures, setLastViewedFigure],
  )

  useEffect(() => {
    const activeFigure = sanitizedFigures.find((figure) => figure.id === lastObtenidaFigureId)
    if (!activeFigure) return
    myFiguresLog.info('active photo source', {
      figureId: activeFigure.id,
      hasPhotoUrl: Boolean(activeFigure.foto?.startsWith('http')),
      photoUrl: activeFigure.foto?.startsWith('http') ? activeFigure.foto : null,
      hasLocalPhoto: Boolean(activeFigure.foto?.startsWith('data:')),
      imageUrl: activeFigure.foto ?? null,
    })
  }, [lastObtenidaFigureId, sanitizedFigures])

  if (!hasHydrated || sanitizedFigures.length === 0) {
    return <AlbumScreenSkeleton />
  }

  return (
    <div className="my-figures-screen relative flex h-full min-h-0 flex-col overflow-hidden">
      <AlbumBackground rareza={featuredRarity ?? 'común'} />

      <header className="my-figures-header relative z-10 shrink-0 px-5 pb-3 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={albumClasses.headerEyebrow}>Tu colección</p>
            <h1 className={`${typeClasses.display} mt-1 text-xl text-ink`}>
              Álbum de figuritas
            </h1>
            <p className="mt-1 font-body text-sm text-muted">
              San Fernando · Colección del jugador
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-border/80 bg-white/70 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-muted backdrop-blur-sm">
            {STATUS_LABELS[albumStatus] ?? albumStatus}
          </span>
        </div>

        <div className="album-mission-card mt-4 rounded-[1.5rem] border border-white/70 bg-white/72 p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className={`${typeClasses.micro} text-muted`}>Progreso principal</p>
              <p className={`${typeClasses.display} mt-1 text-2xl text-ink`}>
                {mainProgress.obtained} de {mainProgress.total} descubiertas
              </p>
            </div>
            <span className="rounded-full bg-progress px-3 py-1 text-xs font-black text-ink shadow-[0_0_18px_rgba(140,198,63,0.28)]">
              {mainProgress.obtained}/{mainProgress.visibleTotal}
            </span>
          </div>
          <AlbumProgress progress={mainProgress.obtained} total={mainProgress.visibleTotal} />
          <ProgressDots progress={mainProgress.obtained} total={mainProgress.total} />
          <div className="mt-4 rounded-2xl border border-border/60 bg-warm-white/80 px-3 py-2.5">
            <p className={`${typeClasses.micro} text-muted`}>Próxima misión</p>
            <p className="mt-1 font-body text-sm font-bold text-ink">
              {nearFigure
                ? `${nearFigure.nombre} • ${Math.round(nearFigure.distanceMeters ?? 0)}m`
                : nextMissionFigure
                  ? `Próxima figurita disponible: ${nextMissionFigure.nombre}`
                  : 'Explorá el mapa para encontrar bonus especiales.'}
            </p>
          </div>
        </div>
      </header>

      <div className="my-figures-scroll safe-bottom relative z-10 min-h-0 flex-1 scroll-y-app px-4 pb-5">
        <section className="album-page-shell mx-auto w-full max-w-[720px] rounded-[2rem] px-3 py-4 sm:px-5">
          <div className="mb-4 flex items-center justify-between px-1">
            <div>
              <p className={`${typeClasses.micro} text-muted`}>Página principal</p>
              <h2 className={`${typeClasses.headline} text-lg text-ink`}>Álbum principal</h2>
            </div>
            <span className="rounded-full bg-progress/20 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-ink">
              {mainProgress.obtained}/{mainProgress.total}
            </span>
          </div>

          <div className="album-slot-grid grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {mainFigures.map((figure) => (
              <AlbumSlotCard
                key={figure.id}
                figure={figure}
                isNew={figure.obtenida && figure.id === lastObtenidaFigureId}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </section>

        <section className="album-page-shell album-secret-page mx-auto mt-4 w-full max-w-[720px] rounded-[2rem] px-3 py-4 sm:px-5">
          <div className="mb-4 flex items-center justify-between px-1">
            <div>
              <p className={`${typeClasses.micro} text-amber-200/80`}>Sección secreta</p>
              <h2 className={`${typeClasses.headline} text-lg text-amber-50`}>Bonus</h2>
            </div>
            {visibleBonusFigures.length > 0 && (
              <span className="rounded-full bg-amber-300/15 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-amber-100">
                {visibleBonusFigures.filter((figure) => figure.obtenida).length}/{visibleBonusFigures.length}
              </span>
            )}
          </div>

          {visibleBonusFigures.length > 0 ? (
            <div className="album-slot-grid grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {visibleBonusFigures.map((figure) => (
                <AlbumSlotCard
                  key={figure.id}
                  figure={figure}
                  isNew={figure.obtenida && figure.id === lastObtenidaFigureId}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-amber-200/20 bg-charcoal/82 p-6 text-center shadow-inner">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-amber-200/20 bg-amber-300/10 text-4xl text-amber-100/70 shadow-[0_0_42px_rgba(251,191,36,0.14)]">
                ✦
              </div>
              <h3 className={`${typeClasses.headline} mt-5 text-lg text-amber-50`}>
                Hay secretos escondidos en San Fernando
              </h3>
              <p className="mt-2 font-body text-sm leading-6 text-white/55">
                Algunas figuritas épicas y legendarias solo aparecen cuando explorás lugares especiales.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
