import { useEffect, useState } from 'react'
import { Button } from '../Button'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { pwaLog } from '../../utils/pwaLog'

export function InstallAppSection() {
  const {
    isInstalled,
    isIos,
    isSafari,
    canPromptInstall,
    showInstallCta,
    hasDeferredPrompt,
    blockedReason,
    promptInstall,
  } = usePwaInstall()
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    pwaLog('InstallAppSection state', {
      isInstalled,
      showInstallCta,
      isIos,
      isSafari,
      canPromptInstall,
      hasDeferredPrompt,
      blockedReason,
    })
  }, [
    blockedReason,
    canPromptInstall,
    hasDeferredPrompt,
    isInstalled,
    isIos,
    isSafari,
    showInstallCta,
  ])

  if (isInstalled || !showInstallCta) return null

  const handleInstall = async () => {
    setMessage(null)
    const result = await promptInstall()
    if (result.ok) {
      setMessage('Listo. La app quedó en tu pantalla de inicio.')
      return
    }
    if (result.reason === 'dismissed') {
      setMessage('Podés instalarla cuando quieras desde acá.')
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
      <p className="text-xs uppercase tracking-wide text-muted">Aplicación</p>
      <p className="mt-2 text-sm leading-relaxed text-ink">
        Instalá el álbum en tu celular para una experiencia más fluida al caminar y capturar.
      </p>

      {isIos ? (
        <div className="mt-4 space-y-2 text-sm leading-relaxed text-muted">
          <p>{isSafari ? 'En iPhone o iPad con Safari:' : 'En iPhone o iPad:'}</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Tocá <span className="font-medium text-ink">Compartir</span>
              {isSafari ? ' en Safari' : ''}
            </li>
            <li>
              Elegí{' '}
              <span className="font-medium text-ink">Añadir a pantalla de inicio</span>
            </li>
          </ol>
          {!isSafari && (
            <p className="text-xs leading-relaxed text-muted">
              Si usás otro navegador, abrí esta página en Safari para instalarla.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <Button disabled={!canPromptInstall} onClick={handleInstall}>
            Instalar app
          </Button>
          {!canPromptInstall && (
            <p className="text-xs leading-relaxed text-muted">
              Si el botón no se activa, abrí el menú del navegador (⋮) y elegí{' '}
              <span className="font-medium text-ink">Instalar aplicación</span>.
            </p>
          )}
        </div>
      )}

      {message && <p className="mt-3 text-xs text-progress">{message}</p>}
    </div>
  )
}
