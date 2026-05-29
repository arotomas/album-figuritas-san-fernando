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
import { MapRouteAppAudit } from './components/debug/MapRouteAppAudit'
import { recordMapNavStep } from './components/debug/mapNavAudit'

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
    recordMapNavStep(`App: ${location.pathname}`, location)
  }, [location.pathname, location.search, location.key])

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
      <BuildShaBadge />
      <MapRouteAppAudit />
      <LazyMotion features={domAnimation} strict>
        <div
          className={`app-shell h-app overflow-hidden text-ink ${
            isAdminRoute ? 'app-shell-admin' : ''
          }`}
        >
          <ConnectionStatus />
          <QaDevShell />
          <Suspense fallback={<AppSkeleton />}>
            <AppRoutes />
          </Suspense>
        </div>
      </LazyMotion>
    </ViewportProvider>
  )
}

export default App
