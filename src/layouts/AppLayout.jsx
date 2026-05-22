import { Outlet } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { Logo } from '../components/Logo'

export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="safe-top shrink-0 border-b border-border/60 px-6 py-4">
        <Logo size="sm" />
      </header>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}
