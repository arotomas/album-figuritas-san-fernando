import { FaCamera, FaLocationDot, FaRotateRight } from 'react-icons/fa6'
import { PremiumButton } from '../ui/PremiumButton'
import { classifyCameraError } from '../../utils/recovery'

export function PermissionFallback({
  cameraDenied = false,
  cameraError = null,
  geoDenied = false,
  geoError = null,
  geoErrorType = null,
  onRetry,
  onBack,
}) {
  const cameraInfo = cameraDenied || cameraError
    ? classifyCameraError(cameraError || 'PERMISSION_DENIED')
    : null

  const geoIsPermission = geoDenied || geoErrorType === 'denied'
  const geoIsSignal = geoErrorType === 'timeout' || geoErrorType === 'unavailable'

  return (
    <div className="safe-top safe-bottom flex min-h-dvh flex-col items-center justify-center bg-zinc-950 px-8 text-center">
      <div className="max-w-sm animate-slide-up">
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-zinc-900">
          <div className="relative">
            <FaCamera size={36} className="text-zinc-400" aria-hidden />
            <FaLocationDot
              size={18}
              className="absolute -bottom-1 -right-2 text-lime-400"
              aria-hidden
            />
          </div>
        </div>

        <h1 className="font-display text-xl font-bold text-white">
          {geoIsSignal && !cameraInfo
            ? 'Buscando señal GPS'
            : 'Permisos necesarios'}
        </h1>

        <p className="mt-4 font-body text-sm leading-relaxed text-zinc-400">
          {geoIsSignal && !cameraInfo
            ? 'Estamos obteniendo tu ubicación. Asegurate de tener GPS activo y buena señal al aire libre.'
            : 'Para conseguir figuritas necesitás habilitar cámara y ubicación en tu navegador.'}
        </p>

        <ul className="mt-6 space-y-2 text-left text-sm text-zinc-500">
          {cameraInfo && (
            <li className="flex items-start gap-2">
              <span className="text-red-400" aria-hidden>✕</span>
              <span>{cameraInfo.message}</span>
            </li>
          )}
          {geoIsPermission && (
            <li className="flex items-start gap-2">
              <span className="text-red-400" aria-hidden>✕</span>
              <span>{geoError || 'Ubicación no habilitada'}</span>
            </li>
          )}
          {geoIsSignal && (
            <li className="flex items-start gap-2">
              <span className="text-amber-400" aria-hidden>!</span>
              <span>{geoError}</span>
            </li>
          )}
        </ul>

        {(geoIsPermission || cameraInfo?.type === 'denied') && (
          <p className="mt-4 text-left text-xs leading-relaxed text-zinc-600">
            Si los rechazaste antes, abrí Ajustes del navegador → Permisos del sitio →
            habilitá cámara y ubicación para este sitio.
          </p>
        )}

        <div className="mt-10 space-y-3">
          <PremiumButton variant="lime" onClick={onRetry} className="w-full">
            <span className="inline-flex items-center justify-center gap-2">
              <FaRotateRight size={14} aria-hidden />
              Reintentar
            </span>
          </PremiumButton>
          <button
            type="button"
            onClick={onBack}
            className="w-full min-h-[44px] py-3 text-sm font-medium text-zinc-500"
          >
            Volver al mapa
          </button>
        </div>
      </div>
    </div>
  )
}
