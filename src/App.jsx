import { Suspense, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { syncQaModeFromUrl, isQaMode } from './utils/qaMode'
import { LazyMotion, domAnimation } from 'framer-motion'
import { AppRoutes } from './routes'
import { AppBootScreen } from './components/layout/AppBootScreen'
import { ViewportProvider } from './components/layout/ViewportProvider'
import { AppSkeleton } from './components/performance/AppSkeleton'
import { ConnectionStatus } from './components/qa/ConnectionStatus'
import { useAppBootGate } from './hooks/useAppBootGate'
import { useAppStore } from './store/useAppStore'
import { isDevMode } from './utils/devMode'

function App() {
  const { isBooting, bootPhase } = useAppBootGate()
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

  if (isBooting) {
    return (
      <ViewportProvider>
        <div className="app-shell h-app overflow-hidden bg-[#0a0a0b] text-ink">
          <AppBootScreen phase={bootPhase} />
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
          <ConnectionStatus />
          <Suspense fallback={<AppSkeleton />}>
            <AppRoutes />
          </Suspense>
        </div>
      </LazyMotion>
    </ViewportProvider>
  )
}

export default App
