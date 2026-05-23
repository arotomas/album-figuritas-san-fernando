import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminFigureLocationPicker } from '../components/admin/AdminFigureLocationPicker'
import { AdminMap } from '../components/admin/AdminMap'
import {
  createFigureAdmin,
  deleteFigureAdmin,
  getAdminStats,
  getFiguresAdmin,
  getRecentCaptures,
  toggleFigureActive,
  updateFigureAdmin,
} from '../services/supabase/adminDashboard'

const RARITY_OPTIONS = ['común', 'rara', 'épica', 'legendaria']
const DEFAULT_FIGURE_FORM = {
  title: '',
  description: '',
  rarity: 'común',
  image_url: '',
  lat: '',
  lng: '',
  capture_radius: 250,
  active: true,
}

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

function toFigureForm(figure) {
  if (!figure) return DEFAULT_FIGURE_FORM

  return {
    title: figure.title ?? '',
    description: figure.description ?? '',
    rarity: figure.rarity ?? 'común',
    image_url: figure.image_url ?? '',
    lat: figure.lat ?? '',
    lng: figure.lng ?? '',
    capture_radius: figure.capture_radius ?? 250,
    active: Boolean(figure.active),
  }
}

function validateFigureForm(form) {
  if (!form.title.trim()) return 'El título es obligatorio.'
  if (!RARITY_OPTIONS.includes(form.rarity)) return 'La rareza no es válida.'
  if (form.lat === '' || form.lng === '') return 'Latitud y longitud son obligatorias.'

  const lat = Number(form.lat)
  const lng = Number(form.lng)
  const radius = Number(form.capture_radius || 250)

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return 'La latitud no es válida.'
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return 'La longitud no es válida.'
  if (!Number.isFinite(radius) || radius <= 0) return 'El radio de captura no es válido.'

  return null
}

export function AdminScreen() {
  const [stats, setStats] = useState(null)
  const [captures, setCaptures] = useState([])
  const [figures, setFigures] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [figureFormOpen, setFigureFormOpen] = useState(false)
  const [editingFigureId, setEditingFigureId] = useState(null)
  const [figureForm, setFigureForm] = useState(DEFAULT_FIGURE_FORM)
  const [figureFormError, setFigureFormError] = useState(null)
  const [figureSaving, setFigureSaving] = useState(false)
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

  const openNewFigureForm = () => {
    setEditingFigureId(null)
    setFigureForm(DEFAULT_FIGURE_FORM)
    setFigureFormError(null)
    setFigureFormOpen(true)
  }

  const openEditFigureForm = (figure) => {
    setEditingFigureId(figure.id)
    setFigureForm(toFigureForm(figure))
    setFigureFormError(null)
    setFigureFormOpen(true)
  }

  const updateFigureForm = (key, value) => {
    setFigureForm((current) => ({ ...current, [key]: value }))
  }

  const handleSaveFigure = async (event) => {
    event.preventDefault()
    const validationError = validateFigureForm(figureForm)
    if (validationError) {
      setFigureFormError(validationError)
      return
    }

    setFigureSaving(true)
    setFigureFormError(null)
    setError(null)
    try {
      const saved = editingFigureId
        ? await updateFigureAdmin(editingFigureId, figureForm)
        : await createFigureAdmin(figureForm)

      setFigures((current) => {
        if (!editingFigureId) return [...current, saved]
        return current.map((figure) => (figure.id === saved.id ? saved : figure))
      })
      setFigureFormOpen(false)
      setEditingFigureId(null)
      setFigureForm(DEFAULT_FIGURE_FORM)
    } catch (saveError) {
      setFigureFormError(saveError?.message ?? 'No pudimos guardar la figurita.')
    } finally {
      setFigureSaving(false)
    }
  }

  const handleDeleteFigure = async (figure) => {
    const confirmed = window.confirm(
      `¿Eliminar "${figure.title}"? Si ya tiene capturas, Supabase puede impedirlo por seguridad.`,
    )
    if (!confirmed) return

    setDeletingId(figure.id)
    setError(null)
    try {
      await deleteFigureAdmin(figure.id)
      setFigures((current) => current.filter((item) => item.id !== figure.id))
      if (editingFigureId === figure.id) {
        setFigureFormOpen(false)
        setEditingFigureId(null)
      }
    } catch (deleteError) {
      setError(
        deleteError?.message ??
          'No pudimos eliminar la figurita. Podés desactivarla si ya tiene capturas.',
      )
    } finally {
      setDeletingId(null)
    }
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
              <div className="flex items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-black">Figuritas</h2>
                  <p className="mt-1 text-sm text-muted">
                    Administrá puntos reales del catálogo en Supabase.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openNewFigureForm}
                  className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
                >
                  Nueva figurita
                </button>
              </div>

              {figureFormOpen && (
                <form
                  onSubmit={handleSaveFigure}
                  className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black">
                        {editingFigureId ? 'Editar figurita' : 'Nueva figurita'}
                      </h3>
                      <p className="mt-1 text-sm text-muted">
                        Los cambios se guardan directo en Supabase usando la sesión admin.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFigureFormOpen(false)
                        setEditingFigureId(null)
                        setFigureFormError(null)
                      }}
                      className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-bold"
                    >
                      Cerrar
                    </button>
                  </div>

                  {figureFormError && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      {figureFormError}
                    </div>
                  )}

                  <div className="mt-5 grid grid-cols-[420px_minmax(0,1fr)] gap-6">
                    <div className="space-y-4">
                      <label className="block text-xs font-bold uppercase tracking-wide text-muted">
                        Título
                        <input
                          value={figureForm.title}
                          onChange={(event) => updateFigureForm('title', event.target.value)}
                          className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
                          required
                        />
                      </label>

                      <label className="block text-xs font-bold uppercase tracking-wide text-muted">
                        Descripción
                        <textarea
                          value={figureForm.description}
                          onChange={(event) =>
                            updateFigureForm('description', event.target.value)
                          }
                          rows="4"
                          className="mt-1 block w-full resize-none rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
                        />
                      </label>

                      <div className="grid grid-cols-2 gap-3">
                        <label className="block text-xs font-bold uppercase tracking-wide text-muted">
                          Rareza
                          <select
                            value={figureForm.rarity}
                            onChange={(event) => updateFigureForm('rarity', event.target.value)}
                            className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
                          >
                            {RARITY_OPTIONS.map((rarity) => (
                              <option key={rarity} value={rarity}>
                                {rarity}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block text-xs font-bold uppercase tracking-wide text-muted">
                          Activa
                          <select
                            value={figureForm.active ? 'true' : 'false'}
                            onChange={(event) =>
                              updateFigureForm('active', event.target.value === 'true')
                            }
                            className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
                          >
                            <option value="true">Sí</option>
                            <option value="false">No</option>
                          </select>
                        </label>
                      </div>

                      <label className="block text-xs font-bold uppercase tracking-wide text-muted">
                        Imagen URL
                        <input
                          value={figureForm.image_url}
                          onChange={(event) => updateFigureForm('image_url', event.target.value)}
                          placeholder="https://..."
                          className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
                        />
                      </label>

                      {figureForm.image_url && (
                        <img
                          src={figureForm.image_url}
                          alt="Preview figurita"
                          className="h-32 w-32 rounded-2xl object-cover ring-1 ring-border"
                        />
                      )}

                      <div className="grid grid-cols-3 gap-3">
                        <label className="block text-xs font-bold uppercase tracking-wide text-muted">
                          Lat
                          <input
                            type="number"
                            step="any"
                            value={figureForm.lat}
                            onChange={(event) => updateFigureForm('lat', event.target.value)}
                            className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
                            required
                          />
                        </label>
                        <label className="block text-xs font-bold uppercase tracking-wide text-muted">
                          Lng
                          <input
                            type="number"
                            step="any"
                            value={figureForm.lng}
                            onChange={(event) => updateFigureForm('lng', event.target.value)}
                            className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
                            required
                          />
                        </label>
                        <label className="block text-xs font-bold uppercase tracking-wide text-muted">
                          Radio
                          <input
                            type="number"
                            min="1"
                            value={figureForm.capture_radius}
                            onChange={(event) =>
                              updateFigureForm('capture_radius', event.target.value)
                            }
                            className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
                          />
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={figureSaving}
                        className="w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                      >
                        {figureSaving ? 'Guardando…' : 'Guardar figurita'}
                      </button>
                    </div>

                    <AdminFigureLocationPicker
                      lat={figureForm.lat}
                      lng={figureForm.lng}
                      radius={figureForm.capture_radius}
                      onChange={({ lat, lng }) => {
                        updateFigureForm('lat', lat)
                        updateFigureForm('lng', lng)
                      }}
                    />
                  </div>
                </form>
              )}

              <div className="mt-5 overflow-hidden rounded-2xl border border-border">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-3">Imagen</th>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Rarity</th>
                      <th className="px-4 py-3">Active</th>
                      <th className="px-4 py-3">Lat</th>
                      <th className="px-4 py-3">Lng</th>
                      <th className="px-4 py-3">Radio</th>
                      <th className="px-4 py-3">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {figures.map((figure) => (
                      <tr key={figure.id} className="border-t border-border/70">
                        <td className="px-4 py-4">
                          {figure.image_url ? (
                            <img
                              src={figure.image_url}
                              alt={figure.title}
                              className="h-14 w-14 rounded-xl object-cover ring-1 ring-border"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-xs text-muted">
                              Sin imagen
                            </div>
                          )}
                        </td>
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
                        <td className="px-4 py-4 font-mono text-xs">
                          {figure.capture_radius ?? 250}m
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openEditFigureForm(figure)}
                              className="rounded-xl border border-border bg-white px-4 py-2 text-xs font-bold"
                            >
                              Editar
                            </button>
                          <button
                            type="button"
                            disabled={togglingId === figure.id}
                            onClick={() => handleToggleFigure(figure)}
                            className="rounded-xl border border-border bg-surface px-4 py-2 text-xs font-bold disabled:opacity-50"
                          >
                            {figure.active ? 'Desactivar' : 'Activar'}
                          </button>
                            <button
                              type="button"
                              disabled={deletingId === figure.id}
                              onClick={() => handleDeleteFigure(figure)}
                              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 disabled:opacity-50"
                            >
                              Eliminar
                            </button>
                          </div>
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
