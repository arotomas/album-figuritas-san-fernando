import { NavLink, Outlet, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/admin', end: true, label: 'Dashboard' },
  { to: '/admin/players', label: 'Jugadores' },
  { to: '/admin/figures', label: 'Figuritas' },
  { to: '/admin/captures', label: 'Capturas' },
  { to: '/admin/map', label: 'Mapa' },
]

const PAGE_TITLES = {
  '/admin': 'Dashboard',
  '/admin/players': 'Jugadores',
  '/admin/figures': 'Figuritas',
  '/admin/captures': 'Capturas',
  '/admin/map': 'Mapa admin',
}

function navLinkClass({ isActive }) {
  return `block rounded-xl px-4 py-3 transition-colors ${
    isActive ? 'bg-white/10 text-white' : 'text-slate-200 hover:bg-white/10'
  }`
}

export function AdminLayout() {
  const location = useLocation()
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Administración'

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
        <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-950 px-6 py-7 text-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              Supabase Admin
            </p>
            <h1 className="mt-3 text-3xl font-black">Panel Admin</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Vista de escritorio para revisar capturas, jugadores, figuritas y mapa.
            </p>
          </div>

          <nav className="mt-10 space-y-2 text-sm font-semibold">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="shrink-0 border-b border-slate-200 bg-white px-8 py-5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              Dashboard operativo
            </p>
            <h2 className="mt-1 text-3xl font-black">{pageTitle}</h2>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto p-8">
            <div className="mx-auto min-w-[1180px] max-w-[1560px] space-y-7">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </>
  )
}
