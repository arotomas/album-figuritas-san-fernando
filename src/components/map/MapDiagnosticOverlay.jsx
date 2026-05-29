import { useSyncExternalStore } from 'react'
import {
  formatDiagnosticCenter,
  formatDiagnosticTime,
  getMapDiagnosticEntries,
  shortSite,
  subscribeMapDiagnosticFeed,
} from '../../utils/mapDiagnosticFeed'

function EventRow({ entry }) {
  const isCamera = entry.source === 'MAP_CAMERA'
  const tag = isCamera
    ? entry.kind ?? entry.method ?? entry.event ?? 'event'
    : entry.field ?? 'rotation'

  const siteOrReason = isCamera
    ? shortSite(entry.site)
    : entry.reason ?? `${entry.file ?? ''}:${entry.line ?? ''}`

  const before = isCamera
    ? formatDiagnosticCenter(entry.centerBefore ?? entry.center)
    : formatDiagnosticCenter(entry.prev)

  const after = isCamera
    ? formatDiagnosticCenter(entry.centerAfter)
    : formatDiagnosticCenter(entry.next)

  return (
    <li className="border-b border-white/10 py-1 last:border-0">
      <p className="font-bold text-[9px] text-amber-200">
        {formatDiagnosticTime(entry.iso)}{' '}
        <span className={isCamera ? 'text-sky-300' : 'text-fuchsia-300'}>
          {entry.source}
        </span>{' '}
        <span className="text-white/90">{tag}</span>
      </p>
      <p className="truncate text-[8px] text-white/75">{siteOrReason}</p>
      {(before !== '—' || after !== '—') && (
        <p className="text-[8px] leading-tight text-white/60">
          {before !== '—' ? before : '…'} → {after !== '—' ? after : '…'}
        </p>
      )}
    </li>
  )
}

export function MapDiagnosticOverlay() {
  const entries = useSyncExternalStore(
    subscribeMapDiagnosticFeed,
    getMapDiagnosticEntries,
    getMapDiagnosticEntries,
  )

  return (
    <div
      className="pointer-events-none absolute right-2 top-14 z-[600] max-h-[min(50vh,22rem)] w-[min(92vw,13.5rem)] overflow-hidden rounded-lg border border-white/20 bg-black/88 px-2 py-1.5 font-mono text-[9px] leading-snug text-white shadow-lg backdrop-blur-sm"
      role="log"
      aria-live="polite"
      aria-label="Diagnóstico mapa"
    >
      <p className="mb-1 border-b border-white/15 pb-1 text-[8px] font-bold uppercase tracking-wide text-amber-300">
        MAP_CAMERA + ROTATION (20)
      </p>
      {entries.length === 0 ? (
        <p className="text-[8px] text-white/45">Esperando eventos…</p>
      ) : (
        <ol className="max-h-[min(46vh,20rem)] list-none overflow-hidden">
          {entries.map((entry) => (
            <EventRow key={entry.id} entry={entry} />
          ))}
        </ol>
      )}
    </div>
  )
}
