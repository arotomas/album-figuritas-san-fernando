import { FaXmark } from 'react-icons/fa6'

export function NativeCapturePanel({
  figure,
  fileInputRef,
  isProcessing,
  processingMessage,
  isOpening,
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
          aria-label="Volver al mapa"
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
            <div className="map-skeleton-pulse h-12 w-12 rounded-full border-2 border-progress/40 border-t-progress" />
            <p className="mt-4 text-sm font-medium text-ink">
              {processingMessage ?? 'Procesando foto…'}
            </p>
          </>
        ) : captureError ? (
          <>
            <p className="max-w-xs text-sm text-red-700">{captureError}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 min-h-[44px] rounded-full bg-ink px-5 py-2 text-xs font-bold uppercase text-white"
            >
              Reintentar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 min-h-[44px] text-xs font-semibold text-muted underline"
            >
              Volver al mapa
            </button>
          </>
        ) : (
          <>
            <div className="map-skeleton-pulse h-12 w-12 rounded-full border-2 border-progress/40 border-t-progress" />
            <p className="mt-4 text-sm font-medium text-ink">Abriendo cámara…</p>
          </>
        )}
      </div>

      <div className="pb-2">
        {!isProcessing && !captureError && (
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] w-full text-sm font-semibold text-muted underline"
          >
            Volver al mapa
          </button>
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
