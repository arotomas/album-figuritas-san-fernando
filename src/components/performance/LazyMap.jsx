import { lazy, Suspense } from 'react'
import { MapSkeleton } from './AppSkeleton'

const LeafletMapView = lazy(() =>
  import('../map/LeafletMapView').then((module) => ({
    default: module.LeafletMapView,
  })),
)

export function LazyMap(props) {
  return (
    <Suspense fallback={<MapSkeleton />}>
      <LeafletMapView {...props} />
    </Suspense>
  )
}
