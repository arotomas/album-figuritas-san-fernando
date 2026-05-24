import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { hasMinimumRole } from '../utils/roles'

const NAV_ITEMS = [
  { to: '/admin', end: true, label: 'Dashboard', minRole: 'admin' },
  { to: '/admin/players', label: 'Jugadores', minRole: 'moderator' },
  { to: '/admin/figures', label: 'Figuritas', minRole: 'admin' },
  { to: '/admin/captures', label: 'Capturas', minRole: 'moderator' },
  { to: '/admin/map', label: 'Mapa', minRole: 'admin' },
]

const PAGE_TITLES = {
  '/admin': 'Dashboard',
  '/admin/players': 'Jugadores',
  '/admin/figures': 'Figuritas',
  '/admin/captures': 'Capturas',
  '/admin/map': 'Mapa admin',
}

function navLinkClass({ isActive }) {
  return `block rounded-xl px-3 py-2.5 transition-colors ${
    isActive ? 'bg-white/10 text-white' : 'text-slate-200 hover:bg-white/10'
  }`
}

export function AdminLayout() {
  const location = useLocation()
  const supabaseProfile = useAppStore((state) => state.supabaseProfile)
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Administración'
  const visibleNavItems = NAV_ITEMS.filter((item) =>
    hasMinimumRole(supabaseProfile, item.minRole),
  )

  return (
    <>
      <div className="flex h-full items-center justify-center bg-warm-white px-6 text-center lg:hidden">
        <div className="max-w-sm rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-ink">Panel Admin</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Este panel está pensado para usarse desde una computadora.
          </p>
        </div>
      </div>

      <div className="hidden h-full overflow-hidden bg-slate-100 text-ink lg:flex">
        <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-slate-950 px-4 py-6 text-white">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Supabase Admin
            </p>
            <h1 className="mt-2 text-2xl font-black leading-tight">Panel Admin</h1>
            <p className="mt-2 text-xs leading-5 text-slate-300">
              Capturas, jugadores, figuritas y mapa.
            </p>
          </div>

          <nav className="mt-8 space-y-1.5 text-sm font-semibold">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                relative="path"
                className={navLinkClass}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="shrink-0 border-b border-slate-200 bg-white px-6 py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              Dashboard operativo
            </p>
            <h2 className="mt-1 text-2xl font-black">{pageTitle}</h2>
          </header>

          <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-6">
            <div className="mx-auto w-full min-w-0 max-w-[1560px] space-y-7">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </>
  )
}
