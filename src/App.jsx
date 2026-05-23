import { Suspense, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { syncQaModeFromUrl, isQaMode } from './utils/qaMode'
import { LazyMotion, domAnimation } from 'framer-motion'
import { AppRoutes } from './routes'
import { HydrationScreen } from './components/layout/HydrationScreen'
import { ViewportProvider } from './components/layout/ViewportProvider'
import { ConnectionStatus } from './components/qa/ConnectionStatus'
import { QAOverlay } from './components/qa/QAOverlay'
import { AppSkeleton } from './components/performance/AppSkeleton'
import { usePersistedAlbum } from './hooks/usePersistedAlbum'
import { useSupabaseBootstrap } from './hooks/useSupabaseBootstrap'
import { useAppStore } from './store/useAppStore'
import { isDevMode } from './utils/devMode'
import { sessionDebug } from './utils/sessionDebug'
import { inspectSupabaseAuthStorage } from './utils/sessionDebug'
import { getSupabaseProjectRef } from './utils/authDebug'

function App() {
  const { hasHydrated } = usePersistedAlbum()
  const isAuthenticated = useAppStore((state) => state.isAuthenticated)
  const username = useAppStore((state) => state.user?.username)
  useSupabaseBootstrap(hasHydrated && isAuthenticated && Boolean(username?.trim()))
  const location = useLocation()
  const clearQaTestFigure = useAppStore((state) => state.clearQaTestFigure)
  const isAdminRoute = location.pathname.startsWith('/admin')

  useEffect(() => {
    if (hasHydrated) {
      sessionDebug.info('after hydration — app ready', {
        authStorage: inspectSupabaseAuthStorage(getSupabaseProjectRef()),
        isAuthenticated,
        username: username ?? null,
      })
    }
  }, [hasHydrated, isAuthenticated, username])

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
