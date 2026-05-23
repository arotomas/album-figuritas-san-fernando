import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaXmark } from 'react-icons/fa6'
import { ValidationRing } from './ValidationRing'
import { CaptureButton } from './CaptureButton'

export function CameraView({
  videoRef,
  fileInputRef,
  figure,
  gpsProgress,
  gpsAccuracy,
  isReady,
  isCapturing,
  nativeOnly = false,
  useNativeFallback = false,
  showBlackPreviewFallback = false,
  inCaptureRange = false,
  distanceMeters = null,
  onCapture,
  onFileSelected,
  onUseNativeCamera,
  onClose,
}) {
  const localInputRef = useRef(null)
  const inputRef = fileInputRef ?? localInputRef
  const showNativeUi = nativeOnly || useNativeFallback
  const showSecondaryNativeButton = !nativeOnly && !useNativeFallback

  return (
    <div className="capture-screen relative flex h-full flex-col overflow-hidden bg-black">
      {!showNativeUi && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {showNativeUi && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 px-8 text-center">
          <p className="text-lg font-semibold text-white">
            {nativeOnly ? 'Sacá la foto' : 'Cámara del celular'}
          </p>
          <p className="mt-2 text-sm text-white/60">
            {nativeOnly
              ? 'Tocá capturar para abrir la cámara y desbloquear la figurita.'
              : showBlackPreviewFallback
                ? 'La vista previa web no funcionó. Usá la cámara nativa para sacar la foto.'
                : 'Tocá capturar para abrir la cámara nativa.'}
          </p>
        </div>
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

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
        <ValidationRing progress={gpsProgress} isReady={isReady} />

        <AnimatePresence>
          {!isReady && !isCapturing && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-6 max-w-xs px-6 text-center text-sm text-white/70"
            >
              {inCaptureRange
                ? 'Sacá una foto del lugar para desbloquear la figurita.'
                : distanceMeters != null
                  ? `Acercate al punto (~${Math.round(distanceMeters)}m).`
                  : 'Esperando ubicación para habilitar la captura…'}
            </motion.p>
          )}
        </AnimatePresence>

        {import.meta.env.DEV && gpsAccuracy != null && (
          <p className="mt-3 text-center text-[11px] text-lime-300/80">
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
        {showSecondaryNativeButton && (
          <button
            type="button"
            onClick={onUseNativeCamera}
            className="min-h-[44px] rounded-full border border-white/25 bg-black/45 px-5 py-2 text-xs font-semibold text-white/90 backdrop-blur-sm"
          >
            Usar cámara del celular
          </button>
        )}
      </div>

      <AnimatePresence>
        {isCapturing && (
          <motion.div
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="pointer-events-none absolute inset-0 z-30 bg-white"
          />
        )}
      </AnimatePresence>
    </div>
  )
}
