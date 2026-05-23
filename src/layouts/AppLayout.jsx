import { Outlet } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { Logo } from '../components/Logo'
import { useQaMode } from '../utils/qaMode'

export function AppLayout() {
  const { isQaActive } = useQaMode()

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      {isQaActive && (
        <div
          data-qa-banner="true"
          className="safe-top safe-x shrink-0 border-b border-cyan-500/40 bg-cyan-100 px-4 py-1.5 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-900"
        >
          QA ENABLED
        </div>
      )}

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
