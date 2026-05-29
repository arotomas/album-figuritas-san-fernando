import { createPortal } from 'react-dom'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { appBuildInfo } from '../../build/appBuildInfo'
import {
  formatDiagnosticAge,
  formatDiagnosticCenter,
  getPinnedApiCall,
  getPinnedDiagnosticJson,
  getPinnedApiCallRemainingMs,
  PINNED_API_CALL_HOLD_MS,
  subscribeMapDiagnosticFeed,
} from '../../utils/mapDiagnosticFeed'

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

function PinnedField({ label, value, highlight = false }) {
  return (
    <div className="mb-1.5">
      <p
        className={`text-[10px] font-bold uppercase tracking-wide ${
          highlight ? 'text-sky-200' : 'text-amber-300'
        }`}
      >
        {label}:
      </p>
      <p className="break-all text-[11px] leading-snug text-white">{value ?? '—'}</p>
    </div>
  )
}

function PinnedApiCallPanel({ entry, onCopy }) {
  const diagnostic = entry.diagnostic
  const remainingSec = Math.ceil(getPinnedApiCallRemainingMs() / 1000)

  if (!diagnostic) return null

  return (
    <div className="rounded-b-lg border-2 border-t-0 border-sky-400/80 bg-black/96 p-3">
      <div className="mb-2 flex items-start justify-between gap-2 border-b border-sky-400/30 pb-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-sky-200">
          Último flyTo / panTo · {remainingSec}s / {Math.round(PINNED_API_CALL_HOLD_MS / 1000)}s
        </p>
      </div>

      <PinnedField label="METHOD" value={diagnostic.method} highlight />
      <PinnedField label="CALLER" value={diagnostic.caller} />
      <PinnedField label="RESOLVED_FUNCTION" value={diagnostic.resolvedFunction} highlight />
      <PinnedField label="RESOLVED_FILE" value={diagnostic.resolvedFile} highlight />
      <PinnedField label="BUNDLE_FILE" value={diagnostic.bundleFile} />
      <PinnedField
        label="BUNDLE_LINE"
        value={diagnostic.bundleLine != null ? String(diagnostic.bundleLine) : '—'}
      />
      <PinnedField
        label="BUNDLE_COLUMN"
        value={diagnostic.bundleColumn != null ? String(diagnostic.bundleColumn) : '—'}
      />
      <PinnedField label="BEFORE" value={formatDiagnosticCenter(diagnostic.before)} />
      <PinnedField label="AFTER" value={formatDiagnosticCenter(diagnostic.after)} />
      <PinnedField label="AGE" value={formatDiagnosticAge(diagnostic.timestamp)} />

      <button
        type="button"
        onClick={onCopy}
        className="mt-2 w-full rounded-md border border-sky-400/60 bg-sky-950 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-sky-100 active:bg-sky-900"
      >
        Copiar diagnóstico
      </button>
    </div>
  )
}

export function MapDiagnosticOverlay() {
  const pinned = useSyncExternalStore(
    subscribeMapDiagnosticFeed,
    getPinnedApiCall,
    getPinnedApiCall,
  )
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

  const panel = (
    <div
      className="fixed left-1/2 top-0 z-[2147483647] w-[90vw] max-w-[90vw] -translate-x-1/2 font-mono shadow-2xl"
      style={{ paddingTop: 'max(0.35rem, env(safe-area-inset-top))' }}
      role="log"
      aria-live="polite"
      aria-label="Diagnóstico MAP_CAMERA"
    >
      <p className="pointer-events-none mb-0 rounded-t-lg border border-b-0 border-white/25 bg-black px-2 py-1 text-center text-[11px] font-bold text-white">
        BUILD SHA: {appBuildInfo.shaShort}
      </p>
      {pinned ? (
        <PinnedApiCallPanel entry={pinned} onCopy={handleCopy} />
      ) : (
        <div className="pointer-events-none rounded-b-lg border border-white/25 bg-black/96 p-3">
          <p className="text-[11px] text-white/50">Esperando flyTo o panTo…</p>
        </div>
      )}
      {toastVisible ? (
        <p className="pointer-events-none mt-2 rounded-md border border-emerald-400/50 bg-emerald-950/95 px-3 py-2 text-center text-[11px] font-bold text-emerald-200">
          Diagnóstico copiado
        </p>
      ) : null}
    </div>
  )

  if (typeof document === 'undefined') return panel
  return createPortal(panel, document.body)
}
