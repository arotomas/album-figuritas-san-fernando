import { useEffect, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { usePerformanceMetrics } from '../../hooks/usePerformanceMetrics'
import {
  estimateImageMemoryBytes,
  formatBytes,
  getLocalStorageSizeBytes,
  getPerformanceMemory,
  getTotalLocalStorageBytes,
} from '../../utils/memory'
import { STORAGE_KEY } from '../../config/persistence'

export function PerformanceDebugPanel({ isOpen, onClose }) {
  const figures = useAppStore((state) => state.figures)
  const { fps, renderCount } = usePerformanceMetrics(isOpen)
  const [chunks, setChunks] = useState([])

  useEffect(() => {
    if (!isOpen) return

    const scripts = Array.from(document.querySelectorAll('script[src]'))
      .map((s) => s.src.split('/').pop())
      .filter(Boolean)

    setChunks(scripts)
  }, [isOpen])

  if (!isOpen) return null

  const albumBytes = getLocalStorageSizeBytes(STORAGE_KEY)
  const totalBytes = getTotalLocalStorageBytes()
  const imageBytes = estimateImageMemoryBytes(figures)
  const memory = getPerformanceMemory()
  const renderCounts = window.__renderCounts ?? {}

  return (
    <div className="mt-4 rounded-xl border border-zinc-700 bg-black/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-lime-300">Performance</h3>
        <button type="button" onClick={onClose} className="text-xs text-zinc-500">
          Cerrar
        </button>
      </div>

      <dl className="space-y-2 text-xs">
        <div className="flex justify-between">
          <dt className="text-zinc-500">FPS approx</dt>
          <dd className="font-mono text-white">{fps}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-zinc-500">Render ticks</dt>
          <dd className="font-mono text-white">{renderCount}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-zinc-500">localStorage álbum</dt>
          <dd className="font-mono text-white">{formatBytes(albumBytes)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-zinc-500">localStorage total</dt>
          <dd className="font-mono text-white">{formatBytes(totalBytes)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-zinc-500">Memoria imágenes</dt>
          <dd className="font-mono text-white">{formatBytes(imageBytes)}</dd>
        </div>
        {memory && (
          <div className="flex justify-between">
            <dt className="text-zinc-500">JS heap</dt>
            <dd className="font-mono text-white">
              {formatBytes(memory.usedJSHeapSize)}
            </dd>
          </div>
        )}
      </dl>

      {Object.keys(renderCounts).length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] uppercase text-zinc-500">Renders por componente</p>
          <pre className="mt-1 max-h-24 overflow-auto text-[10px] text-zinc-400">
            {JSON.stringify(renderCounts, null, 2)}
          </pre>
        </div>
      )}

      {chunks.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] uppercase text-zinc-500">Chunks cargados</p>
          <ul className="mt-1 max-h-24 overflow-auto text-[10px] text-zinc-400">
            {chunks.map((chunk) => (
              <li key={chunk}>{chunk}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
