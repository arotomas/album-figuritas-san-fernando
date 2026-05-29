import { useSyncExternalStore } from 'react'
import {
  formatDiagnosticCenter,
  formatDiagnosticTime,
  getMapDiagnosticEntries,
  subscribeMapDiagnosticFeed,
} from '../../utils/mapDiagnosticFeed'

function CameraApiCallRow({ entry }) {
  return (
    <li className="border-b border-sky-400/25 py-1.5 last:border-0">
      <p className="font-bold text-[9px] text-amber-200">
        {formatDiagnosticTime(entry.iso)}{' '}
        <span className="text-sky-300">MAP_CAMERA</span>{' '}
        <span className="text-white">{entry.kind ?? 'event'}</span>
      </p>
      <p className="text-[9px] font-bold text-sky-200">
        method: {entry.method ?? entry.event ?? '—'}
      </p>
      <p className="truncate text-[8px] text-white/85">
        fn: {entry.originFn ?? 'unknown'}
      </p>
      <p className="truncate text-[8px] text-white/75">
        file: {entry.originFile ?? 'unknown'}
      </p>
      <p className="truncate text-[8px] text-white/65">
        stack: {entry.stackSummary ?? entry.site ?? 'unknown'}
      </p>
      <p className="text-[8px] leading-tight text-white/60">
        before: {formatDiagnosticCenter(entry.centerBefore)}
      </p>
      <p className="text-[8px] leading-tight text-white/60">
        after: {formatDiagnosticCenter(entry.centerAfter ?? entry.center)}
      </p>
    </li>
  )
}

function EventRow({ entry }) {
  const isCamera = entry.source === 'MAP_CAMERA'

  if (isCamera && (entry.kind === 'api-call' || entry.kind === 'center-after-call')) {
    return <CameraApiCallRow entry={entry} />
  }

  if (!isCamera) {
    return (
      <li className="border-b border-fuchsia-400/20 py-1 last:border-0">
        <p className="font-bold text-[9px] text-amber-200">
          {formatDiagnosticTime(entry.iso)}{' '}
          <span className="text-fuchsia-300">ROTATION_DELTA</span>{' '}
          <span className="text-white/90">{entry.field ?? 'rotation'}</span>
        </p>
        <p className="truncate text-[8px] text-white/75">
          {entry.reason ?? `${entry.file ?? ''}:${entry.line ?? ''}`}
        </p>
        <p className="text-[8px] leading-tight text-white/60">
          {formatDiagnosticCenter(entry.prev)} → {formatDiagnosticCenter(entry.next)}
        </p>
      </li>
    )
  }

  return (
    <li className="border-b border-white/10 py-1 last:border-0">
      <p className="font-bold text-[9px] text-amber-200">
        {formatDiagnosticTime(entry.iso)}{' '}
        <span className="text-sky-300">MAP_CAMERA</span>{' '}
        <span className="text-white/90">{entry.kind ?? entry.event ?? 'event'}</span>
      </p>
      <p className="truncate text-[8px] text-white/75">
        {entry.stackSummary ?? entry.site ?? 'unknown'}
      </p>
      <p className="text-[8px] leading-tight text-white/60">
        {formatDiagnosticCenter(entry.centerBefore ?? entry.center)} →{' '}
        {formatDiagnosticCenter(entry.centerAfter)}
      </p>
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
      className="pointer-events-none absolute right-2 top-14 z-[600] max-h-[min(55vh,26rem)] w-[min(94vw,15.5rem)] overflow-hidden rounded-lg border border-white/20 bg-black/90 px-2 py-1.5 font-mono text-[9px] leading-snug text-white shadow-lg backdrop-blur-sm"
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
        <ol className="max-h-[min(50vh,24rem)] list-none overflow-hidden">
          {entries.map((entry) => (
            <EventRow key={entry.id} entry={entry} />
          ))}
        </ol>
      )}
    </div>
  )
}
