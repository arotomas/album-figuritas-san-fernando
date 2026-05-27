import { useState } from 'react'
import { Button } from '../Button'
import { usePwaInstall } from '../../hooks/usePwaInstall'

export function InstallAppSection() {
  const { isInstalled, isIos, canPromptInstall, showInstallCta, promptInstall } =
    usePwaInstall()
  const [message, setMessage] = useState(null)

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
          <p>En iPhone o iPad:</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Tocá <span className="font-medium text-ink">Compartir</span> en Safari</li>
            <li>Elegí <span className="font-medium text-ink">Añadir a pantalla de inicio</span></li>
          </ol>
        </div>
      ) : (
        <Button className="mt-4" disabled={!canPromptInstall} onClick={handleInstall}>
          Instalar app
        </Button>
      )}

      {message && <p className="mt-3 text-xs text-progress">{message}</p>}
    </div>
  )
}
