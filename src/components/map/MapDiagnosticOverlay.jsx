import { createPortal } from 'react-dom'
import { useSyncExternalStore } from 'react'
import { appBuildInfo } from '../../build/appBuildInfo'
import {
  formatDiagnosticCenter,
  formatDiagnosticTime,
  getPinnedApiCall,
  getPinnedApiCallRemainingMs,
  PINNED_API_CALL_HOLD_MS,
  subscribeMapDiagnosticFeed,
} from '../../utils/mapDiagnosticFeed'

function PinnedField({ label, value, highlight = false }) {
  return (
    <div className="mb-2">
      <p
        className={`text-[11px] font-bold uppercase tracking-wide ${
          highlight ? 'text-sky-200' : 'text-amber-300'
        }`}
      >
        {label}:
      </p>
      <p className="break-all text-[12px] leading-snug text-white">{value ?? '—'}</p>
    </div>
  )
}

function PinnedApiCallPanel({ entry }) {
  const remainingSec = Math.ceil(getPinnedApiCallRemainingMs() / 1000)

  return (
    <div className="rounded-lg border-2 border-sky-400/80 bg-black/96 p-3">
      <p className="mb-2 border-b border-sky-400/30 pb-2 text-[11px] font-bold uppercase tracking-wide text-sky-200">
        Último flyTo / panTo
      </p>
      <p className="mb-3 text-[10px] text-white/55">
        {formatDiagnosticTime(entry.iso)} · visible {remainingSec}s /{' '}
        {Math.round(PINNED_API_CALL_HOLD_MS / 1000)}s
      </p>
      <PinnedField label="METHOD" value={entry.method ?? entry.event} highlight />
      <PinnedField label="caller" value={entry.caller} />
      <PinnedField label="resolvedFunction" value={entry.resolvedFunction ?? entry.originFn} highlight />
      <PinnedField label="resolvedFile" value={entry.resolvedFile ?? entry.originFile} highlight />
      <PinnedField label="stack" value={entry.stack ?? entry.stackSummary ?? entry.site} />
      <PinnedField label="before" value={formatDiagnosticCenter(entry.centerBefore)} />
      <PinnedField label="after" value={formatDiagnosticCenter(entry.centerAfter ?? entry.center)} />
    </div>
  )
}

export function MapDiagnosticOverlay() {
  const pinned = useSyncExternalStore(
    subscribeMapDiagnosticFeed,
    getPinnedApiCall,
    getPinnedApiCall,
  )

  const panel = (
    <div
      className="pointer-events-none fixed left-1/2 top-0 z-[2147483647] w-[90vw] max-w-[90vw] -translate-x-1/2 font-mono shadow-2xl"
      style={{ paddingTop: 'max(0.35rem, env(safe-area-inset-top))' }}
      role="log"
      aria-live="polite"
      aria-label="Diagnóstico MAP_CAMERA"
    >
      <p className="mb-1 rounded-t-lg border border-b-0 border-white/25 bg-black px-2 py-1 text-center text-[11px] font-bold text-white">
        BUILD SHA: {appBuildInfo.shaShort}
      </p>
      {pinned ? (
        <PinnedApiCallPanel entry={pinned} />
      ) : (
        <div className="rounded-b-lg border border-white/25 bg-black/96 p-3">
          <p className="text-[11px] text-white/50">Esperando flyTo o panTo…</p>
        </div>
      )}
    </div>
  )

  if (typeof document === 'undefined') return panel
  return createPortal(panel, document.body)
}
