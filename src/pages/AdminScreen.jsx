import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminMap } from '../components/admin/AdminMap'
import {
  getAdminStats,
  getFiguresAdmin,
  getRecentCaptures,
  toggleFigureActive,
} from '../services/supabase/adminDashboard'

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('es-AR')
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
    </div>
  )
}

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function AdminScreen() {
  const [stats, setStats] = useState(null)
  const [captures, setCaptures] = useState([])
  const [figures, setFigures] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState(null)
  const [filters, setFilters] = useState({
    user: '',
    figure: '',
    dateFrom: '',
    dateTo: '',
  })

  const userOptions = useMemo(
    () => [...new Set(captures.map((capture) => capture.username).filter(Boolean))].sort(),
    [captures],
  )
  const figureOptions = useMemo(
    () => [...new Set(captures.map((capture) => capture.figureTitle).filter(Boolean))].sort(),
    [captures],
  )

  const filteredCaptures = useMemo(() => {
    const user = normalizeText(filters.user)
    const figure = normalizeText(filters.figure)
    const dateFrom = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : null
    const dateTo = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`) : null

    return captures.filter((capture) => {
      const capturedAt = capture.created_at ? new Date(capture.created_at) : null
      const matchesUser = !user || normalizeText(capture.username).includes(user)
      const matchesFigure = !figure || normalizeText(capture.figureTitle).includes(figure)
      const matchesFrom = !dateFrom || (capturedAt && capturedAt >= dateFrom)
      const matchesTo = !dateTo || (capturedAt && capturedAt <= dateTo)

      return matchesUser && matchesFigure && matchesFrom && matchesTo
    })
  }, [captures, filters])

  const recentCaptures = useMemo(() => filteredCaptures.slice(0, 20), [filteredCaptures])

  const loadAdmin = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const [nextStats, nextCaptures, nextFigures] = await Promise.all([
        getAdminStats(),
        getRecentCaptures(80),
        getFiguresAdmin(),
      ])

      setStats(nextStats)
      setCaptures(nextCaptures)
      setFigures(nextFigures)
    } catch (loadError) {
      setError(loadError?.message ?? 'No pudimos cargar el panel admin.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAdmin()
  }, [loadAdmin])

  const handleToggleFigure = async (figure) => {
    setTogglingId(figure.id)
    setError(null)
    try {
      const updated = await toggleFigureActive(figure.id, !figure.active)
      setFigures((current) =>
        current.map((item) =>
          item.id === updated.id ? { ...item, active: updated.active } : item,
        ),
      )
    } catch (toggleError) {
      setError(toggleError?.message ?? 'No pudimos actualizar la figurita.')
    } finally {
      setTogglingId(null)
    }
  }

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({ user: '', figure: '', dateFrom: '', dateTo: '' })
  }

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
              Vista de escritorio para revisar capturas, fotos, ubicaciones y estado de
              figuritas.
            </p>
          </div>

          <nav className="mt-10 space-y-2 text-sm font-semibold text-slate-200">
            <a href="#capturas" className="block rounded-xl bg-white/10 px-4 py-3">
              Capturas
            </a>
            <a href="#mapa" className="block rounded-xl px-4 py-3 hover:bg-white/10">
              Mapa
            </a>
            <a href="#figuritas" className="block rounded-xl px-4 py-3 hover:bg-white/10">
              Figuritas
            </a>
          </nav>

          <div className="mt-auto rounded-2xl bg-white/10 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Acciones</p>
            <button
              type="button"
              onClick={() => loadAdmin({ silent: true })}
              className="mt-3 w-full rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950"
            >
              Actualizar datos
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto p-8">
          <div className="mx-auto min-w-[1180px] max-w-[1560px] space-y-7">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted">
                  Dashboard operativo
                </p>
                <h2 className="mt-1 text-4xl font-black">Administración</h2>
              </div>
              {loading && <p className="text-sm font-medium text-muted">Cargando datos…</p>}
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="grid grid-cols-3 gap-5">
              <StatCard label="Total usuarios" value={stats?.totalUsers ?? '-'} />
              <StatCard label="Total capturas" value={stats?.totalCaptures ?? '-'} />
              <StatCard
                label="Figuritas desbloqueadas"
                value={stats?.totalUnlockedFigures ?? '-'}
              />
            </div>

            <section
              id="capturas"
              className="rounded-3xl border border-border bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-black">Capturas</h2>
                  <p className="mt-1 text-sm text-muted">
                    {filteredCaptures.length} de {captures.length} capturas visibles
                  </p>
                </div>

                <div className="grid grid-cols-5 gap-3">
                  <label className="text-xs font-bold uppercase tracking-wide text-muted">
                    Usuario
                    <input
                      value={filters.user}
                      onChange={(event) => updateFilter('user', event.target.value)}
                      list="admin-users"
                      placeholder="Buscar usuario"
                      className="mt-1 block w-44 rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
                    />
                  </label>
                  <datalist id="admin-users">
                    {userOptions.map((user) => (
                      <option key={user} value={user} />
                    ))}
                  </datalist>

                  <label className="text-xs font-bold uppercase tracking-wide text-muted">
                    Figurita
                    <input
                      value={filters.figure}
                      onChange={(event) => updateFilter('figure', event.target.value)}
                      list="admin-figures"
                      placeholder="Buscar figurita"
                      className="mt-1 block w-52 rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
                    />
                  </label>
                  <datalist id="admin-figures">
                    {figureOptions.map((figure) => (
                      <option key={figure} value={figure} />
                    ))}
                  </datalist>

                  <label className="text-xs font-bold uppercase tracking-wide text-muted">
                    Desde
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(event) => updateFilter('dateFrom', event.target.value)}
                      className="mt-1 block w-40 rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
                    />
                  </label>

                  <label className="text-xs font-bold uppercase tracking-wide text-muted">
                    Hasta
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(event) => updateFilter('dateTo', event.target.value)}
                      className="mt-1 block w-40 rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-5 h-10 rounded-xl border border-border bg-surface px-4 text-sm font-bold"
                  >
                    Limpiar
                  </button>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-border">
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-3">Foto</th>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Usuario</th>
                      <th className="px-4 py-3">Figurita</th>
                      <th className="px-4 py-3">Lat/Lng</th>
                      <th className="px-4 py-3">Device</th>
                      <th className="px-4 py-3">Validation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCaptures.map((capture) => (
                      <tr key={capture.id} className="border-t border-border/70 align-middle">
                        <td className="px-4 py-3">
                          {capture.photo_url ? (
                            <a href={capture.photo_url} target="_blank" rel="noreferrer">
                              <img
                                src={capture.photo_url}
                                alt={`Captura de ${capture.figureTitle}`}
                                className="h-16 w-16 rounded-xl object-cover ring-1 ring-border"
                                loading="lazy"
                              />
                            </a>
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100 text-xs text-muted">
                              Sin foto
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium">
                          {formatDate(capture.created_at)}
                        </td>
                        <td className="px-4 py-3">{capture.username}</td>
                        <td className="px-4 py-3">{capture.figureTitle}</td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {capture.lat != null && capture.lng != null
                            ? `${Number(capture.lat).toFixed(5)}, ${Number(capture.lng).toFixed(5)}`
                            : '-'}
                        </td>
                        <td className="px-4 py-3">{capture.device ?? '-'}</td>
                        <td className="px-4 py-3">{capture.validation_status ?? '-'}</td>
                      </tr>
                    ))}
                    {!filteredCaptures.length && (
                      <tr>
                        <td colSpan="7" className="px-4 py-10 text-center text-muted">
                          No hay capturas para los filtros seleccionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section id="mapa" className="rounded-3xl border border-border bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black">Mapa admin</h2>
                  <p className="mt-1 text-sm text-muted">
                    Verde: figuritas. Azul: capturas filtradas recientes.
                  </p>
                </div>
              </div>
              <AdminMap figures={figures} captures={recentCaptures} className="h-[680px]" />
            </section>

            <section
              id="figuritas"
              className="rounded-3xl border border-border bg-white p-6 shadow-sm"
            >
              <h2 className="text-2xl font-black">Figuritas</h2>
              <div className="mt-5 overflow-hidden rounded-2xl border border-border">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Rarity</th>
                      <th className="px-4 py-3">Active</th>
                      <th className="px-4 py-3">Lat</th>
                      <th className="px-4 py-3">Lng</th>
                      <th className="px-4 py-3">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {figures.map((figure) => (
                      <tr key={figure.id} className="border-t border-border/70">
                        <td className="px-4 py-4 font-semibold">{figure.title}</td>
                        <td className="px-4 py-4">{figure.rarity}</td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              figure.active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {figure.active ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-mono text-xs">{figure.lat}</td>
                        <td className="px-4 py-4 font-mono text-xs">{figure.lng}</td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            disabled={togglingId === figure.id}
                            onClick={() => handleToggleFigure(figure)}
                            className="rounded-xl border border-border bg-surface px-4 py-2 text-xs font-bold disabled:opacity-50"
                          >
                            {figure.active ? 'Desactivar' : 'Activar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  )
}
