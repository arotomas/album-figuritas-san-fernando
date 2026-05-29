import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { isQaShellActive, setQaAccessContext, syncQaFromUrl } from './qa/qaCore'
import { LazyMotion, domAnimation } from 'framer-motion'
import { AppRoutes } from './routes'
import { AppBootScreen } from './components/layout/AppBootScreen'
import { SplashScreen } from './components/splash'
import { ViewportProvider } from './components/layout/ViewportProvider'
import { AppSkeleton } from './components/performance/AppSkeleton'
import { ConnectionStatus } from './components/qa/ConnectionStatus'
import { QaDevShell } from './components/qa/QaDevShell'
import { useAppBootGate } from './hooks/useAppBootGate'
import { useAppStore } from './store/useAppStore'
import { BuildShaBadge } from './components/layout/BuildShaBadge'
import { MAP_DIAGNOSTIC_UI_CLEAN } from './config/mapDiagnosticUi'
import { MapDiagnosticOverlay } from './components/map/MapDiagnosticOverlay'

function App() {
  const { isBooting, bootPhase } = useAppBootGate()
  const [splashComplete, setSplashComplete] = useState(false)
  const handleSplashComplete = useCallback(() => {
    setSplashComplete(true)
  }, [])
  const location = useLocation()
  const clearQaTestFigure = useAppStore((state) => state.clearQaTestFigure)
  const supabaseProfile = useAppStore((state) => state.supabaseProfile)
  const supabaseUserId = useAppStore((state) => state.supabaseUserId)
  const isAuthenticated = useAppStore((state) => state.isAuthenticated)
  const authBootstrapped = useAppStore((state) => state.authBootstrapped)
  const wasAuthenticatedRef = useRef(null)
  const isAdminRoute = location.pathname.startsWith('/admin')
  const isMapRoute =
    location.pathname === '/map' || location.pathname.startsWith('/map/')
  const mapDiagnosticClean = MAP_DIAGNOSTIC_UI_CLEAN && isMapRoute

  useEffect(() => {
    if (!authBootstrapped) return
    if (wasAuthenticatedRef.current === true && !isAuthenticated) {
      setSplashComplete(false)
    }
    wasAuthenticatedRef.current = isAuthenticated
  }, [authBootstrapped, isAuthenticated])

  useEffect(() => {
    setQaAccessContext({
      profile: supabaseProfile,
      userId: supabaseUserId,
      email: supabaseProfile?.email ?? null,
    })
  }, [supabaseProfile, supabaseUserId])

  useEffect(() => {
    syncQaFromUrl(location.search)
  }, [location.pathname, location.search])

  useEffect(() => {
    if (!isQaShellActive() && useAppStore.getState().qaTestFigure) {
      clearQaTestFigure()
    }
  }, [clearQaTestFigure, location.pathname, location.search])

  if (isBooting) {
    return (
      <ViewportProvider>
        <BuildShaBadge />
        <div className="app-shell bg-app h-app overflow-hidden text-ink">
          <AppBootScreen phase={bootPhase} />
        </div>
      </ViewportProvider>
    )
  }

  if (!splashComplete) {
    return (
      <ViewportProvider>
        <BuildShaBadge />
        <SplashScreen onComplete={handleSplashComplete} />
      </ViewportProvider>
    )
  }

  return (
    <ViewportProvider>
      {!mapDiagnosticClean ? <BuildShaBadge /> : null}
      {mapDiagnosticClean ? <MapDiagnosticOverlay /> : null}
      <LazyMotion features={domAnimation} strict>
        <div
          className={`app-shell h-app overflow-hidden text-ink ${
            isAdminRoute ? 'app-shell-admin' : ''
          }`}
        >
          {!mapDiagnosticClean ? <ConnectionStatus /> : null}
          {!mapDiagnosticClean ? <QaDevShell /> : null}
          <Suspense fallback={<AppSkeleton />}>
            <AppRoutes />
          </Suspense>
        </div>
      </LazyMotion>
    </ViewportProvider>
  )
}

export default App
