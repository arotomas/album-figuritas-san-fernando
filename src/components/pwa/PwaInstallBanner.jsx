import { useCallback, useState } from 'react'
import { FaXmark } from 'react-icons/fa6'
import { Link } from 'react-router-dom'
import { Button } from '../Button'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { InstallAppInstructions } from './InstallAppInstructions'

const DISMISS_KEY = 'album-pwa-install-banner-dismissed'

function readDismissed() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

function writeDismissed() {
  try {
    sessionStorage.setItem(DISMISS_KEY, '1')
  } catch {
    // ignore
  }
}

export function PwaInstallBanner() {
  const {
    isInstalled,
    isIos,
    isSafari,
    isInAppBrowser,
    canPromptInstall,
    showInstallCta,
    promptInstall,
  } = usePwaInstall()
  const [dismissed, setDismissed] = useState(readDismissed)

  const handleDismiss = useCallback(() => {
    writeDismissed()
    setDismissed(true)
  }, [])

  const handleInstall = useCallback(async () => {
    await promptInstall()
  }, [promptInstall])

  if (isInstalled || !showInstallCta) return null
  if (dismissed && !isInAppBrowser) return null

  const title = isInAppBrowser
    ? 'Abrí en Safari para instalar'
    : isIos
      ? 'Instalá la app en tu iPhone'
      : 'Instalá la app en tu celular'

  return (
    <div
      className={`safe-x relative z-30 shrink-0 border-b px-4 py-3 ${
        isInAppBrowser
          ? 'border-amber-300/50 bg-amber-50'
          : 'border-progress/25 bg-[#f4f9eb]'
      }`}
      role="region"
      aria-label="Instalar aplicación"
    >
      <div className="mx-auto flex max-w-lg items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold text-ink">{title}</p>
          <div className="mt-2">
            <InstallAppInstructions
              compact
              isIos={isIos}
              isSafari={isSafari}
              isInAppBrowser={isInAppBrowser}
            />
          </div>
          {!isIos && canPromptInstall && (
            <Button className="mt-3 w-full sm:w-auto" onClick={handleInstall}>
              Instalar ahora
            </Button>
          )}
          <p className="mt-2 text-[11px] text-muted">
            También en{' '}
            <Link to="/options" className="font-semibold text-ink underline-offset-2 hover:underline">
              Opciones
            </Link>
            .
          </p>
        </div>
        {!isInAppBrowser && (
          <button
            type="button"
            onClick={handleDismiss}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/80 bg-white/80 text-muted"
            aria-label="Cerrar"
          >
            <FaXmark size={14} aria-hidden />
          </button>
        )}
      </div>
    </div>
  )
}
