import { motion, AnimatePresence } from 'framer-motion'
import { FaXmark } from 'react-icons/fa6'
import { ValidationRing } from './ValidationRing'
import { CaptureButton } from './CaptureButton'

export function CameraView({
  videoRef,
  figure,
  gpsProgress,
  isReady,
  isCapturing,
  onCapture,
  onClose,
}) {
  return (
    <div className="capture-screen relative flex min-h-dvh flex-col bg-black">
      {/* Video fullscreen */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Dark vignette overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />

      {/* Header */}
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
          <p className="text-xs font-medium text-white/90">
            {figure?.nombre}
          </p>
        </div>

        <div className="w-10" />
      </div>

      {/* Validation ring centered */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
        <ValidationRing progress={gpsProgress} isReady={isReady} />

        <AnimatePresence>
          {!isReady && !isCapturing && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-6 text-center text-sm text-white/70"
            >
              Mantenete quieto mientras validamos tu ubicación…
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Capture button */}
      <div className="safe-bottom relative z-10 flex flex-col items-center pb-10 pt-4">
        <CaptureButton
          disabled={!isReady || isCapturing}
          isReady={isReady}
          onCapture={onCapture}
        />
      </div>

      {/* Capturing flash */}
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
