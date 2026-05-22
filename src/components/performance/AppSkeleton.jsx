export function MapSkeleton({ message = 'Cargando mapa…' }) {
  return (
    <div className="absolute inset-0 flex flex-col bg-zinc-900">
      <div className="flex flex-1 flex-col items-center justify-center px-8">
        <div className="map-skeleton-pulse mb-6 h-16 w-16 rounded-2xl bg-zinc-800" />
        <p className="text-sm font-medium text-zinc-400">{message}</p>
      </div>
      <div className="mx-4 mb-4 space-y-3 rounded-2xl bg-zinc-800/80 p-4">
        <div className="map-skeleton-pulse h-3 w-3/4 rounded bg-zinc-700" />
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="map-skeleton-pulse h-3 flex-1 rounded-sm bg-zinc-700" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function CameraSkeleton() {
  return (
    <div className="safe-top safe-bottom flex min-h-dvh flex-col items-center justify-center bg-black">
      <div className="map-skeleton-pulse mb-6 h-20 w-20 rounded-full border-4 border-zinc-800 bg-zinc-900" />
      <p className="text-sm text-zinc-400">Preparando cámara…</p>
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center px-8">
      <div className="map-skeleton-pulse h-12 w-12 rounded-xl bg-border" />
      <p className="mt-4 text-sm text-muted">Cargando…</p>
    </div>
  )
}

export function AppSkeleton() {
  return (
    <div className="safe-top safe-bottom flex min-h-dvh flex-col items-center justify-center bg-white">
      <div className="map-skeleton-pulse h-16 w-16 rounded-2xl bg-ink/90" />
      <p className="mt-4 text-sm text-muted">Iniciando app…</p>
    </div>
  )
}
