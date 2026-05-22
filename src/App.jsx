import { Suspense } from 'react'
import { LazyMotion, domAnimation } from 'framer-motion'
import { AppRoutes } from './routes'
import { HydrationScreen } from './components/layout/HydrationScreen'
import { ViewportProvider } from './components/layout/ViewportProvider'
import { ConnectionStatus } from './components/qa/ConnectionStatus'
import { QAOverlay } from './components/qa/QAOverlay'
import { AppSkeleton } from './components/performance/AppSkeleton'
import { usePersistedAlbum } from './hooks/usePersistedAlbum'

function App() {
  const { hasHydrated } = usePersistedAlbum()

  if (!hasHydrated) {
    return (
      <ViewportProvider>
        <div className="app-shell h-app overflow-hidden bg-[#0a0a0b] text-ink">
          <HydrationScreen />
        </div>
      </ViewportProvider>
    )
  }

  return (
    <ViewportProvider>
      <LazyMotion features={domAnimation} strict>
        <div className="app-shell h-app overflow-hidden text-ink">
          <ConnectionStatus />
          <Suspense fallback={<AppSkeleton />}>
            <AppRoutes />
          </Suspense>
          <QAOverlay />
        </div>
      </LazyMotion>
    </ViewportProvider>
  )
}

export default App
