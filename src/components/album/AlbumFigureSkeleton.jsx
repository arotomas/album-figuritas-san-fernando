export function AlbumFigureSkeleton({ compact = false }) {
  return (
    <div
      className={`map-skeleton-pulse w-full overflow-hidden rounded-[1.35rem] border-2 border-border/60 bg-surface/80 ${
        compact ? 'album-featured-image-compact min-h-[280px]' : 'min-h-[420px]'
      }`}
      aria-hidden
    />
  )
}

export function AlbumScreenSkeleton() {
  return (
    <div className="my-figures-screen relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className="relative z-10 shrink-0 px-6 pb-3 pt-4">
        <div className="map-skeleton-pulse h-4 w-24 rounded bg-border/80" />
        <div className="map-skeleton-pulse mt-3 h-7 w-40 rounded bg-border/80" />
        <div className="map-skeleton-pulse mt-4 h-2 w-full rounded-full bg-border/60" />
      </div>
      <div className="relative z-10 flex flex-1 items-center justify-center px-4">
        <AlbumFigureSkeleton />
      </div>
      <div className="relative z-10 shrink-0 border-t border-border/40 px-4 py-3">
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="map-skeleton-pulse h-[140px] w-[120px] shrink-0 rounded-2xl bg-border/60"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
