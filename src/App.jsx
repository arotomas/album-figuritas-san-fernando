import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { isQaShellActive, setQaAccessContext, syncQaFromUrl } from './qa/qaCore'
import { LazyMotion, domAnimation } from 'framer-motion'
import { AppRoutes } from './routes'
import { AppBootScreen } from './components/layout/AppBootScreen'
import { SplashScreen } from './components/splash'
import { ViewportProvider } from './components/layout/ViewportProvider'
import { AppSkeleton } from './components/performance/AppSkeleton'
import { PushInviteBanner } from './components/push/PushInviteBanner'
import { PushForegroundToast } from './components/push/PushForegroundToast'
import { ConnectionStatus } from './components/qa/ConnectionStatus'
import { QaDevShell } from './components/qa/QaDevShell'
import { useAppBootGate } from './hooks/useAppBootGate'
import { isAdminExperiencePath } from './utils/postAuthRedirect'
import { useAppStore } from './store/useAppStore'

function App() {
  const location = useLocation()
  const isAdminExperience = isAdminExperiencePath(location.pathname, location.search)
  const { isBooting, bootPhase } = useAppBootGate({ skipReadyHold: isAdminExperience })
  const [splashComplete, setSplashComplete] = useState(() => isAdminExperience)
  const handleSplashComplete = useCallback(() => {
    setSplashComplete(true)
  }, [])
  const clearQaTestFigure = useAppStore((state) => state.clearQaTestFigure)
  const supabaseProfile = useAppStore((state) => state.supabaseProfile)
  const supabaseUserId = useAppStore((state) => state.supabaseUserId)
  const isAuthenticated = useAppStore((state) => state.isAuthenticated)
  const authBootstrapped = useAppStore((state) => state.authBootstrapped)
  const wasAuthenticatedRef = useRef(null)
  const isAdminRoute = location.pathname.startsWith('/admin')

  useEffect(() => {
    if (isAdminExperience) {
      setSplashComplete(true)
    }
  }, [isAdminExperience])

  useEffect(() => {
    if (!authBootstrapped) return
    if (wasAuthenticatedRef.current === true && !isAuthenticated && !isAdminExperience) {
      setSplashComplete(false)
    }
    wasAuthenticatedRef.current = isAuthenticated
  }, [authBootstrapped, isAuthenticated, isAdminExperience])

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

  if (isBooting && !isAdminExperience) {
    return (
      <ViewportProvider>
        <div className="app-shell bg-app h-app overflow-hidden text-ink">
          <AppBootScreen phase={bootPhase} />
        </div>
      </ViewportProvider>
    )
  }

  if (!splashComplete && !isAdminExperience) {
    return (
      <ViewportProvider>
        <SplashScreen onComplete={handleSplashComplete} />
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
          <PushInviteBanner />
          <PushForegroundToast />
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
