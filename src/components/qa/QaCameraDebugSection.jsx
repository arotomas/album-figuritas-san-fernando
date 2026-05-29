import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { isQaShellActive } from '../../qa/qaCore'
import {
  getCameraMoveLoggingDiagnostics,
  isCameraMoveLoggingEnabled,
} from '../../utils/cameraMoveLog'
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
    <div className="flex gap-1.5 leading-tight">
      <span className="shrink-0 text-white/45">{label}</span>
      <span className="min-w-0 break-all text-white/95">{children}</span>
    </div>
  )
}

export function QaCameraDebugSection() {
  const { pathname } = useLocation()
  const onMap = pathname === '/map'
  const lastMove = useMapCameraDebugStore((s) => s.lastMove)
  const history = useMapCameraDebugStore((s) => s.history)
  const runtime = useMapCameraDebugStore((s) => s.runtime)
  const [, tick] = useState(0)

  useEffect(() => {
    if (!isCameraMoveLoggingEnabled()) return undefined
    const id = window.setInterval(() => tick((n) => n + 1), 400)
    return () => window.clearInterval(id)
  }, [onMap])

  const diag = getCameraMoveLoggingDiagnostics()
  const loggingOn = isCameraMoveLoggingEnabled()
  const autoFollowOn =
    runtime.mapFlyControllerOn && !runtime.autoFollowDisabled

  return (
    <div className="border-t border-lime-500/30 bg-black/40 px-3 py-2 font-mono text-[9px]">
      <p className="mb-1.5 font-sans text-[10px] font-bold uppercase tracking-wide text-lime-300">
        Camera QA
      </p>

      <div className="mb-2 space-y-0.5 rounded border border-white/10 bg-zinc-900/80 p-1.5 text-white/55">
        <Row label="logging">
          <Bool value={loggingOn} />
        </Row>
        <Row label="url log">
          {diag.urlMapDebugLog ? '1' : '—'}
        </Row>
        <Row label="session">
          {diag.sessionMapDebugLog ? '1' : '—'}
        </Row>
        <Row label="qa shell">
          <Bool value={diag.qaShellActive} />
        </Row>
        <Row label="on /map">
          <Bool value={onMap} />
        </Row>
        {!loggingOn ? (
          <p className="pt-1 text-amber-200/90">
            Abrí /map?map_debug_log=1 o activá QA en el mapa.
          </p>
        ) : null}
      </div>

      {!onMap ? (
        <p className="text-white/50">Entrá a Mapa para ver CAMERA_MOVE en vivo.</p>
      ) : (
        <>
          <div className="mb-2 grid grid-cols-2 gap-x-2 gap-y-0.5">
            <Row label="autoFollow">
              <Bool value={autoFollowOn} />
            </Row>
            <Row label="MapFlyCtrl">
              <Bool value={runtime.mapFlyControllerOn} />
            </Row>
            <Row label="missionResume">
              <Bool value={runtime.missionFollowResumeOn} />
            </Row>
            <Row label="resumeTmr">
              <Bool value={runtime.missionFollowResumePending} />
            </Row>
            <Row label="userCtrl">
              <Bool value={runtime.userControlled} />
            </Row>
            <Row label="followPaused">
              <Bool value={runtime.followPaused} />
            </Row>
          </div>

          <Row label="targetId">
            {runtime.activeTargetFigureId ?? '—'}
          </Row>

          <div className="mt-2 rounded border border-lime-500/25 bg-black/50 p-1.5">
            <p className="mb-1 text-[8px] font-semibold uppercase text-amber-300">
              Último CAMERA_MOVE
            </p>
            {lastMove ? (
              <div className="space-y-0.5">
                <Row label="origin">{lastMove.origen}</Row>
                <Row label="method">{lastMove.method}</Row>
                <Row label="time">{formatTime(lastMove.timestamp)}</Row>
                <Row label="latlng">{lastMove.latlng}</Row>
              </div>
            ) : (
              <p className="text-white/45">
                Sin movimientos aún — pan, GPS o recentrado.
              </p>
            )}
          </div>

          {history.length > 1 ? (
            <div className="mt-1.5 max-h-24 space-y-1 overflow-y-auto">
              <p className="text-[8px] uppercase text-white/40">
                Historial ({Math.min(history.length, 10)})
              </p>
              {history.slice(1, 6).map((entry, index) => (
                <div
                  key={`${entry.timestamp}-${index}`}
                  className="rounded border border-white/5 px-1 py-0.5"
                >
                  <span className="text-lime-300/90">{entry.origen}</span>
                  <span className="text-white/40"> · {entry.method}</span>
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

export function shouldShowQaCameraSection() {
  return isQaShellActive()
}
