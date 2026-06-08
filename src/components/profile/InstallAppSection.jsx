import { useEffect, useState } from 'react'
import { Button } from '../Button'
import { InstallAppInstructions } from '../pwa/InstallAppInstructions'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { pwaLog } from '../../utils/pwaLog'
import { OptionsSectionCard } from './OptionsSectionCard'

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
    <OptionsSectionCard
      title="Instalar app"
      description="Instalá el álbum en tu celular para una experiencia más fluida al caminar y capturar."
    >
      <div className="mt-4">
        <InstallAppInstructions
          isIos={isIos}
          isSafari={isSafari}
          isInAppBrowser={isInAppBrowser}
        />
      </div>

      {!isIos && !isInAppBrowser ? (
        <div className="mt-4">
          <Button uiSound="UI_CONFIRM" disabled={!canPromptInstall} onClick={handleInstall}>
            Instalar app
          </Button>
          {!canPromptInstall ? (
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Si el botón no se activa, usá el menú del navegador como se indica arriba.
            </p>
          ) : null}
        </div>
      ) : null}

      {message ? <p className="mt-3 text-xs text-progress">{message}</p> : null}
    </OptionsSectionCard>
  )
}
