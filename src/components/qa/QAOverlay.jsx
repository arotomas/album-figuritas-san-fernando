import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { storageService } from '../../services/storage/storageService'
import { STORAGE_KEY } from '../../config/persistence'
import { PerformanceDebugPanel } from '../performance/PerformanceDebugPanel'
import { useViewportMetrics } from '../../hooks/useViewport'
import { useGpsDiagnostics } from '../../hooks/useGpsDiagnostics'
import {
  getQaState,
  setQaFlag,
  resetQaFlags,
  measureFpsSample,
  readMemoryDiagnostics,
} from '../../utils/diagnostics'
import { mockFigures } from '../../data/mockFigures'
import { getMainProgressState, getRevealedNormalFigures } from '../../utils/figureGameRules'

export function QAOverlay() {
  if (!import.meta.env.DEV) return null
  return <QAOverlayDev />
}

function QAOverlayDev() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [snapshot, setSnapshot] = useState(null)
  const [showPerf, setShowPerf] = useState(false)
  const [fps, setFps] = useState(null)
  const [memory, setMemory] = useState(null)
  const [qaFlags, setQaFlags] = useState(getQaState())
  const viewport = useViewportMetrics()
  const gps = useGpsDiagnostics()

  const resetProgress = useAppStore((state) => state.resetProgress)
  const unlockAllFigures = useAppStore((state) => state.unlockAllFigures)
  const clearStorage = useAppStore((state) => state.clearStorage)
  const getPersistedSnapshot = useAppStore((state) => state.getPersistedSnapshot)
  const setNearFigure = useAppStore((state) => state.setNearFigure)
  const obtainFigureWithPhoto = useAppStore((state) => state.obtainFigureWithPhoto)
  const figures = useAppStore((state) => state.figures)
  const mainProgress = getMainProgressState(figures)
  const progress = mainProgress.obtained
  const totalFigures = mainProgress.visibleTotal
  const albumStatus = useAppStore((state) => state.albumStatus)
  const lastSavedAt = useAppStore((state) => state.lastSavedAt)

  useEffect(() => {
    const refresh = () => setQaFlags(getQaState())
    window.addEventListener('qa-flags-changed', refresh)
    return () => window.removeEventListener('qa-flags-changed', refresh)
  }, [])

  const runDiagnostics = useCallback(async () => {
    setMemory(readMemoryDiagnostics())
    setFps(await measureFpsSample(900))
  }, [])

  const toggleFlag = (key) => setQaFlag(key, !qaFlags[key])

  const handleMockGps = () => {
    const figure = mockFigures[0]
    setQaFlag('mockPosition', {
      lat: figure.lat,
      lng: figure.lng,
      accuracy: 8,
      timestamp: Date.now(),
    })
  }

  const getNextPendingFigure = () => {
    const storeFigures = useAppStore.getState().figures
    const pending = getRevealedNormalFigures(storeFigures).find((f) => !f.obtenida)
    if (!pending) return null
    return pending
  }

  const handleForceProximity = () => {
    const figure = getNextPendingFigure()
    if (!figure) return
    setQaFlag('mockPosition', {
      lat: figure.lat,
      lng: figure.lng,
      accuracy: 8,
      timestamp: Date.now(),
    })
    setNearFigure({ ...figure, distanceMeters: 8 })
    navigate('/map')
  }

  const handleOpenCaptureDev = () => {
    const figure = getNextPendingFigure()
    if (!figure) return
    setQaFlag('mockPosition', {
      lat: figure.lat,
      lng: figure.lng,
      accuracy: 8,
      timestamp: Date.now(),
    })
    setNearFigure({ ...figure, distanceMeters: 8 })
    navigate('/capture')
  }

  const handleSimulateCaptureFlow = () => {
    const figure = getNextPendingFigure()
    if (!figure) return
    setQaFlag('mockPosition', {
      lat: figure.lat,
      lng: figure.lng,
      accuracy: 8,
      timestamp: Date.now(),
    })
    setNearFigure({ ...figure, distanceMeters: 8 })
    setQaFlag('simulateCaptureSuccess', true)
    navigate('/capture')
  }

  const handleOpenReward = () => {
    const figure = mockFigures.find((f) => !f.obtenida) ?? mockFigures[0]
    setNearFigure(figure)
    obtainFigureWithPhoto(figure.id, {
      foto: null,
      fotoSizeBytes: 0,
      obtenidaEn: Date.now(),
    })
    navigate('/my-figures')
  }

  const handleShowState = () => {
    const state = getPersistedSnapshot()
    const raw = storageService.get(STORAGE_KEY)
    setSnapshot({ state, rawSize: raw?.length ?? 0 })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="safe-bottom fixed bottom-24 right-4 z-50 flex h-11 min-w-[44px] items-center justify-center rounded-full bg-zinc-900 px-3 text-[10px] font-bold text-progress shadow-lg"
        aria-label="Panel QA"
      >
        QA
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              onClick={(event) => event.stopPropagation()}
              className="safe-bottom max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl bg-zinc-900 p-6 text-white"
            >
              <h2 className="font-display text-lg font-bold">QA Panel</h2>
              <p className="mt-1 text-xs text-zinc-400">
                Progreso: {progress}/{totalFigures} · {albumStatus}
              </p>
              {lastSavedAt && (
                <p className="mt-1 text-xs text-zinc-500">
                  Último guardado: {new Date(lastSavedAt).toLocaleString('es-AR')}
                </p>
              )}

              {gps && (
                <div className="mt-4 rounded-xl bg-black/40 p-3 text-[10px] leading-relaxed text-zinc-300">
                  <p className="mb-1 font-bold uppercase tracking-wide text-sky-400/90">
                    GPS
                  </p>
                  <p>
                    lat/lng:{' '}
                    {gps.lat != null
                      ? `${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}`
                      : '—'}
                  </p>
                  <p>accuracy: {gps.accuracy != null ? `${Math.round(gps.accuracy)}m` : '—'}</p>
                  <p>fix age: {gps.ageMs != null ? `${Math.round(gps.ageMs)}ms` : '—'}</p>
                  <p>satellites: n/d (Web API)</p>
                  <p>
                    state:{' '}
                    {gps.quality === 'capture_ready'
                      ? 'stable'
                      : gps.quality === 'proximity'
                        ? 'refining'
                        : gps.quality === 'refining'
                          ? 'coarse'
                          : gps.quality ?? '—'}
                  </p>
                  <p>updates: {gps.updates ?? 0} · discards: {gps.discards ?? 0}</p>
                  {gps.lastDiscarded && (
                    <p className="text-amber-300/90">
                      last discard: {gps.lastDiscarded.reason} (
                      {gps.lastDiscarded.accuracy != null
                        ? `${Math.round(gps.lastDiscarded.accuracy)}m`
                        : '—'}
                      )
                    </p>
                  )}
                </div>
              )}

              {viewport && (
                <div className="mt-4 rounded-xl bg-black/40 p-3 text-[10px] leading-relaxed text-zinc-300">
                  <p className="mb-1 font-bold uppercase tracking-wide text-progress/90">
                    Viewport
                  </p>
                  <p>--app-height: {viewport.appHeight || '—'}</p>
                  <p>innerHeight: {viewport.innerHeight}px</p>
                  <p>visualViewport: {viewport.visualViewportHeight ?? '—'}px</p>
                  <p>offsetTop: {viewport.visualViewportOffsetTop}px</p>
                  <p>100dvh: {viewport.dvh100 ?? '—'}</p>
                  <p>100svh: {viewport.svh100 ?? '—'}</p>
                  <p>100lvh: {viewport.lvh100 ?? '—'}</p>
                  <p>
                    safe: T{viewport.safeArea.top} B{viewport.safeArea.bottom} L
                    {viewport.safeArea.left} R{viewport.safeArea.right}
                  </p>
                  <p>display: {viewport.displayMode}</p>
                  <p>keyboard: {viewport.keyboardOpen ? 'open' : 'closed'}</p>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <QaToggle
                  label="Simular offline"
                  active={qaFlags.simulateOffline}
                  onClick={() => toggleFlag('simulateOffline')}
                />
                <QaToggle
                  label="Permisos denegados"
                  active={qaFlags.forcePermissionDenied}
                  onClick={() => toggleFlag('forcePermissionDenied')}
                />
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                  Core loop (dev)
                </p>
                <QaAction onClick={handleForceProximity}>Forzar proximidad</QaAction>
                <QaAction onClick={handleOpenCaptureDev}>Abrir cámara (con figurita)</QaAction>
                <QaAction onClick={handleSimulateCaptureFlow}>
                  Simular captura → reward
                </QaAction>
                <QaAction onClick={handleMockGps}>GPS en Catedral (mock)</QaAction>
                <QaAction onClick={() => setQaFlag('mockPosition', null)}>Quitar GPS mock</QaAction>
                <QaAction onClick={resetQaFlags}>Reset flags QA</QaAction>
                <QaAction onClick={runDiagnostics}>Medir FPS / memoria</QaAction>
                <QaAction onClick={handleOpenReward}>Guardar figurita (sin animación)</QaAction>
              </div>

              {(fps != null || memory) && (
                <div className="mt-3 rounded-xl bg-black/40 p-3 text-xs text-zinc-300">
                  {fps != null && <p>FPS ~{fps}</p>}
                  {memory?.supported && (
                    <p>
                      Heap: {memory.usedMb}MB / {memory.totalMb}MB (límite {memory.limitMb}MB)
                    </p>
                  )}
                  {memory && !memory.supported && <p>Memoria: no disponible en este browser</p>}
                </div>
              )}

              <div className="mt-4 space-y-2 border-t border-zinc-800 pt-4">
                <QaAction onClick={() => resetProgress()}>Resetear progreso</QaAction>
                <QaAction onClick={() => unlockAllFigures()}>Desbloquear todo</QaAction>
                <QaAction danger onClick={() => clearStorage()}>Limpiar localStorage</QaAction>
                <QaAction onClick={handleShowState}>Ver estado Zustand</QaAction>
                <QaAction onClick={() => setShowPerf((v) => !v)}>
                  {showPerf ? 'Ocultar' : 'Ver'} performance
                </QaAction>
              </div>

              <PerformanceDebugPanel isOpen={showPerf} onClose={() => setShowPerf(false)} />

              {snapshot && (
                <pre className="mt-4 max-h-48 overflow-auto rounded-xl bg-black/50 p-3 text-[10px] text-zinc-300">
                  {JSON.stringify(snapshot, null, 2)}
                </pre>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function QaToggle({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[44px] rounded-xl px-3 py-2 text-xs font-medium ${
        active ? 'bg-zinc-900 text-progress' : 'bg-zinc-800 text-zinc-300'
      }`}
    >
      {label}
    </button>
  )
}

function QaAction({ children, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full min-h-[44px] rounded-xl py-3 text-sm font-medium ${
        danger ? 'bg-red-950 text-red-300' : 'bg-zinc-800'
      }`}
    >
      {children}
    </button>
  )
}
