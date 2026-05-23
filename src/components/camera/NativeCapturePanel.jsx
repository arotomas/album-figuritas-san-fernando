import { FaXmark } from 'react-icons/fa6'

export function NativeCapturePanel({
  figure,
  fileInputRef,
  isProcessing,
  inCaptureRange,
  distanceMeters,
  gpsStatusLabel,
  captureError,
  onFileSelected,
  onRetry,
  onClose,
}) {
  return (
    <div className="safe-top safe-bottom screen-full flex flex-col bg-warm-white px-6 py-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar captura"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-ink shadow-sm"
        >
          <FaXmark size={18} />
        </button>
        <p className="max-w-[60%] truncate text-sm font-semibold text-ink">
          {figure?.nombre ?? 'Captura'}
        </p>
        <div className="w-10" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        {isProcessing ? (
          <>
            <div className="map-skeleton-pulse h-12 w-12 rounded-full border-2 border-lime-400/40 border-t-lime-400" />
            <p className="mt-4 text-sm font-medium text-ink">Procesando foto…</p>
          </>
        ) : captureError ? (
          <>
            <p className="max-w-xs text-sm text-red-700">{captureError}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 min-h-[44px] rounded-full bg-ink px-5 py-2 text-xs font-bold uppercase text-white"
            >
              Volver a intentar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 min-h-[44px] text-xs font-semibold text-muted underline"
            >
              Volver al mapa
            </button>
          </>
        ) : inCaptureRange ? (
          <>
            <p className="text-sm text-muted">Listo para sacar la foto.</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-5 min-h-[48px] rounded-full bg-ink px-8 py-3 text-sm font-bold uppercase text-white"
            >
              Sacar foto
            </button>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-ink">Acercate al punto</p>
            <p className="mt-2 max-w-xs text-xs text-muted">
              {gpsStatusLabel}
              {distanceMeters != null ? ` · ~${Math.round(distanceMeters)}m` : ''}
            </p>
          </>
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
