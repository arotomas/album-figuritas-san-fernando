import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, selectProgress, TOTAL_FIGURES } from '../../store/useAppStore'
import { storageService } from '../../services/storage/storageService'
import { STORAGE_KEY } from '../../config/persistence'
import { PerformanceDebugPanel } from '../performance/PerformanceDebugPanel'

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [snapshot, setSnapshot] = useState(null)
  const [showPerf, setShowPerf] = useState(false)

  const resetProgress = useAppStore((state) => state.resetProgress)
  const unlockAllFigures = useAppStore((state) => state.unlockAllFigures)
  const clearStorage = useAppStore((state) => state.clearStorage)
  const getPersistedSnapshot = useAppStore((state) => state.getPersistedSnapshot)
  const progress = useAppStore(selectProgress)
  const albumStatus = useAppStore((state) => state.albumStatus)
  const lastSavedAt = useAppStore((state) => state.lastSavedAt)

  if (!import.meta.env.DEV) return null

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
        className="fixed bottom-24 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-lime-400 shadow-lg"
        aria-label="Panel debug"
      >
        DEV
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
              className="safe-bottom max-h-[80dvh] w-full overflow-y-auto rounded-t-3xl bg-zinc-900 p-6 text-white"
            >
              <h2 className="text-lg font-bold">Debug Panel</h2>
              <p className="mt-1 text-xs text-zinc-400">
                Progreso: {progress}/{TOTAL_FIGURES} · {albumStatus}
              </p>
              {lastSavedAt && (
                <p className="mt-1 text-xs text-zinc-500">
                  Último guardado:{' '}
                  {new Date(lastSavedAt).toLocaleString('es-AR')}
                </p>
              )}

              <div className="mt-6 space-y-2">
                <button
                  type="button"
                  onClick={() => resetProgress()}
                  className="w-full rounded-xl bg-zinc-800 py-3 text-sm font-medium"
                >
                  Resetear progreso
                </button>
                <button
                  type="button"
                  onClick={() => unlockAllFigures()}
                  className="w-full rounded-xl bg-zinc-800 py-3 text-sm font-medium"
                >
                  Desbloquear todo
                </button>
                <button
                  type="button"
                  onClick={() => clearStorage()}
                  className="w-full rounded-xl bg-red-950 py-3 text-sm font-medium text-red-300"
                >
                  Limpiar localStorage
                </button>
                <button
                  type="button"
                  onClick={handleShowState}
                  className="w-full rounded-xl bg-lime-950 py-3 text-sm font-medium text-lime-300"
                >
                  Ver estado Zustand
                </button>
                <button
                  type="button"
                  onClick={() => setShowPerf((v) => !v)}
                  className="w-full rounded-xl bg-zinc-800 py-3 text-sm font-medium"
                >
                  {showPerf ? 'Ocultar' : 'Ver'} performance
                </button>
              </div>

              <PerformanceDebugPanel
                isOpen={showPerf}
                onClose={() => setShowPerf(false)}
              />

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
