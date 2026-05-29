import { useSyncExternalStore } from 'react'
import {
  formatDiagnosticCenter,
  formatDiagnosticTime,
  getPinnedApiCall,
  getPinnedApiCallRemainingMs,
  PINNED_API_CALL_HOLD_MS,
  subscribeMapDiagnosticFeed,
} from '../../utils/mapDiagnosticFeed'

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
    <div className="rounded-md border-2 border-sky-400/70 bg-sky-950/40 p-2">
      <p className="mb-2 border-b border-sky-400/30 pb-1.5 text-[10px] font-bold uppercase tracking-wide text-sky-200">
        Último MAP_CAMERA api-call
      </p>
      <p className="mb-2 text-[9px] text-white/55">
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

  return (
    <div
      className="pointer-events-none absolute right-2 top-14 z-[600] w-[min(96vw,17rem)] rounded-lg border border-white/25 bg-black/94 px-2.5 py-2 font-mono shadow-lg backdrop-blur-sm"
      role="log"
      aria-live="polite"
      aria-label="Último api-call MAP_CAMERA"
    >
      {pinned ? (
        <PinnedApiCallPanel entry={pinned} />
      ) : (
        <p className="text-[10px] leading-relaxed text-white/50">
          Esperando MAP_CAMERA api-call…
        </p>
      )}
    </div>
  )
}
