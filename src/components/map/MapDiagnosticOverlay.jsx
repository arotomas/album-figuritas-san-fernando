import { useSyncExternalStore } from 'react'
import {
  formatDiagnosticCenter,
  formatDiagnosticTime,
  getMapDiagnosticEntries,
  subscribeMapDiagnosticFeed,
} from '../../utils/mapDiagnosticFeed'

function LabeledLine({ label, value, bold = false }) {
  return (
    <p
      className={`break-all text-[8px] leading-tight ${bold ? 'font-bold text-sky-100' : 'text-white/80'}`}
    >
      <span className="text-amber-200">{label}:</span> {value ?? '—'}
    </p>
  )
}

function CameraApiCallRow({ entry }) {
  return (
    <li className="border-b border-sky-400/40 py-1.5 last:border-0">
      <p className="mb-0.5 font-bold text-[9px] text-amber-200">
        {formatDiagnosticTime(entry.iso)}{' '}
        <span className="text-sky-300">MAP_CAMERA</span>{' '}
        <span className="text-white">{entry.kind ?? 'api-call'}</span>
      </p>
      <LabeledLine label="method" value={entry.method ?? entry.event} bold />
      <LabeledLine label="fn" value={entry.originFn} bold />
      <LabeledLine label="file" value={entry.originFile} />
      <LabeledLine label="stack" value={entry.stackSummary ?? entry.site} />
      {entry.bundleFn && entry.bundleFn !== entry.originFn ? (
        <LabeledLine label="bundleFn" value={entry.bundleFn} />
      ) : null}
      <LabeledLine label="before" value={formatDiagnosticCenter(entry.centerBefore)} />
      <LabeledLine label="after" value={formatDiagnosticCenter(entry.centerAfter ?? entry.center)} />
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
          <span className="text-fuchsia-300">ROTATION_DELTA</span>
        </p>
        <LabeledLine label="field" value={entry.field} />
        <LabeledLine label="reason" value={entry.reason} />
        <LabeledLine
          label="before"
          value={formatDiagnosticCenter(entry.prev)}
        />
        <LabeledLine
          label="after"
          value={formatDiagnosticCenter(entry.next)}
        />
      </li>
    )
  }

  return (
    <li className="border-b border-white/10 py-1 last:border-0">
      <p className="font-bold text-[9px] text-amber-200">
        {formatDiagnosticTime(entry.iso)}{' '}
        <span className="text-sky-300">MAP_CAMERA</span>{' '}
        <span className="text-white/90">{entry.kind ?? entry.event}</span>
      </p>
      <LabeledLine label="stack" value={entry.stackSummary ?? entry.site} />
      <LabeledLine
        label="before"
        value={formatDiagnosticCenter(entry.centerBefore ?? entry.center)}
      />
      <LabeledLine label="after" value={formatDiagnosticCenter(entry.centerAfter)} />
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
      className="pointer-events-none absolute right-2 top-14 z-[600] max-h-[min(58vh,28rem)] w-[min(96vw,16.5rem)] overflow-hidden rounded-lg border border-white/25 bg-black/92 px-2 py-1.5 font-mono text-[9px] leading-snug text-white shadow-lg backdrop-blur-sm"
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
        <ol className="max-h-[min(54vh,26rem)] list-none overflow-hidden">
          {entries.map((entry) => (
            <EventRow key={entry.id} entry={entry} />
          ))}
        </ol>
      )}
    </div>
  )
}
