import { FaCamera } from 'react-icons/fa6'
import { PremiumButton } from '../ui/PremiumButton'

export function CameraAccessGate({
  variant = 'prompt',
  onOpenCamera,
  onUseNative,
  onBack,
}) {
  const isDenied = variant === 'denied'

  return (
    <div className="bg-app safe-top safe-bottom flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="max-w-sm animate-slide-up">
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-surface">
          <FaCamera size={36} className="text-muted" aria-hidden />
        </div>

        <h1 className="text-app font-display text-xl font-bold">
          {isDenied ? 'La cámara está bloqueada en Chrome.' : 'Acceso a la cámara'}
        </h1>

        <p className="text-app-muted mt-4 font-body text-sm leading-relaxed">
          {isDenied
            ? 'No podemos abrir la vista previa web. Podés usar la cámara nativa del celular para sacar la foto.'
            : 'Necesitamos acceso a la cámara para desbloquear figuritas.'}
        </p>

        {isDenied && (
          <p className="mt-4 text-left text-xs leading-relaxed text-zinc-500">
            En Android: mantené presionado Chrome &gt; Información de la app &gt;
            Permisos &gt; Cámara &gt; Permitir.
          </p>
        )}

        <div className="mt-10 space-y-3">
          {!isDenied && (
            <PremiumButton variant="lime" onClick={onOpenCamera} className="w-full">
              Abrir cámara
            </PremiumButton>
          )}
          <PremiumButton
            variant={isDenied ? 'lime' : 'outline'}
            onClick={onUseNative}
            className="w-full"
          >
            Usar cámara del celular
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
