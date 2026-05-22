import { Suspense } from 'react'
import { LazyMotion, domAnimation } from 'framer-motion'
import { AppRoutes } from './routes'
import { HydrationScreen } from './components/layout/HydrationScreen'
import { ConnectionStatus } from './components/qa/ConnectionStatus'
import { QAOverlay } from './components/qa/QAOverlay'
import { AppSkeleton } from './components/performance/AppSkeleton'
import { usePersistedAlbum } from './hooks/usePersistedAlbum'

function App() {
  const { hasHydrated } = usePersistedAlbum()

  if (!hasHydrated) {
    return (
      <div className="app-shell overflow-x-hidden bg-[#0a0a0b] text-ink">
        <HydrationScreen />
      </div>
    )
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="app-shell overflow-x-hidden bg-warm-white text-ink">
        <ConnectionStatus />
        <Suspense fallback={<AppSkeleton />}>
          <AppRoutes />
        </Suspense>
        <QAOverlay />
      </div>
    </LazyMotion>
  )
}

export default App
