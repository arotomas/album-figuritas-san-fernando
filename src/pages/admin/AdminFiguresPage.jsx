import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AdminFigureLocationPicker } from '../../components/admin/AdminFigureLocationPicker'
import {
  buildFigureId,
  createFigureAdmin,
  deleteFigureAdmin,
  getFiguresAdmin,
  toggleFigureActive,
  updateFigureAdmin,
} from '../../services/supabase/adminDashboard'
import {
  MARKER_ICON_MAX_BYTES,
  MARKER_ICON_MIME_TYPES,
  uploadMarkerIcon,
} from '../../services/supabase/storage'
import {
  AdminErrorBanner,
  DEFAULT_FIGURE_FORM,
  GameTypeBadges,
  getGamePlacement,
  RARITY_OPTIONS,
  toFigureForm,
  validateFigureForm,
} from '../../components/admin/adminShared'

export function AdminFiguresPage() {
  const [figures, setFigures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [togglingId, setTogglingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [figureFormOpen, setFigureFormOpen] = useState(false)
  const [editingFigureId, setEditingFigureId] = useState(null)
  const [figureForm, setFigureForm] = useState(DEFAULT_FIGURE_FORM)
  const [figureFormError, setFigureFormError] = useState(null)
  const [figureFormMessage, setFigureFormMessage] = useState(null)
  const [figureSaving, setFigureSaving] = useState(false)
  const [markerIconUploading, setMarkerIconUploading] = useState(false)
  const figureFormRef = useRef(null)
  const [figureFilters, setFigureFilters] = useState({
    type: 'all',
    status: 'all',
  })

  const loadFigures = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const nextFigures = await getFiguresAdmin()
      setFigures(nextFigures)
    } catch (loadError) {
      setError(loadError?.message ?? 'No pudimos cargar las figuritas.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadFigures()
  }, [loadFigures])

  const filteredFigures = useMemo(
    () =>
      figures.filter((figure) => {
        const placement = getGamePlacement(figure)
        const matchesType =
          figureFilters.type === 'all' ||
          (figureFilters.type === 'main' && placement.isMain) ||
          (figureFilters.type === 'bonus' && placement.isBonus) ||
          (figureFilters.type === 'hidden' && placement.isHidden)
        const matchesStatus =
          figureFilters.status === 'all' ||
          (figureFilters.status === 'active' && figure.active) ||
          (figureFilters.status === 'inactive' && !figure.active)

        return matchesType && matchesStatus
      }),
    [figureFilters, figures],
  )

  const figureFormPlacement = useMemo(() => getGamePlacement(figureForm), [figureForm])

  const updateFigureFilter = (key, value) => {
    setFigureFilters((current) => ({ ...current, [key]: value }))
  }

  const openNewFigureForm = () => {
    setEditingFigureId(null)
    setFigureForm(DEFAULT_FIGURE_FORM)
    setFigureFormError(null)
    setFigureFormMessage(null)
    setFigureFormOpen(true)
  }

  const openEditFigureForm = (figure) => {
    console.info('[admin-figures]', 'edit click', { id: figure.id, title: figure.title })
    const populatedForm = toFigureForm(figure)
    setEditingFigureId(figure.id)
    setFigureForm(populatedForm)
    setFigureFormError(null)
    setFigureFormMessage(null)
    setFigureFormOpen(true)
    console.info('[admin-figures]', 'form populated', { id: figure.id, form: populatedForm })
    window.setTimeout(() => {
      figureFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  const cancelFigureEdit = () => {
    setEditingFigureId(null)
    setFigureForm(DEFAULT_FIGURE_FORM)
    setFigureFormError(null)
    setFigureFormMessage(null)
    setFigureFormOpen(true)
  }

  const updateFigureForm = (key, value) => {
    setFigureForm((current) => ({ ...current, [key]: value }))
  }

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

  const handleMarkerIconFileChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setFigureFormError(null)
    setFigureFormMessage(null)

    if (!MARKER_ICON_MIME_TYPES.includes(file.type)) {
      setFigureFormError('El ícono debe ser PNG, WebP o SVG.')
      return
    }
    if (file.size > MARKER_ICON_MAX_BYTES) {
      setFigureFormError('El ícono no puede superar los 200 KB.')
      return
    }

    const figureId = editingFigureId || figureForm.id || buildFigureId(figureForm.title || 'figurita')
    setMarkerIconUploading(true)
    setFigureForm((current) => ({ ...current, id: figureId }))

    try {
      const result = await uploadMarkerIcon({ figureId, file })
      if (!result.ok) {
        setFigureFormError(result.reason ?? 'No pudimos subir el ícono del marcador.')
        return
      }

      setFigureForm((current) => ({
        ...current,
        id: figureId,
        marker_icon_url: result.publicUrl,
      }))
      setFigureFormMessage('Ícono del marcador subido')
    } catch (uploadError) {
      console.error('[admin-icons]', 'upload error', {
        message: uploadError?.message ?? String(uploadError),
      })
      setFigureFormError(uploadError?.message ?? 'No pudimos subir el ícono del marcador.')
    } finally {
      setMarkerIconUploading(false)
    }
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
    setFigureFormMessage(null)
    setError(null)
    try {
      const wasEditing = Boolean(editingFigureId)
      const saved = editingFigureId
        ? await updateFigureAdmin(editingFigureId, figureForm)
        : await createFigureAdmin(figureForm)

      await loadFigures({ silent: true })
      if (wasEditing) {
        setFigureForm(toFigureForm(saved))
        setFigureFormMessage('Figurita actualizada')
      } else {
        setFigureFormOpen(false)
        setEditingFigureId(null)
        setFigureForm(DEFAULT_FIGURE_FORM)
      }
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
      <div className="flex items-end justify-between">
        <p className="text-sm text-muted">Administrá puntos reales del catálogo en Supabase.</p>
        <div className="flex items-center gap-3">
          {loading && <p className="text-sm font-medium text-muted">Cargando datos…</p>}
          <button
            type="button"
            onClick={openNewFigureForm}
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
          >
            Nueva figurita
          </button>
        </div>
      </div>

      <AdminErrorBanner message={error} />

      <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-slate-50 p-4">
          <label className="text-xs font-bold uppercase tracking-wide text-muted">
            Tipo
            <select
              value={figureFilters.type}
              onChange={(event) => updateFigureFilter('type', event.target.value)}
              className="mt-1 block w-44 rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
            >
              <option value="all">Todas</option>
              <option value="main">Principal</option>
              <option value="bonus">Bonus</option>
              <option value="hidden">Ocultas</option>
            </select>
          </label>
          <label className="text-xs font-bold uppercase tracking-wide text-muted">
            Estado
            <select
              value={figureFilters.status}
              onChange={(event) => updateFigureFilter('status', event.target.value)}
              className="mt-1 block w-44 rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
            >
              <option value="all">Todas</option>
              <option value="active">Activas</option>
              <option value="inactive">Inactivas</option>
            </select>
          </label>
          <p className="pb-2 text-sm font-semibold text-muted">
            {filteredFigures.length} de {figures.length} figuritas visibles
          </p>
        </div>

        {figureFormOpen && (
          <form
            ref={figureFormRef}
            onSubmit={handleSaveFigure}
            className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-black">
                  {editingFigureId ? 'Editar figurita' : 'Nueva figurita'}
                </h3>
                <p className="mt-1 text-sm text-muted">
                  {editingFigureId
                    ? `Editando ID original: ${editingFigureId}`
                    : 'Los cambios se guardan directo en Supabase usando la sesión admin.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFigureFormOpen(false)
                  setEditingFigureId(null)
                  setFigureFormError(null)
                  setFigureFormMessage(null)
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
            {figureFormMessage && (
              <div className="mt-4 rounded-xl border border-progress/30 bg-progress/10 p-3 text-sm font-semibold text-ink">
                {figureFormMessage}
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
                    onChange={(event) => updateFigureForm('description', event.target.value)}
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

                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs font-bold uppercase tracking-wide text-muted">
                    Es bonus
                    <select
                      value={figureForm.is_bonus ? 'true' : 'false'}
                      onChange={(event) =>
                        updateFigureForm('is_bonus', event.target.value === 'true')
                      }
                      className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
                    >
                      <option value="false">No</option>
                      <option value="true">Sí</option>
                    </select>
                  </label>

                  <label className="block text-xs font-bold uppercase tracking-wide text-muted">
                    Oculta
                    <select
                      value={figureForm.is_hidden ? 'true' : 'false'}
                      onChange={(event) =>
                        updateFigureForm('is_hidden', event.target.value === 'true')
                      }
                      className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
                    >
                      <option value="false">No</option>
                      <option value="true">Sí</option>
                    </select>
                  </label>
                </div>

                <div
                  className={`rounded-2xl border p-4 ${
                    figureFormPlacement.isBonus
                      ? 'border-violet-200 bg-violet-50'
                      : 'border-progress/30 bg-progress/10'
                  }`}
                >
                  <p className="text-xs font-black uppercase tracking-wide text-muted">
                    Ubicación en el juego
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-xl font-black text-ink">{figureFormPlacement.label}</p>
                    <GameTypeBadges figure={figureForm} />
                  </div>
                  <p className="mt-2 text-sm leading-5 text-muted">{figureFormPlacement.help}</p>

                  <div className="mt-3 space-y-2 text-xs font-semibold leading-5">
                    {figureFormPlacement.isBonus && !figureFormPlacement.isForcedBonus && (
                      <p className="rounded-xl bg-white/70 px-3 py-2 text-violet-800">
                        Las épicas y legendarias se muestran en la sección Bonus.
                      </p>
                    )}
                    {figureFormPlacement.isForcedBonus && (
                      <p className="rounded-xl bg-white/70 px-3 py-2 text-violet-800">
                        Esta figurita será tratada como Bonus aunque su rareza sea común o rara.
                      </p>
                    )}
                    {figureFormPlacement.isHidden && (
                      <p className="rounded-xl bg-white/70 px-3 py-2 text-slate-800">
                        Esta figurita no aparece en el mapa hasta que el jugador esté cerca o cumpla
                        la regla de revelado.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <label className="block text-xs font-bold uppercase tracking-wide text-muted">
                    Orden
                    <input
                      type="number"
                      min="1"
                      value={figureForm.unlock_order}
                      onChange={(event) => updateFigureForm('unlock_order', event.target.value)}
                      className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
                    />
                  </label>
                  <label className="block text-xs font-bold uppercase tracking-wide text-muted">
                    Revelar tras
                    <input
                      type="number"
                      min="0"
                      value={figureForm.reveal_after_count}
                      onChange={(event) =>
                        updateFigureForm('reveal_after_count', event.target.value)
                      }
                      className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
                    />
                  </label>
                  <label className="block text-xs font-bold uppercase tracking-wide text-muted">
                    Tipo bonus
                    <select
                      value={figureForm.bonus_type}
                      onChange={(event) => updateFigureForm('bonus_type', event.target.value)}
                      className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
                    >
                      <option value="">Sin tipo</option>
                      <option value="epic">Épica</option>
                      <option value="legendary">Legendaria</option>
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
                      onChange={(event) => updateFigureForm('capture_radius', event.target.value)}
                      className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <label className="block text-xs font-bold uppercase tracking-wide text-muted">
                    Radio revelado
                    <input
                      type="number"
                      min="1"
                      value={figureForm.reveal_radius}
                      onChange={(event) => updateFigureForm('reveal_radius', event.target.value)}
                      className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
                    />
                  </label>
                  <label className="col-span-2 block text-xs font-bold uppercase tracking-wide text-muted">
                    Ícono marcador URL
                    <input
                      value={figureForm.marker_icon_url}
                      onChange={(event) => updateFigureForm('marker_icon_url', event.target.value)}
                      placeholder="PNG transparente 256x256, máx. 200 KB"
                      className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
                    />
                  </label>
                </div>

                <div className="rounded-2xl border border-border bg-white p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-border bg-slate-50">
                      {figureForm.marker_icon_url ? (
                        <img
                          src={figureForm.marker_icon_url}
                          alt="Preview ícono marcador"
                          className="h-14 w-14 object-contain"
                        />
                      ) : (
                        <span className="text-[10px] font-bold uppercase text-muted">Sin ícono</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <label className="block text-xs font-bold uppercase tracking-wide text-muted">
                        Subir ícono del marcador
                        <input
                          type="file"
                          accept={MARKER_ICON_MIME_TYPES.join(',')}
                          onChange={handleMarkerIconFileChange}
                          disabled={markerIconUploading}
                          className="mt-2 block w-full text-sm normal-case tracking-normal text-ink file:mr-3 file:rounded-xl file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white disabled:opacity-50"
                        />
                      </label>
                      <p className="mt-2 text-xs leading-5 text-muted">
                        Recomendado: PNG transparente 256x256 px, máximo 200 KB. También acepta WebP
                        y SVG.
                      </p>
                      {markerIconUploading && (
                        <p className="mt-2 text-xs font-bold text-progress">Subiendo ícono…</p>
                      )}
                    </div>
                  </div>
                </div>

                <label className="block text-xs font-bold uppercase tracking-wide text-muted">
                  Tamaño ícono marcador
                  <input
                    type="number"
                    min="1"
                    value={figureForm.marker_icon_size}
                    onChange={(event) => updateFigureForm('marker_icon_size', event.target.value)}
                    className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
                  />
                </label>

                <button
                  type="submit"
                  disabled={figureSaving || markerIconUploading}
                  className="w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  {markerIconUploading
                    ? 'Subiendo ícono…'
                    : figureSaving
                      ? 'Guardando…'
                      : editingFigureId
                        ? 'Guardar cambios'
                        : 'Guardar figurita'}
                </button>
                {editingFigureId && (
                  <button
                    type="button"
                    onClick={cancelFigureEdit}
                    className="w-full rounded-xl border border-border bg-white px-5 py-3 text-sm font-bold text-ink"
                  >
                    Cancelar edición
                  </button>
                )}
              </div>

              <AdminFigureLocationPicker
                lat={figureForm.lat}
                lng={figureForm.lng}
                radius={figureForm.capture_radius}
                onChange={({ lat, lng }) => {
                  console.info('[admin-figures]', 'location selected', { lat, lng })
                  updateFigureForm('lat', lat)
                  updateFigureForm('lng', lng)
                }}
              />
            </div>
          </form>
        )}

        <div className="mt-5 overflow-x-auto rounded-2xl border border-border">
          <table className="min-w-[1680px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Imagen</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Rarity</th>
                <th className="px-4 py-3">Tipo en juego</th>
                <th className="px-4 py-3">Bonus</th>
                <th className="px-4 py-3">Oculta</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Orden</th>
                <th className="px-4 py-3">Reveal</th>
                <th className="px-4 py-3">Lat</th>
                <th className="px-4 py-3">Lng</th>
                <th className="px-4 py-3">Radio</th>
                <th className="px-4 py-3">Ícono</th>
                <th className="sticky right-0 z-10 bg-slate-50 px-4 py-3 shadow-[-8px_0_12px_rgba(15,23,42,0.06)]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredFigures.map((figure) => (
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
                    <GameTypeBadges figure={figure} />
                  </td>
                  <td className="px-4 py-4">{figure.is_bonus ? 'Sí' : 'No'}</td>
                  <td className="px-4 py-4">{figure.is_hidden ? 'Sí' : 'No'}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        figure.active
                          ? 'bg-progress/15 text-progress'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {figure.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-mono text-xs">{figure.unlock_order ?? '-'}</td>
                  <td className="px-4 py-4 font-mono text-xs">
                    {figure.reveal_after_count ?? 0}
                  </td>
                  <td className="px-4 py-4 font-mono text-xs">{figure.lat}</td>
                  <td className="px-4 py-4 font-mono text-xs">{figure.lng}</td>
                  <td className="px-4 py-4 font-mono text-xs">{figure.capture_radius ?? 250}m</td>
                  <td className="px-4 py-4">
                    {figure.marker_icon_url ? (
                      <img
                        src={figure.marker_icon_url}
                        alt=""
                        className="h-8 w-8 rounded object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-xs text-muted">-</span>
                    )}
                  </td>
                  <td className="sticky right-0 bg-white px-4 py-4 shadow-[-8px_0_12px_rgba(15,23,42,0.06)]">
                    <div className="flex min-w-[260px] flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => openEditFigureForm(figure)}
                        className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white"
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
              {!filteredFigures.length && !loading && (
                <tr>
                  <td colSpan="14" className="px-4 py-10 text-center text-muted">
                    No hay figuritas para los filtros seleccionados.
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
