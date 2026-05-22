import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, selectProgress, TOTAL_FIGURES } from '../../store/useAppStore'
import { storageService } from '../../services/storage/storageService'
import { STORAGE_KEY } from '../../config/persistence'
import { PerformanceDebugPanel } from '../performance/PerformanceDebugPanel'
import {
  getQaState,
  setQaFlag,
  resetQaFlags,
  measureFpsSample,
  readMemoryDiagnostics,
} from '../../utils/diagnostics'
import { mockFigures } from '../../data/mockFigures'

export function QAOverlay() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [snapshot, setSnapshot] = useState(null)
  const [showPerf, setShowPerf] = useState(false)
  const [fps, setFps] = useState(null)
  const [memory, setMemory] = useState(null)
  const [qaFlags, setQaFlags] = useState(getQaState())

  const resetProgress = useAppStore((state) => state.resetProgress)
  const unlockAllFigures = useAppStore((state) => state.unlockAllFigures)
  const clearStorage = useAppStore((state) => state.clearStorage)
  const getPersistedSnapshot = useAppStore((state) => state.getPersistedSnapshot)
  const setNearFigure = useAppStore((state) => state.setNearFigure)
  const obtainFigureWithPhoto = useAppStore((state) => state.obtainFigureWithPhoto)
  const progress = useAppStore(selectProgress)
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

  if (!import.meta.env.DEV) return null

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
        className="safe-bottom fixed bottom-24 right-4 z-50 flex h-11 min-w-[44px] items-center justify-center rounded-full bg-zinc-900 px-3 text-[10px] font-bold text-lime-400 shadow-lg"
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
                Progreso: {progress}/{TOTAL_FIGURES} · {albumStatus}
              </p>
              {lastSavedAt && (
                <p className="mt-1 text-xs text-zinc-500">
                  Último guardado: {new Date(lastSavedAt).toLocaleString('es-AR')}
                </p>
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
                <QaAction onClick={handleMockGps}>GPS en Catedral (mock)</QaAction>
                <QaAction onClick={() => setQaFlag('mockPosition', null)}>Quitar GPS mock</QaAction>
                <QaAction onClick={resetQaFlags}>Reset flags QA</QaAction>
                <QaAction onClick={runDiagnostics}>Medir FPS / memoria</QaAction>
                <QaAction onClick={handleOpenReward}>Ir a álbum (mock unlock)</QaAction>
                <QaAction onClick={() => navigate('/capture')}>Abrir /capture</QaAction>
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
        active ? 'bg-lime-950 text-lime-300' : 'bg-zinc-800 text-zinc-300'
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
