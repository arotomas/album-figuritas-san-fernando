import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaXmark } from 'react-icons/fa6'
import { ValidationRing } from './ValidationRing'
import { RingProgressFeedback } from './RingProgressFeedback'
import { CaptureButton } from './CaptureButton'

export function CameraView({
  videoRef,
  fileInputRef,
  figure,
  gpsProgress,
  gpsAccuracy,
  isReady,
  isCapturing,
  useNativeFallback = false,
  fallbackMessage = null,
  inCaptureRange = false,
  proximityPhase = 'none',
  figureRarity = 'común',
  onCapture,
  onFileSelected,
  onUseNativeCamera,
  onClose,
}) {
  const localInputRef = useRef(null)
  const inputRef = fileInputRef ?? localInputRef
  const showEmbeddedPreview = !useNativeFallback

  return (
    <div className="capture-screen relative flex h-full flex-col overflow-hidden bg-black">
      {showEmbeddedPreview ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black" />
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          try {
            const file = event.target.files?.[0]
            if (file) onFileSelected?.(file)
          } catch (error) {
            console.warn('[CAPTURE] file input handler error', error?.message)
          } finally {
            event.target.value = ''
          }
        }}
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />

      <div className="safe-top relative z-10 flex items-center justify-between px-5 py-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar cámara"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
        >
          <FaXmark size={18} />
        </button>

        <div className="rounded-full bg-black/40 px-4 py-1.5 backdrop-blur-sm">
          <p className="text-xs font-medium text-white/90">{figure?.nombre}</p>
        </div>

        <div className="w-10" />
      </div>

      {useNativeFallback && fallbackMessage && (
        <div className="safe-top pointer-events-none absolute inset-x-0 top-[4.5rem] z-20 flex justify-center px-4">
          <p className="rounded-full bg-black/55 px-4 py-2 text-center text-[11px] leading-relaxed text-white/75 backdrop-blur-sm">
            {fallbackMessage}
          </p>
        </div>
      )}

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
        <ValidationRing
          progress={gpsProgress}
          isReady={isReady}
          proximityPhase={proximityPhase}
        />

        <RingProgressFeedback
          progress={gpsProgress}
          isReady={isReady}
          isCapturing={isCapturing}
        />

        {import.meta.env.DEV && gpsAccuracy != null && (
          <p className="mt-3 text-center text-[11px] text-progress/80">
            Precisión GPS: ~{Math.round(gpsAccuracy)}m
          </p>
        )}
      </div>

      <div className="safe-bottom relative z-10 flex flex-col items-center gap-3 pb-10 pt-4">
        <CaptureButton
          disabled={!isReady || isCapturing}
          isReady={isReady}
          onCapture={onCapture}
        />
        {!useNativeFallback && (
          <button
            type="button"
            onClick={onUseNativeCamera}
            className="min-h-[44px] rounded-full border border-white/25 bg-black/45 px-5 py-2 text-xs font-semibold text-white/90 backdrop-blur-sm"
          >
            Usar cámara del celular
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isCapturing && (
          <motion.div
            key="capture-flash"
            initial={{ opacity: 1 }}
            animate={{ opacity: [1, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.46, times: [0, 0.22, 1], ease: 'easeOut' }}
            className="pointer-events-none absolute inset-0 z-30 bg-white"
          />
        )}
      </AnimatePresence>
    </div>
  )
}
