import { lazy, Suspense } from 'react'
import { MapSkeleton } from './AppSkeleton'

const MapView = lazy(() =>
  import('../map/MapView').then((module) => ({ default: module.MapView })),
)

export function LazyMap(props) {
  return (
    <Suspense fallback={<MapSkeleton />}>
      <MapView {...props} />
    </Suspense>
  )
}
