import { lazy, Suspense } from 'react'
import { MapSkeleton } from './AppSkeleton'

const LeafletMapView = lazy(() =>
  import('../map/LeafletMapView').then((module) => ({
    default: module.LeafletMapView,
  })),
)

export function LazyMap({ className = '', ...props }) {
  return (
    <div className="relative h-full min-h-0 w-full flex-1">
      <Suspense fallback={<MapSkeleton />}>
        <LeafletMapView {...props} className={`h-full w-full ${className}`.trim()} />
      </Suspense>
    </div>
  )
}
