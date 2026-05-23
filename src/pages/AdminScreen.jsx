import { useEffect, useMemo, useState } from 'react'
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
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
    </div>
  )
}

export function AdminScreen() {
  const [stats, setStats] = useState(null)
  const [captures, setCaptures] = useState([])
  const [figures, setFigures] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState(null)

  const recentCaptures = useMemo(() => captures.slice(0, 8), [captures])

  useEffect(() => {
    let cancelled = false

    async function loadAdmin() {
      setLoading(true)
      setError(null)
      try {
        const [nextStats, nextCaptures, nextFigures] = await Promise.all([
          getAdminStats(),
          getRecentCaptures(30),
          getFiguresAdmin(),
        ])

        if (cancelled) return
        setStats(nextStats)
        setCaptures(nextCaptures)
        setFigures(nextFigures)
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.message ?? 'No pudimos cargar el panel admin.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadAdmin()

    return () => {
      cancelled = true
    }
  }, [])

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

  return (
    <div className="h-full overflow-y-auto bg-warm-white px-6 py-6 text-ink">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              Supabase Admin
            </p>
            <h1 className="mt-1 text-3xl font-bold">Panel Admin</h1>
          </div>
          {loading && <p className="text-sm text-muted">Cargando datos…</p>}
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Total usuarios" value={stats?.totalUsers ?? '-'} />
          <StatCard label="Total capturas" value={stats?.totalCaptures ?? '-'} />
          <StatCard
            label="Figuritas desbloqueadas"
            value={stats?.totalUnlockedFigures ?? '-'}
          />
        </div>

        <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">Mapa admin</h2>
          <p className="mb-4 mt-1 text-sm text-muted">
            Verde: figuritas. Azul: capturas recientes.
          </p>
          <AdminMap figures={figures} captures={recentCaptures} />
        </section>

        <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">Últimas capturas</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-2 pr-4">Fecha</th>
                  <th className="py-2 pr-4">Usuario</th>
                  <th className="py-2 pr-4">Figurita</th>
                  <th className="py-2 pr-4">Foto</th>
                  <th className="py-2 pr-4">Lat/Lng</th>
                  <th className="py-2 pr-4">Device</th>
                  <th className="py-2 pr-4">Validation</th>
                </tr>
              </thead>
              <tbody>
                {captures.map((capture) => (
                  <tr key={capture.id} className="border-b border-border/50">
                    <td className="py-3 pr-4 whitespace-nowrap">{formatDate(capture.created_at)}</td>
                    <td className="py-3 pr-4">{capture.username}</td>
                    <td className="py-3 pr-4">{capture.figureTitle}</td>
                    <td className="py-3 pr-4">
                      {capture.photo_url ? (
                        <a
                          href={capture.photo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-blue-700 underline"
                        >
                          Ver foto
                        </a>
                      ) : (
                        <span className="text-muted">Sin foto</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-xs">
                      {capture.lat != null && capture.lng != null
                        ? `${Number(capture.lat).toFixed(5)}, ${Number(capture.lng).toFixed(5)}`
                        : '-'}
                    </td>
                    <td className="py-3 pr-4">{capture.device ?? '-'}</td>
                    <td className="py-3 pr-4">{capture.validation_status ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">Figuritas</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Rarity</th>
                  <th className="py-2 pr-4">Active</th>
                  <th className="py-2 pr-4">Lat</th>
                  <th className="py-2 pr-4">Lng</th>
                  <th className="py-2 pr-4">Acción</th>
                </tr>
              </thead>
              <tbody>
                {figures.map((figure) => (
                  <tr key={figure.id} className="border-b border-border/50">
                    <td className="py-3 pr-4 font-medium">{figure.title}</td>
                    <td className="py-3 pr-4">{figure.rarity}</td>
                    <td className="py-3 pr-4">{figure.active ? 'Sí' : 'No'}</td>
                    <td className="py-3 pr-4">{figure.lat}</td>
                    <td className="py-3 pr-4">{figure.lng}</td>
                    <td className="py-3 pr-4">
                      <button
                        type="button"
                        disabled={togglingId === figure.id}
                        onClick={() => handleToggleFigure(figure)}
                        className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-bold disabled:opacity-50"
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
    </div>
  )
}
