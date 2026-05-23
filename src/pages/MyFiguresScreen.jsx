import { useCallback, useEffect, useMemo, useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6'
import { useAppStore, selectProgress, TOTAL_FIGURES, ALBUM_STATUS } from '../store/useAppStore'
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
  const progress = useAppStore(selectProgress)

  const figures = useMemo(() => sanitizeAlbumFigures(rawFigures), [rawFigures])

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
    myFiguresLog.info('photo source', {
      figureId: activeFigure.id,
      source: activeFigure.foto?.startsWith('http')
        ? 'supabase-photo_url'
        : activeFigure.foto?.startsWith('data:')
          ? 'local-data-url'
          : 'none',
      hasPhoto: Boolean(activeFigure.foto),
    })
  }, [activeFigure])

  const visibleIndices = [
    activeIndex - 1,
    activeIndex,
    activeIndex + 1,
  ].filter((i) => i >= 0 && i < figures.length)

  const arrowButtonClass =
    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/70 bg-white/95 text-ink shadow-md disabled:pointer-events-none disabled:opacity-30 active:scale-95'

  if (!hasHydrated || figures.length === 0) {
    return <AlbumScreenSkeleton />
  }

  if (!activeFigure) {
    return <AlbumScreenSkeleton />
  }

  return (
    <div className="my-figures-screen relative flex h-full min-h-0 flex-col overflow-hidden">
      <AlbumBackground rareza={activeFigure.rareza} />

      <header className="my-figures-header relative z-10 shrink-0 px-6 pb-3 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={albumClasses.headerEyebrow}>Tu colección</p>
            <h1 className={`${typeClasses.display} mt-1 text-xl text-ink`}>
              Mis figuritas
            </h1>
            <p className="mt-1 font-body text-sm text-muted">
              San Fernando · Álbum digital
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-border/80 bg-white/70 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-muted backdrop-blur-sm">
            {STATUS_LABELS[albumStatus] ?? albumStatus}
          </span>
        </div>

        <div className="mt-4">
          <AlbumProgress progress={progress} total={TOTAL_FIGURES} />
        </div>
      </header>

      <div className="my-figures-scroll relative z-10 min-h-0 flex-1 scroll-y-app px-4">
        <div className="my-figures-featured flex flex-col items-center py-2">
          {mobileLayout ? (
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

          <AnimatePresence mode="wait">
            <m.p
              key={activeFigure.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={album.transition.fade}
              className={`${albumClasses.hint} mt-3 shrink-0 px-2 text-center`}
            >
              Deslizá o usá las flechas · {activeIndex + 1} de {figures.length}
            </m.p>
          </AnimatePresence>
        </div>
      </div>

      <div className="my-figures-carousel-wrap relative z-10 shrink-0 border-t border-border/40 bg-warm-white/80 backdrop-blur-sm">
        <FigureCarousel
          figures={figures}
          activeId={activeFigure.id}
          lastObtenidaId={lastObtenidaFigureId}
          onSelect={handleSelect}
          compact={mobileLayout}
        />
      </div>
    </div>
  )
}
