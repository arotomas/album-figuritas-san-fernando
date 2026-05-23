import { useCallback, useEffect, useMemo, useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6'
import { useAppStore, ALBUM_STATUS } from '../store/useAppStore'
import { AlbumBackground } from '../components/album/AlbumBackground'
import { AlbumProgress } from '../components/album/AlbumProgress'
import { FeaturedFigureCard } from '../components/album/FeaturedFigureCard'
import { FigureCarousel } from '../components/album/FigureCarousel'
import {
  AlbumFigureSkeleton,
  AlbumScreenSkeleton,
} from '../components/album/AlbumFigureSkeleton'
import { useCarouselPhysics } from '../hooks/useCarouselPhysics'
import { album, albumClasses } from '../theme/album'
import { typeClasses } from '../theme/typography'
import { vibrateAlbumSwipe } from '../utils/vibration'
import { isMobileDevice } from '../utils/device'
import {
  myFiguresLog,
  resolveActiveFigure,
  resolveActiveFigureId,
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

const mobileLayout = isMobileDevice()

export function MyFiguresScreen() {
  const rawFigures = useAppStore((state) => state.figures)
  const albumStatus = useAppStore((state) => state.albumStatus)
  const lastViewedFigureId = useAppStore((state) => state.lastViewedFigureId)
  const lastObtenidaFigureId = useAppStore((state) => state.lastObtenidaFigureId)
  const setLastViewedFigure = useAppStore((state) => state.setLastViewedFigure)
  const hasHydrated = useAppStore((state) => state._hasHydrated)

  const sanitizedFigures = useMemo(() => sanitizeAlbumFigures(rawFigures), [rawFigures])
  const mainProgress = useMemo(() => getMainProgressState(sanitizedFigures), [sanitizedFigures])
  const mainFigures = useMemo(() => getRevealedNormalFigures(sanitizedFigures), [sanitizedFigures])
  const bonusFigures = useMemo(() => getBonusFigures(sanitizedFigures), [sanitizedFigures])
  const [section, setSection] = useState('main')
  const isBonusSection = section === 'bonus'
  const figures = isBonusSection ? bonusFigures : mainFigures
  const hasSectionFigures = figures.length > 0
  const visibleProgress = isBonusSection
    ? bonusFigures.filter((figure) => figure.obtenida).length
    : mainProgress.obtained
  const visibleTotal = isBonusSection ? bonusFigures.length : mainProgress.visibleTotal

  const preferredId = lastObtenidaFigureId ?? lastViewedFigureId
  const initialActiveId = resolveActiveFigureId(preferredId, figures)

  const [activeId, setActiveId] = useState(initialActiveId)

  const activeFigure = useMemo(
    () => resolveActiveFigure(activeId, figures),
    [activeId, figures],
  )

  const handleSelect = useCallback(
    (figureId) => {
      if (!resolveActiveFigure(figureId, figures)) {
        myFiguresLog.warn('render guard — select ignored for missing figure', { figureId })
        return
      }

      if (figureId !== activeId) vibrateAlbumSwipe()
      setActiveId(figureId)
      setLastViewedFigure(figureId)
    },
    [activeId, figures, setLastViewedFigure],
  )

  const { activeIndex, dragX, dragProps, getStackStyle, goNext, goPrev } = useCarouselPhysics({
    items: figures,
    activeId: activeFigure?.id ?? activeId,
    onChange: handleSelect,
  })

  useEffect(() => {
    const nextId = resolveActiveFigureId(preferredId, figures)
    if (nextId != null && nextId !== activeId) {
      myFiguresLog.info('render guard — syncing active figure', {
        preferredId,
        nextId,
      })
      setActiveId(nextId)
    }
  }, [activeId, figures, preferredId])

  useEffect(() => {
    if (!activeFigure && figures.length > 0) {
      myFiguresLog.warn('render guard — active figure missing, resetting', {
        activeId,
        fallbackId: figures[0]?.id ?? null,
      })
      setActiveId(figures[0].id)
    }
  }, [activeFigure, activeId, figures])

  useEffect(() => {
    if (!activeFigure) return
    myFiguresLog.info('active photo source', {
      figureId: activeFigure.id,
      hasPhotoUrl: Boolean(activeFigure.foto?.startsWith('http')),
      photoUrl: activeFigure.foto?.startsWith('http') ? activeFigure.foto : null,
      hasLocalPhoto: Boolean(activeFigure.foto?.startsWith('data:')),
      imageUrl: activeFigure.foto ?? null,
    })
  }, [activeFigure])

  const visibleIndices = [
    activeIndex - 1,
    activeIndex,
    activeIndex + 1,
  ].filter((i) => i >= 0 && i < figures.length)

  const arrowButtonClass =
    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/70 bg-white/95 text-ink shadow-md disabled:pointer-events-none disabled:opacity-30 active:scale-95'

  if (!hasHydrated || sanitizedFigures.length === 0) {
    return <AlbumScreenSkeleton />
  }

  if (!activeFigure && hasSectionFigures) {
    return <AlbumScreenSkeleton />
  }

  return (
    <div className={`my-figures-screen relative flex h-full min-h-0 flex-col overflow-hidden ${isBonusSection ? 'album-bonus-mode' : ''}`}>
      <AlbumBackground rareza={activeFigure?.rareza ?? (isBonusSection ? 'legendaria' : 'común')} />

      <header className="my-figures-header relative z-10 shrink-0 px-6 pb-3 pt-4">
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

        <div className="mt-4">
          <AlbumProgress progress={mainProgress.obtained} total={mainProgress.visibleTotal} />
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-[1.25rem] border border-white/70 bg-white/55 p-1 shadow-sm backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setSection('main')}
              className={`rounded-2xl px-3 py-2 text-xs font-bold transition ${
                section === 'main' ? 'bg-progress text-ink shadow-md' : 'text-muted'
              }`}
            >
              <span className="block">Álbum principal</span>
              <span className="text-[10px] opacity-75">{mainProgress.obtained}/{mainProgress.visibleTotal}</span>
            </button>
            <button
              type="button"
              onClick={() => setSection('bonus')}
              className={`rounded-2xl px-3 py-2 text-xs font-bold transition ${
                section === 'bonus' ? 'bg-charcoal text-amber-100 shadow-md' : 'text-muted'
              }`}
            >
              <span className="block">Bonus</span>
              <span className="text-[10px] opacity-75">{bonusFigures.filter((figure) => figure.obtenida).length}/{bonusFigures.length}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="my-figures-scroll relative z-10 min-h-0 flex-1 scroll-y-app px-4">
        <div className="album-page-shell mx-auto flex min-h-full w-full max-w-[390px] flex-col items-center rounded-t-[2rem] px-3 pb-4 pt-3">
          <div className="mb-2 flex w-full items-center justify-between px-1">
            <div>
              <p className={`${typeClasses.micro} ${isBonusSection ? 'text-amber-200/80' : 'text-muted'}`}>
                {isBonusSection ? 'Sección secreta' : 'Página principal'}
              </p>
              <h2 className={`${typeClasses.headline} text-base ${isBonusSection ? 'text-amber-50' : 'text-ink'}`}>
                {isBonusSection ? 'Bonus' : 'Álbum principal'}
              </h2>
            </div>
            <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
              isBonusSection ? 'bg-amber-300/15 text-amber-100' : 'bg-progress/20 text-ink'
            }`}>
              {visibleProgress}/{visibleTotal || 0}
            </span>
          </div>

          {!hasSectionFigures ? (
            <div className="flex min-h-[360px] w-full flex-1 items-center justify-center rounded-[1.5rem] border border-dashed border-amber-200/25 bg-charcoal/90 p-6 text-center shadow-inner">
              <div>
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-amber-200/20 bg-amber-300/10 text-5xl text-amber-100/70 shadow-[0_0_40px_rgba(251,191,36,0.12)]">
                  ✦
                </div>
                <h3 className={`${typeClasses.headline} mt-5 text-lg text-amber-50`}>
                  Bonus ocultas
                </h3>
                <p className="mt-2 font-body text-sm leading-6 text-white/55">
                  Todavía no hay bonus reveladas. Cuando una épica o legendaria aparezca cerca,
                  la vas a ver acá.
                </p>
              </div>
            </div>
          ) : mobileLayout ? (
            <div className="flex w-full max-w-[360px] items-stretch gap-2">
              <button
                type="button"
                onClick={goPrev}
                disabled={activeIndex <= 0}
                aria-label="Figurita anterior"
                className={`${arrowButtonClass} self-center`}
              >
                <FaChevronLeft size={14} />
              </button>

              <m.div
                className="my-figures-card-slot min-w-0 flex-1"
                {...dragProps}
              >
                <FeaturedFigureCard
                  figure={activeFigure}
                  isNew={activeFigure.obtenida && activeFigure.id === lastObtenidaFigureId}
                  dragX={dragX}
                  compact
                />
              </m.div>

              <button
                type="button"
                onClick={goNext}
                disabled={activeIndex >= figures.length - 1}
                aria-label="Figurita siguiente"
                className={`${arrowButtonClass} self-center`}
              >
                <FaChevronRight size={14} />
              </button>
            </div>
          ) : (
            <div className="relative w-full max-w-[320px]">
              <button
                type="button"
                onClick={goPrev}
                disabled={activeIndex <= 0}
                aria-label="Figurita anterior"
                className={`${arrowButtonClass} absolute -left-12 top-1/2 z-30 -translate-y-1/2`}
              >
                <FaChevronLeft size={16} />
              </button>

              <button
                type="button"
                onClick={goNext}
                disabled={activeIndex >= figures.length - 1}
                aria-label="Figurita siguiente"
                className={`${arrowButtonClass} absolute -right-12 top-1/2 z-30 -translate-y-1/2`}
              >
                <FaChevronRight size={16} />
              </button>

              <div
                className="relative mx-auto w-full"
                style={{ perspective: album.featured.perspective, minHeight: 420 }}
              >
                {visibleIndices.map((index) => {
                  const figure = figures[index]
                  if (!figure) {
                    myFiguresLog.warn('render guard — skip null stack figure', { index })
                    return null
                  }

                  const style = getStackStyle(index)
                  const isActive = index === activeIndex

                  return (
                    <m.div
                      key={figure.id}
                      className="absolute inset-x-0 top-0"
                      animate={{
                        x: style.isActive ? undefined : style.x,
                        scale: style.scale,
                        opacity: style.opacity,
                        rotateY: style.rotateY,
                        zIndex: style.zIndex,
                        filter: style.filter,
                      }}
                      transition={album.transition.card}
                      {...(isActive ? dragProps : {})}
                      style={{ pointerEvents: style.pointerEvents }}
                    >
                      <FeaturedFigureCard
                        figure={figure}
                        isNew={figure.obtenida && figure.id === lastObtenidaFigureId}
                        dragX={isActive ? dragX : 0}
                      />
                    </m.div>
                  )
                })}
              </div>
            </div>
          )}

          {hasSectionFigures && <AnimatePresence mode="wait">
            <m.p
              key={activeFigure.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={album.transition.fade}
              className={`${albumClasses.hint} mt-3 shrink-0 px-2 text-center`}
            >
              {section === 'bonus' ? 'Bonus' : 'Álbum principal'} · slot {activeIndex + 1} de {figures.length} · {visibleProgress}/{visibleTotal}
            </m.p>
          </AnimatePresence>}
        </div>
      </div>

      <div className="my-figures-carousel-wrap safe-bottom relative z-10 shrink-0 border-t border-border/40 bg-warm-white/85 pb-1 backdrop-blur-sm">
        {hasSectionFigures && (
          <FigureCarousel
            figures={figures}
            activeId={activeFigure.id}
            lastObtenidaId={lastObtenidaFigureId}
            onSelect={handleSelect}
            compact={mobileLayout}
          />
        )}
      </div>
    </div>
  )
}
