import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AuthBrandHeader } from '../components/auth'
import { BottomNav } from '../components/BottomNav'
import { PwaInstallBanner } from '../components/pwa/PwaInstallBanner'
import { navTrace } from '../utils/capturePipelineTrace'
import { useExplorationRouteCleanup } from '../hooks/useExplorationRouteCleanup'
import { PlayerPointsBadge } from '../components/points/PlayerPointsBadge'

export function AppLayout() {
  const location = useLocation()
  useExplorationRouteCleanup()

  useEffect(() => {
    navTrace('AppLayout mount', { pathname: location.pathname })
    return () => {
      navTrace('AppLayout unmount', { pathname: location.pathname })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    navTrace('AppLayout render', { pathname: location.pathname })
  }, [location.pathname])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <header className="safe-top safe-x relative shrink-0 border-b border-border/60 bg-warm-white px-4 py-2">
        <AuthBrandHeader variant="app" />
        <div className="pointer-events-none absolute right-4 top-1/2 z-10 -translate-y-1/2 sm:right-5">
          <div className="pointer-events-auto">
            <PlayerPointsBadge />
          </div>
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#141416]">
        <PwaInstallBanner />
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}
