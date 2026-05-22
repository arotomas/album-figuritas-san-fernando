import { useCallback, useEffect, useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6'
import { useAppStore, selectProgress, TOTAL_FIGURES, ALBUM_STATUS } from '../store/useAppStore'
import { AlbumBackground } from '../components/album/AlbumBackground'
import { AlbumProgress } from '../components/album/AlbumProgress'
import { FeaturedFigureCard } from '../components/album/FeaturedFigureCard'
import { FigureCarousel } from '../components/album/FigureCarousel'
import { useCarouselPhysics } from '../hooks/useCarouselPhysics'
import { album, albumClasses } from '../theme/album'
import { typeClasses } from '../theme/typography'
import { vibrateAlbumSwipe } from '../utils/vibration'

const STATUS_LABELS = {
  [ALBUM_STATUS.EN_PROGRESO]: 'En progreso',
  [ALBUM_STATUS.COMPLETADO]: 'Completado',
  [ALBUM_STATUS.EN_REVISION]: 'En revisión',
}

export function MyFiguresScreen() {
  const figures = useAppStore((state) => state.figures)
  const albumStatus = useAppStore((state) => state.albumStatus)
  const lastViewedFigureId = useAppStore((state) => state.lastViewedFigureId)
  const lastObtenidaFigureId = useAppStore((state) => state.lastObtenidaFigureId)
  const setLastViewedFigure = useAppStore((state) => state.setLastViewedFigure)
  const progress = useAppStore(selectProgress)

  const [activeId, setActiveId] = useState(lastViewedFigureId ?? figures[0]?.id)

  const activeFigure = figures.find((f) => f.id === activeId) ?? figures[0]

  const handleSelect = useCallback(
    (figureId) => {
      if (figureId !== activeId) vibrateAlbumSwipe()
      setActiveId(figureId)
      setLastViewedFigure(figureId)
    },
    [activeId, setLastViewedFigure],
  )

  const { activeIndex, dragX, dragProps, getStackStyle, goNext, goPrev } = useCarouselPhysics({
    items: figures,
    activeId,
    onChange: handleSelect,
  })

  useEffect(() => {
    if (lastViewedFigureId) setActiveId(lastViewedFigureId)
  }, [lastViewedFigureId])

  const visibleIndices = [
    activeIndex - 1,
    activeIndex,
    activeIndex + 1,
  ].filter((i) => i >= 0 && i < figures.length)

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <AlbumBackground rareza={activeFigure?.rareza} />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {/* Header */}
        <div className="px-6 pt-6">
          <div className="flex items-start justify-between gap-3">
            <div>
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

          <div className="mt-5">
            <AlbumProgress progress={progress} total={TOTAL_FIGURES} />
          </div>
        </div>

        {/* Featured stack */}
        <div className="relative mt-5 flex flex-1 flex-col justify-center px-6">
          <button
            type="button"
            onClick={goPrev}
            disabled={activeIndex <= 0}
            aria-label="Figurita anterior"
            className="pointer-events-auto absolute left-0 top-1/2 z-30 flex h-11 w-11 min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full border border-border/70 bg-white/90 text-ink shadow-md disabled:pointer-events-none disabled:opacity-30 active:scale-95"
          >
            <FaChevronLeft size={16} />
          </button>

          <button
            type="button"
            onClick={goNext}
            disabled={activeIndex >= figures.length - 1}
            aria-label="Figurita siguiente"
            className="pointer-events-auto absolute right-0 top-1/2 z-30 flex h-11 w-11 min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full border border-border/70 bg-white/90 text-ink shadow-md disabled:pointer-events-none disabled:opacity-30 active:scale-95"
          >
            <FaChevronRight size={16} />
          </button>

          <div
            className="relative mx-auto w-full max-w-[320px]"
            style={{ perspective: album.featured.perspective, minHeight: 420 }}
          >
            {visibleIndices.map((index) => {
              const figure = figures[index]
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

          <AnimatePresence mode="wait">
            <m.p
              key={activeFigure?.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={album.transition.fade}
              className={`${albumClasses.hint} mt-3 text-center`}
            >
              Deslizá o usá las flechas · {activeIndex + 1} de {figures.length}
            </m.p>
          </AnimatePresence>
        </div>

        {/* Thumbnail carousel */}
        <FigureCarousel
          figures={figures}
          activeId={activeId}
          lastObtenidaId={lastObtenidaFigureId}
          onSelect={handleSelect}
        />
      </div>
    </div>
  )
}
