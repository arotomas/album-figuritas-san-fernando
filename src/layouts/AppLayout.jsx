import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AuthBrandHeader } from '../components/auth'
import { BottomNav } from '../components/BottomNav'
import { PwaInstallBanner } from '../components/pwa/PwaInstallBanner'
import { navTrace } from '../utils/capturePipelineTrace'
import { useExplorationRouteCleanup } from '../hooks/useExplorationRouteCleanup'
import { PlayerPointsBadge } from '../components/points/PlayerPointsBadge'
import { ActiveAlbumSelector } from '../components/album/ActiveAlbumSelector'

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
      <header className="safe-top safe-x shrink-0 border-b border-border/60 bg-warm-white">
        <div className="px-4 pb-1 pt-2">
          <AuthBrandHeader variant="app" />
        </div>
        <div className="flex items-center gap-3 border-t border-border/40 px-4 py-1.5">
          <ActiveAlbumSelector variant="header" className="min-w-0 flex-1" />
          <PlayerPointsBadge layout="inline" className="ml-auto shrink-0" />
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
