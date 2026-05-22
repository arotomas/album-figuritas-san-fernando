import { Outlet } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { Logo } from '../components/Logo'

export function AppLayout() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <header className="safe-top safe-x shrink-0 border-b border-border/60 px-6 py-3">
        <Logo size="sm" />
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#141416]">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}
