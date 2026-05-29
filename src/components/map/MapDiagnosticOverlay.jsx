import { createPortal } from 'react-dom'
import { useSyncExternalStore } from 'react'
import {
  formatDiagnosticCenter,
  formatDiagnosticTime,
  getPinnedApiCall,
  getPinnedApiCallRemainingMs,
  PINNED_API_CALL_HOLD_MS,
  subscribeMapDiagnosticFeed,
} from '../../utils/mapDiagnosticFeed'
import { MAP_DIAGNOSTIC_BADGE_OFFSET_PX } from '../../config/mapDiagnosticUi'

function PinnedField({ label, value }) {
  return (
    <div className="mb-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-amber-300">{label}:</p>
      <p className="break-all text-[11px] leading-snug text-white">{value ?? '—'}</p>
    </div>
  )
}

function PinnedApiCallPanel({ entry }) {
  const remainingSec = Math.ceil(getPinnedApiCallRemainingMs() / 1000)

  return (
    <div className="rounded-md border-2 border-sky-400/70 bg-black/95 p-2.5">
      <p className="mb-2 border-b border-sky-400/30 pb-1.5 text-[10px] font-bold uppercase tracking-wide text-sky-200">
        Último MAP_CAMERA api-call
      </p>
      <p className="mb-2 text-[9px] text-white/50">
        {formatDiagnosticTime(entry.iso)} · visible {remainingSec}s /{' '}
        {Math.round(PINNED_API_CALL_HOLD_MS / 1000)}s
      </p>
      <PinnedField label="method" value={entry.method ?? entry.event} />
      <PinnedField label="fn" value={entry.originFn} />
      <PinnedField label="file" value={entry.originFile} />
      <PinnedField label="stack" value={entry.stackSummary ?? entry.site} />
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
      className="pointer-events-none fixed left-0 z-[2147483646] max-h-[40dvh] w-[min(100vw,18rem)] overflow-y-auto px-2 pb-2 font-mono shadow-lg"
      style={{
        top: `calc(${MAP_DIAGNOSTIC_BADGE_OFFSET_PX}px + env(safe-area-inset-top, 0px))`,
      }}
      role="log"
      aria-live="polite"
      aria-label="Último MAP_CAMERA api-call"
    >
      {pinned ? (
        <PinnedApiCallPanel entry={pinned} />
      ) : (
        <div className="rounded-md border border-white/20 bg-black/95 p-2.5">
          <p className="text-[10px] leading-relaxed text-white/50">
            Esperando MAP_CAMERA api-call…
          </p>
        </div>
      )}
    </div>
  )

  if (typeof document === 'undefined') return panel
  return createPortal(panel, document.body)
}
