import { useCallback, useEffect, useMemo, useState } from 'react'
import { getRecentCaptures } from '../../services/supabase/adminDashboard'
import {
  AdminErrorBanner,
  formatDate,
  normalizeText,
  PhotoPreviewModal,
  ReviewBadge,
} from '../../components/admin/adminShared'

export function AdminCapturesPage() {
  const [captures, setCaptures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [filters, setFilters] = useState({
    user: '',
    figure: '',
    status: 'all',
    dateFrom: '',
    dateTo: '',
  })

  const loadCaptures = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const nextCaptures = await getRecentCaptures(200)
      setCaptures(nextCaptures)
    } catch (loadError) {
      setError(loadError?.message ?? 'No pudimos cargar las capturas.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCaptures()
  }, [loadCaptures])

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
      const status = capture.validation_status ?? 'pending'
      const matchesStatus = filters.status === 'all' || status === filters.status

      return matchesUser && matchesFigure && matchesFrom && matchesTo && matchesStatus
    })
  }, [captures, filters])

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({ user: '', figure: '', status: 'all', dateFrom: '', dateTo: '' })
  }

  return (
    <>
      <div className="flex items-end justify-between">
        <p className="text-sm text-muted">
          Vista de consulta. La moderación se hace por álbum completo en Jugadores.
        </p>
        <div className="flex items-center gap-3">
          {loading && <p className="text-sm font-medium text-muted">Cargando datos…</p>}
          <button
            type="button"
            onClick={() => loadCaptures()}
            className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-bold"
          >
            Actualizar
          </button>
        </div>
      </div>

      <AdminErrorBanner message={error} />

      <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
        <div className="grid grid-cols-6 gap-3">
          <label className="text-xs font-bold uppercase tracking-wide text-muted">
            Usuario
            <input
              value={filters.user}
              onChange={(event) => updateFilter('user', event.target.value)}
              list="admin-capture-users"
              placeholder="Buscar usuario"
              className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
            />
          </label>
          <datalist id="admin-capture-users">
            {userOptions.map((user) => (
              <option key={user} value={user} />
            ))}
          </datalist>

          <label className="text-xs font-bold uppercase tracking-wide text-muted">
            Figurita
            <input
              value={filters.figure}
              onChange={(event) => updateFilter('figure', event.target.value)}
              list="admin-capture-figures"
              placeholder="Buscar figurita"
              className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
            />
          </label>
          <datalist id="admin-capture-figures">
            {figureOptions.map((figure) => (
              <option key={figure} value={figure} />
            ))}
          </datalist>

          <label className="text-xs font-bold uppercase tracking-wide text-muted">
            Estado
            <select
              value={filters.status}
              onChange={(event) => updateFilter('status', event.target.value)}
              className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="approved">Aprobado</option>
              <option value="rejected">Rechazado</option>
            </select>
          </label>

          <label className="text-xs font-bold uppercase tracking-wide text-muted">
            Desde
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => updateFilter('dateFrom', event.target.value)}
              className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
            />
          </label>

          <label className="text-xs font-bold uppercase tracking-wide text-muted">
            Hasta
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) => updateFilter('dateTo', event.target.value)}
              className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
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

        <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
          <table className="min-w-[1080px] text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Foto</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Figurita</th>
                <th className="px-4 py-3">Lat/Lng</th>
                <th className="px-4 py-3">Device</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredCaptures.map((capture) => (
                <tr key={capture.id} className="border-t border-border/70 align-middle">
                  <td className="px-4 py-3">
                    {capture.photo_url ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPhotoPreview({
                            url: capture.photo_url,
                            title: `${capture.figureTitle} — ${capture.username}`,
                          })
                        }
                      >
                        <img
                          src={capture.photo_url}
                          alt={`Captura de ${capture.figureTitle}`}
                          className="h-20 w-20 rounded-xl object-cover ring-1 ring-border"
                          loading="lazy"
                        />
                      </button>
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-slate-100 text-xs text-muted">
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
                  <td className="px-4 py-3">
                    <ReviewBadge status={capture.validation_status ?? 'pending'} />
                  </td>
                </tr>
              ))}
              {!filteredCaptures.length && !loading && (
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

      <PhotoPreviewModal preview={photoPreview} onClose={() => setPhotoPreview(null)} />
    </>
  )
}
