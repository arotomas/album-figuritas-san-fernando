import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAdminStats, getRecentCaptures } from '../../services/supabase/adminDashboard'
import {
  AdminErrorBanner,
  formatDate,
  ReviewBadge,
  StatCard,
} from '../../components/admin/adminShared'

const QUICK_LINKS = [
  { to: '/admin/players', label: 'Jugadores', description: 'Revisar álbumes e inscriptos' },
  { to: '/admin/figures', label: 'Figuritas', description: 'CRUD de puntos del catálogo' },
  { to: '/admin/collections', label: 'Colecciones', description: 'Universo del álbum y agrupación' },
  { to: '/admin/captures', label: 'Capturas', description: 'Validar fotos y ubicaciones' },
  { to: '/admin/map', label: 'Mapa', description: 'Vista geográfica del sistema' },
]

export function AdminDashboardPage() {
  const [stats, setStats] = useState(null)
  const [captures, setCaptures] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [nextStats, nextCaptures] = await Promise.all([
        getAdminStats(),
        getRecentCaptures(12),
      ])
      setStats(nextStats)
      setCaptures(nextCaptures)
    } catch (loadError) {
      setError(loadError?.message ?? 'No pudimos cargar el dashboard.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const recentCaptures = useMemo(() => captures.slice(0, 8), [captures])

  return (
    <>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted">Resumen general del sistema conectado a Supabase.</p>
        </div>
        <div className="flex items-center gap-3">
          {loading && <p className="text-sm font-medium text-muted">Cargando datos…</p>}
          <button
            type="button"
            onClick={() => loadDashboard()}
            className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-bold"
          >
            Actualizar
          </button>
        </div>
      </div>

      <AdminErrorBanner message={error} />

      <div className="grid grid-cols-3 gap-5">
        <StatCard label="Total usuarios" value={stats?.totalUsers ?? '-'} />
        <StatCard label="Total capturas" value={stats?.totalCaptures ?? '-'} />
        <StatCard label="Figuritas desbloqueadas" value={stats?.totalUnlockedFigures ?? '-'} />
      </div>

      <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
        <h3 className="text-xl font-black">Accesos rápidos</h3>
        <div className="mt-4 grid grid-cols-2 gap-4">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-2xl border border-border bg-slate-50 p-5 transition-colors hover:border-slate-300 hover:bg-white"
            >
              <p className="text-lg font-black text-ink">{link.label}</p>
              <p className="mt-1 text-sm text-muted">{link.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black">Últimas capturas</h3>
            <p className="mt-1 text-sm text-muted">Las 8 capturas más recientes del sistema.</p>
          </div>
          <Link
            to="/admin/captures"
            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white"
          >
            Ver todas
          </Link>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Foto</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Figurita</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {recentCaptures.map((capture) => (
                <tr key={capture.id} className="border-t border-border/70 align-middle">
                  <td className="px-4 py-3">
                    {capture.photo_url ? (
                      <img
                        src={capture.photo_url}
                        alt={`Captura de ${capture.figureTitle}`}
                        className="h-14 w-14 rounded-xl object-cover ring-1 ring-border"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-xs text-muted">
                        Sin foto
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium">
                    {formatDate(capture.created_at)}
                  </td>
                  <td className="px-4 py-3">{capture.username}</td>
                  <td className="px-4 py-3">{capture.figureTitle}</td>
                  <td className="px-4 py-3">
                    <ReviewBadge status={capture.validation_status ?? 'pending'} />
                  </td>
                </tr>
              ))}
              {!recentCaptures.length && !loading && (
                <tr>
                  <td colSpan="5" className="px-4 py-10 text-center text-muted">
                    Todavía no hay capturas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
