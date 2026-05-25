import { FaXmark } from 'react-icons/fa6'
import { ValidationRing } from './ValidationRing'
import { RingProgressFeedback } from './RingProgressFeedback'

export function NativeCapturePanel({
  figure,
  fileInputRef,
  isProcessing,
  processingMessage,
  isOpening,
  captureError,
  gpsProgress = 0,
  isReady = false,
  inCaptureRange = false,
  proximityPhase = 'none',
  figureRarity = 'común',
  onFileSelected,
  onRetry,
  onClose,
}) {
  return (
    <div className="safe-top safe-bottom relative flex h-full flex-col overflow-hidden bg-black">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />

      <div className="relative z-10 flex items-center justify-between px-5 py-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Volver al mapa"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
        >
          <FaXmark size={18} />
        </button>

        <div className="rounded-full bg-black/40 px-4 py-1.5 backdrop-blur-sm">
          <p className="text-xs font-medium text-white/90">{figure?.nombre ?? 'Captura'}</p>
        </div>

        <div className="w-10" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        {!isProcessing && !captureError && (
          <>
            <ValidationRing
              progress={gpsProgress}
              isReady={isReady}
              proximityPhase={proximityPhase}
              rarity={figureRarity}
            />
            <RingProgressFeedback
              progress={gpsProgress}
              isReady={isReady}
              isCapturing={isProcessing}
            />
          </>
        )}

        {isProcessing && (
          <>
            <div className="map-skeleton-pulse h-12 w-12 rounded-full border-2 border-progress/40 border-t-progress" />
            <p className="mt-4 text-sm font-medium text-white/85">
              {processingMessage ?? 'Procesando foto…'}
            </p>
          </>
        )}

        {captureError && (
          <>
            <p className="max-w-xs text-sm text-red-200">{captureError}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 min-h-[44px] rounded-full bg-white/10 px-5 py-2 text-xs font-bold uppercase text-white"
            >
              Reintentar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 min-h-[44px] text-xs font-semibold text-white/75 underline"
            >
              Volver al mapa
            </button>
          </>
        )}
      </div>

      <div className="safe-bottom relative z-10 px-6 pb-8">
        {!isProcessing && !captureError && isOpening && (
          <p className="text-center text-xs text-white/55">Abriendo cámara…</p>
        )}
      </div>

      <input
        ref={fileInputRef}
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
    </div>
  )
}
