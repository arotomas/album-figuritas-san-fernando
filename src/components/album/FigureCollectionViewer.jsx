import { useCallback, useEffect, useMemo, useState } from 'react'
import { m, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { FaChevronLeft, FaChevronRight, FaXmark } from 'react-icons/fa6'
import { getRarity } from '../../theme/rarity'
import { typeClasses } from '../../theme/typography'
import { RarityBadge } from '../ui/RarityBadge'
import { FigureChallengeCard } from './FigureChallengeCard'
import { RarityAmbience, getRarityFrameStyle } from './RarityAmbience'
import { vibrateAlbumSwipe } from '../../utils/vibration'

const DISMISS_THRESHOLD = 96

function formatCapturedAt(value) {
  if (!value) return null
  return new Date(value).toLocaleString('es-AR')
}

function FigureSlideContent({
  figure,
  collectionLabel,
  onRetakePhoto,
  onDeletePhoto,
  onClose,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const rarity = getRarity(figure?.rareza ?? figure?.rarity ?? 'común')
  const hasPhoto = Boolean(figure?.foto)
  const dragY = useMotionValue(0)
  const backdropOpacity = useTransform(dragY, [-40, 0, 160], [0.92, 1, 0.55])

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    onDeletePhoto?.(figure)
    setConfirmDelete(false)
    onClose?.()
  }

  return (
    <m.div
      className="relative flex h-full w-full max-w-md flex-col justify-end px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(3.5rem+env(safe-area-inset-top))]"
      style={{ y: dragY, opacity: backdropOpacity }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.18}
      onDragEnd={(_, info) => {
        if (info.offset.y > DISMISS_THRESHOLD || info.velocity.y > 520) {
          onClose?.()
        }
      }}
    >
      <div className="relative mx-auto w-full" onClick={(event) => event.stopPropagation()}>
        <div
          className={`relative overflow-hidden rounded-[1.6rem] border bg-gradient-to-b ${rarity.tailwind.gradient} p-3`}
          style={getRarityFrameStyle(figure.rareza)}
        >
          <RarityAmbience rareza={figure.rareza} />

          <div className="relative overflow-hidden rounded-[1.25rem] border border-white/12 bg-black/30 p-1.5">
            <m.div
              animate={{ y: [0, -3, 0] }}
              transition={{
                duration: Number.parseFloat(rarity.animation.floatDuration) || 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              {hasPhoto ? (
                <img
                  src={figure.foto}
                  alt={figure.nombre}
                  loading="eager"
                  decoding="async"
                  className="aspect-[3/4] w-full rounded-xl object-cover"
                />
              ) : (
                <div className="flex aspect-[3/4] items-center justify-center text-6xl">
                  {figure.emoji ?? '📍'}
                </div>
              )}
            </m.div>
          </div>
        </div>

        <div className="mt-4 space-y-3 rounded-[1.35rem] border border-white/10 bg-charcoal/92 px-4 py-4 backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`${typeClasses.micro} text-white/45`}>{collectionLabel}</p>
              <h2 className={`${typeClasses.headline} mt-1 truncate text-xl text-warm-white`}>
                {figure.nombre}
              </h2>
            </div>
            <RarityBadge rareza={figure.rareza} size="sm" />
          </div>

          <p className="text-sm font-semibold text-progress/90">Estado: Descubierta</p>

          {figure.obtenidaEn && (
            <p className="text-sm text-white/55">
              Capturada: {formatCapturedAt(figure.obtenidaEn)}
            </p>
          )}

          <FigureChallengeCard figure={figure} />

          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => onRetakePhoto?.(figure)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-progress px-4 py-3 text-sm font-black text-ink shadow-[0_0_24px_rgba(140,198,63,0.22)]"
            >
              <span aria-hidden>📸</span>
              Mejorar foto
            </button>

            {hasPhoto && onDeletePhoto && (
              <button
                type="button"
                onClick={handleDelete}
                className={`w-full rounded-2xl px-4 py-3 text-sm font-bold transition ${
                  confirmDelete
                    ? 'bg-red-500/90 text-white'
                    : 'border border-red-300/25 bg-red-500/10 text-red-100'
                }`}
              >
                {confirmDelete ? 'Confirmar eliminación' : 'Eliminar foto'}
              </button>
            )}
          </div>
        </div>
      </div>
    </m.div>
  )
}

export function FigureCollectionViewer({
  figures = [],
  activeFigureId,
  open,
  onClose,
  onRetakePhoto,
  onDeletePhoto,
  getCollectionLabel,
}) {
  const figureIds = useMemo(
    () => figures.map((figure) => String(figure.id)),
    [figures],
  )

  const initialIndex = useMemo(() => {
    const idx = figureIds.indexOf(String(activeFigureId))
    return idx >= 0 ? idx : 0
  }, [activeFigureId, figureIds])

  const [index, setIndex] = useState(initialIndex)
  const [direction, setDirection] = useState(0)

  useEffect(() => {
    if (!open) return
    setIndex(initialIndex)
    setDirection(0)
  }, [open, initialIndex])

  const figure = figures[index] ?? null
  const collectionLabel =
    getCollectionLabel?.(figure) ??
    (figure?.is_bonus ? 'Colección bonus' : 'Colección principal')

  const goTo = useCallback(
    (nextIndex, nextDirection) => {
      if (nextIndex < 0 || nextIndex >= figures.length) return
      setDirection(nextDirection)
      setIndex(nextIndex)
      vibrateAlbumSwipe()
    },
    [figures.length],
  )

  const goPrev = useCallback(() => goTo(index - 1, -1), [goTo, index])
  const goNext = useCallback(() => goTo(index + 1, 1), [goTo, index])

  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
      if (event.key === 'ArrowLeft') goPrev()
      if (event.key === 'ArrowRight') goNext()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goNext, goPrev, onClose, open])

  const slideVariants = {
    enter: (dir) => ({ opacity: 0, x: dir >= 0 ? 48 : -48, scale: 0.96 }),
    center: { opacity: 1, x: 0, scale: 1 },
    exit: (dir) => ({ opacity: 0, x: dir >= 0 ? -48 : 48, scale: 0.96 }),
  }

  return (
    <AnimatePresence>
      {open && figure && (
        <m.div
          className="fixed inset-0 z-[180] overflow-hidden bg-black/88 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`Figurita ${figure.nombre}`}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-4 top-[calc(0.75rem+env(safe-area-inset-top))] z-30 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm"
          >
            <FaXmark size={18} />
          </button>

          {figures.length > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  goPrev()
                }}
                disabled={index <= 0}
                aria-label="Figurita anterior"
                className="absolute left-3 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white/90 backdrop-blur-sm disabled:opacity-25"
              >
                <FaChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  goNext()
                }}
                disabled={index >= figures.length - 1}
                aria-label="Figurita siguiente"
                className="absolute right-3 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white/90 backdrop-blur-sm disabled:opacity-25"
              >
                <FaChevronRight size={16} />
              </button>
              <p className="pointer-events-none absolute inset-x-0 top-[calc(0.85rem+env(safe-area-inset-top))] z-20 text-center text-[11px] font-semibold tracking-wide text-white/45">
                {index + 1} / {figures.length}
              </p>
            </>
          )}

          <div
            className="flex h-full w-full touch-pan-y"
            onPointerUp={(event) => {
              if (figures.length <= 1) return
              const target = event.currentTarget
              const rect = target.getBoundingClientRect()
              const x = event.clientX - rect.left
              if (x < rect.width * 0.22) goPrev()
              else if (x > rect.width * 0.78) goNext()
            }}
          >
            <AnimatePresence custom={direction} mode="wait">
              <m.div
                key={figure.id}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="h-full w-full"
              >
                <FigureSlideContent
                  figure={figure}
                  collectionLabel={collectionLabel}
                  onRetakePhoto={onRetakePhoto}
                  onDeletePhoto={onDeletePhoto}
                  onClose={onClose}
                />
              </m.div>
            </AnimatePresence>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
