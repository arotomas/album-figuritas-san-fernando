import { getActiveMapDebugFlagLabels, isMapDebugActive } from '../../config/mapDebug'

/** Banner fijo cuando hay flags de diagnóstico activos. */
export function MapDebugStatusBanner() {
  if (!isMapDebugActive()) return null

  const labels = getActiveMapDebugFlagLabels()

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-[max(0.5rem,env(safe-area-inset-top))] z-[8000] flex justify-center px-2"
      role="status"
    >
      <p className="rounded-lg bg-black/80 px-3 py-1.5 text-center font-mono text-[10px] leading-snug text-lime-300">
        MAP DEBUG: {labels.join(' · ')}
        <span className="mt-0.5 block text-white/50">Consola → filtrar [map-debug</span>
      </p>
    </div>
  )
}
