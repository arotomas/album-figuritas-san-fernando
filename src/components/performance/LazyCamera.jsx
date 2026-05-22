import { lazy, Suspense } from 'react'
import { CameraSkeleton } from './AppSkeleton'

const CaptureFlow = lazy(() =>
  import('../../pages/CaptureFlow').then((module) => ({
    default: module.CaptureFlow,
  })),
)

export function LazyCamera(props) {
  return (
    <Suspense fallback={<CameraSkeleton />}>
      <CaptureFlow {...props} />
    </Suspense>
  )
}
