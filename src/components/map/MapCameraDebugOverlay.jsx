import { useEffect, useState } from 'react'
import { isCameraMoveLoggingEnabled } from '../../utils/cameraMoveLog'
import { useMapCameraDebugStore } from '../../store/mapCameraDebugStore'

function formatTime(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  const pad = (n, len = 2) => String(n).padStart(len, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
}

function Bool({ value }) {
  return (
    <span className={value ? 'text-lime-400' : 'text-red-400'}>
      {value ? 'ON' : 'OFF'}
    </span>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex gap-2 leading-tight">
      <span className="shrink-0 text-white/45">{label}</span>
      <span className="min-w-0 break-all text-white">{children}</span>
    </div>
  )
}

function MoveBlock({ entry, title }) {
  if (!entry) return null
  return (
    <div className="rounded border border-white/10 bg-black/50 p-2">
      {title ? (
        <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-amber-300">
          {title}
        </p>
      ) : null}
      <Row label="origin">{entry.origen}</Row>
      <Row label="method">{entry.method}</Row>
      <Row label="time">{formatTime(entry.timestamp)}</Row>
      <Row label="latlng">{entry.latlng}</Row>
    </div>
  )
}

export function MapCameraDebugOverlay() {
  const enabled = isCameraMoveLoggingEnabled()
  const lastMove = useMapCameraDebugStore((s) => s.lastMove)
  const history = useMapCameraDebugStore((s) => s.history)
  const runtime = useMapCameraDebugStore((s) => s.runtime)
  const [, tick] = useState(0)

  useEffect(() => {
    if (!enabled) return undefined
    const id = window.setInterval(() => tick((n) => n + 1), 400)
    return () => window.clearInterval(id)
  }, [enabled])

  if (!enabled) return null

  const autoFollowOn =
    runtime.mapFlyControllerOn && !runtime.autoFollowDisabled

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-[calc(var(--bottom-nav-height,4.5rem)+0.25rem)] z-[9500] max-h-[42vh] px-1 sm:px-2"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto overflow-hidden rounded-lg border border-lime-500/40 bg-black/88 shadow-lg backdrop-blur-sm">
        <div className="border-b border-white/10 px-2 py-1.5">
          <p className="font-mono text-[10px] font-semibold text-lime-300">
            CAMERA QA · ?map_debug_log=1
          </p>
        </div>

        <div className="max-h-[38vh] space-y-2 overflow-y-auto p-2 font-mono text-[10px]">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <Row label="autoFollow">
              <Bool value={autoFollowOn} />
            </Row>
            <Row label="MapFlyController">
              <Bool value={runtime.mapFlyControllerOn} />
            </Row>
            <Row label="missionFollowResume">
              <Bool value={runtime.missionFollowResumeOn} />
            </Row>
            <Row label="resumeTimer">
              <Bool value={runtime.missionFollowResumePending} />
            </Row>
            <Row label="userControlledRef">
              <Bool value={runtime.userControlled} />
            </Row>
            <Row label="followPaused">
              <Bool value={runtime.followPaused} />
            </Row>
          </div>

          <Row label="activeTargetFigureId">
            {runtime.activeTargetFigureId ?? '—'}
          </Row>
          <Row label="explore">
            <Bool value={runtime.explorationActive} />
          </Row>

          {lastMove ? (
            <MoveBlock entry={lastMove} title="Último CAMERA_MOVE" />
          ) : (
            <p className="rounded border border-dashed border-white/20 p-2 text-white/50">
              Sin CAMERA_MOVE aún — el panel está activo; mové el mapa o esperá GPS.
            </p>
          )}

          {history.length > 1 ? (
            <div className="space-y-1.5">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-white/50">
                Historial ({Math.min(history.length, 10)})
              </p>
              {history.slice(1).map((entry, index) => (
                <MoveBlock key={`${entry.timestamp}-${index}`} entry={entry} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
