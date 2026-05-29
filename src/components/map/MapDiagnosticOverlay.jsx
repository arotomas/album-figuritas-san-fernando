import { createPortal } from 'react-dom'
import { useCallback, useEffect, useState } from 'react'
import { getPinnedDiagnosticJson } from '../../utils/mapDiagnosticFeed'

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

export function MapDiagnosticOverlay() {
  const [toastVisible, setToastVisible] = useState(false)

  useEffect(() => {
    if (!toastVisible) return undefined
    const id = window.setTimeout(() => setToastVisible(false), 2000)
    return () => window.clearTimeout(id)
  }, [toastVisible])

  const handleCopy = useCallback(async () => {
    const json = getPinnedDiagnosticJson(true)
    if (!json) return
    try {
      await copyText(json)
      setToastVisible(true)
    } catch {
      // ignore clipboard errors on restricted contexts
    }
  }, [])

  const ui = (
    <>
      <button
        type="button"
        onClick={handleCopy}
        className="fixed z-[2147483647] flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/80 text-lg leading-none shadow-lg backdrop-blur-sm active:scale-95"
        style={{
          top: 'calc(max(0.25rem, env(safe-area-inset-top)) + 1.65rem)',
          left: 'max(0.35rem, env(safe-area-inset-left))',
          width: 40,
          height: 40,
          maxWidth: 40,
          maxHeight: 40,
        }}
        aria-label="Copiar diagnóstico MAP_CAMERA"
        title="Copiar último flyTo/panTo"
      >
        🐞
      </button>
      {toastVisible ? (
        <p
          className="pointer-events-none fixed left-1/2 z-[2147483647] -translate-x-1/2 rounded-md border border-emerald-400/50 bg-emerald-950/95 px-3 py-2 text-center text-[11px] font-bold text-emerald-200 shadow-lg"
          style={{ top: 'calc(max(0.5rem, env(safe-area-inset-top)) + 3rem)' }}
          role="status"
          aria-live="polite"
        >
          Diagnóstico copiado
        </p>
      ) : null}
    </>
  )

  if (typeof document === 'undefined') return ui
  return createPortal(ui, document.body)
}
