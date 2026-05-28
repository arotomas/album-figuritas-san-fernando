import { useEffect, useState } from 'react'
import { Button } from '../Button'
import { InstallAppInstructions } from '../pwa/InstallAppInstructions'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { pwaLog } from '../../utils/pwaLog'

export function InstallAppSection() {
  const {
    isInstalled,
    isIos,
    isSafari,
    isInAppBrowser,
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
      isInAppBrowser,
      canPromptInstall,
      hasDeferredPrompt,
      blockedReason,
    })
  }, [
    blockedReason,
    canPromptInstall,
    hasDeferredPrompt,
    isInAppBrowser,
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

      <div className="mt-4">
        <InstallAppInstructions
          isIos={isIos}
          isSafari={isSafari}
          isInAppBrowser={isInAppBrowser}
        />
      </div>

      {!isIos && !isInAppBrowser && (
        <div className="mt-4">
          <Button disabled={!canPromptInstall} onClick={handleInstall}>
            Instalar app
          </Button>
          {!canPromptInstall && (
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Si el botón no se activa, usá el menú del navegador como se indica arriba.
            </p>
          )}
        </div>
      )}

      {message && <p className="mt-3 text-xs text-progress">{message}</p>}
    </div>
  )
}
