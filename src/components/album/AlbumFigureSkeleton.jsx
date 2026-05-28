export function AlbumFigureSkeleton({ compact = false }) {
  return (
    <div
      className={`map-skeleton-pulse w-full overflow-hidden rounded-[1.35rem] border-2 border-border/60 bg-surface/80 ${
        compact ? 'album-featured-image-compact min-h-[235px]' : 'min-h-[235px]'
      }`}
      aria-hidden
    />
  )
}

export function AlbumScreenSkeleton() {
  return (
    <div className="my-figures-screen relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className="album-sticky-bar safe-x shrink-0">
        <div className="px-5 py-3.5 sm:px-6">
          <div className="mx-auto w-full max-w-[720px]">
            <div className="map-skeleton-pulse h-3.5 w-24 rounded bg-border/70" />
            <div className="map-skeleton-pulse mt-2 h-2 w-full rounded-full bg-border/50" />
            <div className="map-skeleton-pulse mt-2 h-3 w-[80%] rounded bg-border/40" />
          </div>
        </div>
      </div>

      <div className="my-figures-scroll relative z-10 min-h-0 flex-1 scroll-y-app px-4 pt-3">
        <div className="album-page-shell mx-auto w-full max-w-[720px] rounded-[2rem] px-3 py-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <AlbumFigureSkeleton key={index} compact />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
