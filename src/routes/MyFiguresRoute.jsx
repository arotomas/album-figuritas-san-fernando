import { lazy, Suspense } from 'react'
import { useAppStore } from '../store/useAppStore'
import { AlbumScreenErrorBoundary } from '../components/album/AlbumScreenErrorBoundary'
import { AlbumScreenSkeleton } from '../components/album/AlbumFigureSkeleton'
import { albumTrace, prefetchMyFiguresChunk, routeTrace } from '../utils/capturePipelineTrace'

function loadMyFiguresInner() {
  routeTrace('lazy import start', { module: 'MyFiguresScreenInner' })
  const started = performance.now()

  return prefetchMyFiguresChunk()
    .then((module) => {
      if (!module.MyFiguresScreenInner) {
        throw new Error('MyFiguresScreenInner export missing')
      }
      routeTrace('lazy import end', {
        module: 'MyFiguresScreenInner',
        ms: Math.round(performance.now() - started),
      })
      return { default: module.MyFiguresScreenInner }
    })
    .catch((error) => {
      routeTrace('lazy import failed', {
        module: 'MyFiguresScreenInner',
        message: error?.message,
        stack: error?.stack ?? null,
      })
      albumTrace('lazy chunk failed — MyFiguresScreenInner', {
        message: error?.message,
      })
      throw error
    })
}

const LazyMyFiguresInner = lazy(() => loadMyFiguresInner())

function MyFiguresSuspenseFallback() {
  routeTrace('suspense fallback', { route: '/my-figures' })
  return <AlbumScreenSkeleton />
}

export function MyFiguresRoute() {
  const lastObtenidaFigureId = useAppStore((state) => state.lastObtenidaFigureId)

  routeTrace('MyFiguresRoute render', { lastObtenidaFigureId })

  return (
    <AlbumScreenErrorBoundary lastObtenidaFigureId={lastObtenidaFigureId}>
      <Suspense fallback={<MyFiguresSuspenseFallback />}>
        <LazyMyFiguresInner />
      </Suspense>
    </AlbumScreenErrorBoundary>
  )
}
