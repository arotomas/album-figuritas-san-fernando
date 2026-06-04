import { useActiveAlbum } from '../../hooks/useActiveAlbum'

/** Etiqueta discreta del álbum activo (solo mapa; sin selector). */
export function ActiveAlbumLabel({ className = '' }) {
  const { activeAlbum } = useActiveAlbum()

  if (!activeAlbum?.title) return null

  return (
    <div
      className={`pointer-events-none rounded-full border border-white/15 bg-charcoal/70 px-3 py-1.5 shadow-md backdrop-blur-sm ${className}`.trim()}
      aria-live="polite"
    >
      <p className="font-display text-xs font-bold tracking-wide text-white/90">
        {activeAlbum.title}
      </p>
    </div>
  )
}
