import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createEventAdmin,
  deleteEventAdmin,
  getEventsAdmin,
  toggleEventActive,
  updateEventAdmin,
} from '../../services/supabase/events'
import { setRemoteAlbumEvents } from '../../utils/eventRegistry'
import { useAlbumCollectionsBootstrap } from '../../hooks/useAlbumCollectionsBootstrap'
import { AdminErrorBanner, formatDate } from '../../components/admin/adminShared'
import {
  buildEventId,
  DEFAULT_EVENT_FORM,
  EVENT_AMBIENCE_OPTIONS,
  EVENT_EDITION_OPTIONS,
  EVENT_VISIBILITY_OPTIONS,
  getEventAdminPreview,
  toEventForm,
  validateEventForm,
} from '../../components/admin/adminEventsShared'

export function AdminEventsPage() {
  useAlbumCollectionsBootstrap(true)

  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(DEFAULT_EVENT_FORM)
  const [formError, setFormError] = useState(null)
  const [formMessage, setFormMessage] = useState(null)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const loadEvents = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const rows = await getEventsAdmin()
      setEvents(rows)
      setRemoteAlbumEvents(rows.filter((item) => item.active), { reason: 'admin-refresh' })
    } catch (loadError) {
      setError(loadError?.message ?? 'No pudimos cargar los eventos.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadEvents()
  }, [loadEvents])

  const sortedEvents = useMemo(
    () =>
      [...events].sort((a, b) => {
        const aTime = a.startsAt ? Date.parse(a.startsAt) : Number.MAX_SAFE_INTEGER
        const bTime = b.startsAt ? Date.parse(b.startsAt) : Number.MAX_SAFE_INTEGER
        return aTime - bTime
      }),
    [events],
  )

  const openNewForm = () => {
    setEditingId(null)
    setForm(DEFAULT_EVENT_FORM)
    setFormError(null)
    setFormMessage(null)
    setFormOpen(true)
  }

  const openEditForm = (event) => {
    setEditingId(event.id)
    setForm(toEventForm(event))
    setFormError(null)
    setFormMessage(null)
    setFormOpen(true)
  }

  const updateForm = (key, value) => {
    setForm((current) => {
      const next = { ...current, [key]: value }
      if (key === 'label' && !editingId && !current.slug) {
        next.slug = buildEventId(value)
        next.id = buildEventId(value)
      }
      return next
    })
  }

  const handleSave = async (event) => {
    event.preventDefault()
    const validationError = validateEventForm(form, { isEdit: Boolean(editingId) })
    if (validationError) {
      setFormError(validationError)
      return
    }

    setSaving(true)
    setFormError(null)
    setFormMessage(null)
    try {
      if (editingId) {
        await updateEventAdmin(editingId, form)
        setFormMessage('Evento actualizado')
      } else {
        await createEventAdmin(form)
        setFormOpen(false)
        setEditingId(null)
        setForm(DEFAULT_EVENT_FORM)
      }
      await loadEvents({ silent: true })
    } catch (saveError) {
      setFormError(saveError?.message ?? 'No pudimos guardar el evento.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (eventItem) => {
    setTogglingId(eventItem.id)
    try {
      await toggleEventActive(eventItem.id, !eventItem.active)
      await loadEvents({ silent: true })
    } catch (toggleError) {
      setError(toggleError?.message ?? 'No pudimos cambiar el estado.')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (eventItem) => {
    const confirmed = window.confirm(`¿Eliminar evento "${eventItem.label}"?`)
    if (!confirmed) return

    setDeletingId(eventItem.id)
    try {
      await deleteEventAdmin(eventItem.id)
      if (editingId === eventItem.id) {
        setFormOpen(false)
        setEditingId(null)
      }
      await loadEvents({ silent: true })
    } catch (deleteError) {
      setError(deleteError?.message ?? 'No pudimos eliminar el evento.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <div className="flex items-end justify-between">
        <p className="text-sm text-muted">
          Eventos temporales — source of truth para ventanas de colecciones y figuritas.
        </p>
        <div className="flex items-center gap-3">
          {loading && <p className="text-sm font-medium text-muted">Cargando…</p>}
          <button
            type="button"
            onClick={openNewForm}
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
          >
            Nuevo evento
          </button>
        </div>
      </div>

      <AdminErrorBanner message={error} />

      {formOpen && (
        <form
          onSubmit={handleSave}
          className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-black">
                {editingId ? 'Editar evento' : 'Nuevo evento'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setFormOpen(false)
                setEditingId(null)
                setFormError(null)
              }}
              className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-bold"
            >
              Cerrar
            </button>
          </div>

          {formError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {formError}
            </div>
          )}
          {formMessage && (
            <div className="mt-4 rounded-xl border border-progress/30 bg-progress/10 p-3 text-sm font-semibold text-ink">
              {formMessage}
            </div>
          )}

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block text-xs font-bold uppercase tracking-wide text-muted">
              Nombre
              <input
                value={form.label}
                onChange={(event) => updateForm('label', event.target.value)}
                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
                required
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted">
              ID
              <input
                value={form.id}
                onChange={(event) => updateForm('id', event.target.value)}
                disabled={Boolean(editingId)}
                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink disabled:opacity-60"
                required
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted">
              Slug
              <input
                value={form.slug}
                onChange={(event) => updateForm('slug', event.target.value)}
                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
                required
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted">
              Badge
              <input
                value={form.badge}
                onChange={(event) => updateForm('badge', event.target.value)}
                placeholder="Noche"
                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
              />
            </label>
            <label className="md:col-span-2 block text-xs font-bold uppercase tracking-wide text-muted">
              Descripción
              <textarea
                value={form.description}
                onChange={(event) => updateForm('description', event.target.value)}
                rows="3"
                className="mt-1 block w-full resize-none rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted">
              Portada URL
              <input
                value={form.cover_image}
                onChange={(event) => updateForm('cover_image', event.target.value)}
                placeholder="https://..."
                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted">
              Ambience
              <select
                value={form.ambience}
                onChange={(event) => updateForm('ambience', event.target.value)}
                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
              >
                {EVENT_AMBIENCE_OPTIONS.map((option) => (
                  <option key={option.value || 'none'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted">
              Inicio
              <input
                type="datetime-local"
                value={form.starts_at}
                onChange={(event) => updateForm('starts_at', event.target.value)}
                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted">
              Fin
              <input
                type="datetime-local"
                value={form.ends_at}
                onChange={(event) => updateForm('ends_at', event.target.value)}
                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted">
              Edición
              <select
                value={form.edition}
                onChange={(event) => updateForm('edition', event.target.value)}
                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
              >
                {EVENT_EDITION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted">
              Visibilidad
              <select
                value={form.visibility}
                onChange={(event) => updateForm('visibility', event.target.value)}
                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
              >
                {EVENT_VISIBILITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-ink md:col-span-2">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => updateForm('active', event.target.checked)}
              />
              Activo
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear evento'}
          </button>
        </form>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-white">
        <table className="min-w-[1000px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Evento</th>
              <th className="px-4 py-3">Lifecycle</th>
              <th className="px-4 py-3">Countdown</th>
              <th className="px-4 py-3">Ventana</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedEvents.map((eventItem) => {
              const preview = getEventAdminPreview(eventItem)
              return (
                <tr key={eventItem.id} className="border-t border-border/70">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-ink">{eventItem.label}</p>
                    <p className="text-xs text-muted">{eventItem.id}</p>
                    {eventItem.badge && (
                      <span className="mt-1 inline-block rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800">
                        {eventItem.badge}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${preview.badgeClass}`}
                    >
                      {preview.lifecycleLabel}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-muted">{preview.countdownLabel ?? '—'}</td>
                  <td className="px-4 py-4 text-xs text-muted">
                    {eventItem.startsAt ? formatDate(eventItem.startsAt) : '—'}
                    {eventItem.endsAt && (
                      <p className="mt-1">→ {formatDate(eventItem.endsAt)}</p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        eventItem.active
                          ? 'bg-progress/15 text-progress'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {eventItem.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEditForm(eventItem)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggle(eventItem)}
                        disabled={togglingId === eventItem.id}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                      >
                        {eventItem.active ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(eventItem)}
                        disabled={deletingId === eventItem.id}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 disabled:opacity-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
