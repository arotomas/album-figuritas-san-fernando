import { Suspense, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { syncQaModeFromUrl, isQaMode } from './utils/qaMode'
import { LazyMotion, domAnimation } from 'framer-motion'
import { AppRoutes } from './routes'
import { HydrationScreen } from './components/layout/HydrationScreen'
import { ViewportProvider } from './components/layout/ViewportProvider'
import { AppSkeleton } from './components/performance/AppSkeleton'
import { usePersistedAlbum } from './hooks/usePersistedAlbum'
import { useSupabaseBootstrap } from './hooks/useSupabaseBootstrap'
import { useAppStore } from './store/useAppStore'
import { isDevMode } from './utils/devMode'

function App() {
  const { hasHydrated } = usePersistedAlbum()
  useSupabaseBootstrap(hasHydrated)
  const location = useLocation()
  const clearQaTestFigure = useAppStore((state) => state.clearQaTestFigure)
  const isAdminRoute = location.pathname.startsWith('/admin')

  useEffect(() => {
    syncQaModeFromUrl(location.search)
  }, [location.pathname, location.search])

  useEffect(() => {
    if (!isQaMode(location.search) && !isDevMode()) {
      clearQaTestFigure()
    }
  }, [clearQaTestFigure, location.pathname, location.search])

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
        <div
          className={`app-shell h-app overflow-hidden text-ink ${
            isAdminRoute ? 'app-shell-admin' : ''
          }`}
        >
          <Suspense fallback={<AppSkeleton />}>
            <AppRoutes />
          </Suspense>
        </div>
      </LazyMotion>
    </ViewportProvider>
  )
}

export default App
