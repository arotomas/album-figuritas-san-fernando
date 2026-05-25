import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createCollectionAdmin,
  deleteCollectionAdmin,
  getCollectionsAdmin,
  toggleCollectionActive,
  updateCollectionAdmin,
} from '../../services/supabase/collections'
import { setRemoteAlbumCollections } from '../../utils/collectionRegistry'
import { useAlbumCollectionsBootstrap } from '../../hooks/useAlbumCollectionsBootstrap'
import {
  AdminErrorBanner,
  formatDate,
} from '../../components/admin/adminShared'
import {
  buildCollectionId,
  COLLECTION_EDITION_OPTIONS,
  COLLECTION_TRACK_OPTIONS,
  COLLECTION_VISIBILITY_OPTIONS,
  DEFAULT_COLLECTION_FORM,
  getCollectionAdminPreview,
  getCollectionVisibilityBadgeClass,
  toCollectionForm,
  UNLOCK_CONDITION_OPTIONS,
  validateCollectionForm,
} from '../../components/admin/adminCollectionsShared'

export function AdminCollectionsPage() {
  useAlbumCollectionsBootstrap(true)

  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(DEFAULT_COLLECTION_FORM)
  const [formError, setFormError] = useState(null)
  const [formMessage, setFormMessage] = useState(null)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const loadCollections = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const rows = await getCollectionsAdmin()
      setCollections(rows)
      setRemoteAlbumCollections(rows.filter((item) => item.active), { reason: 'admin-refresh' })
    } catch (loadError) {
      setError(loadError?.message ?? 'No pudimos cargar las colecciones.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCollections()
  }, [loadCollections])

  const sortedCollections = useMemo(
    () => [...collections].sort((a, b) => a.sortOrder - b.sortOrder),
    [collections],
  )

  const openNewForm = () => {
    setEditingId(null)
    setForm(DEFAULT_COLLECTION_FORM)
    setFormError(null)
    setFormMessage(null)
    setFormOpen(true)
  }

  const openEditForm = (collection) => {
    setEditingId(collection.id)
    setForm(toCollectionForm(collection))
    setFormError(null)
    setFormMessage(null)
    setFormOpen(true)
  }

  const updateForm = (key, value) => {
    setForm((current) => {
      const next = { ...current, [key]: value }
      if (key === 'label' && !editingId && !current.slug) {
        next.slug = buildCollectionId(value)
        next.id = buildCollectionId(value)
      }
      return next
    })
  }

  const handleSave = async (event) => {
    event.preventDefault()
    const validationError = validateCollectionForm(form, { isEdit: Boolean(editingId) })
    if (validationError) {
      setFormError(validationError)
      return
    }

    setSaving(true)
    setFormError(null)
    setFormMessage(null)
    try {
      if (editingId) {
        await updateCollectionAdmin(editingId, form)
        setFormMessage('Colección actualizada')
      } else {
        await createCollectionAdmin(form)
        setFormOpen(false)
        setEditingId(null)
        setForm(DEFAULT_COLLECTION_FORM)
      }
      await loadCollections({ silent: true })
    } catch (saveError) {
      setFormError(saveError?.message ?? 'No pudimos guardar la colección.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (collection) => {
    setTogglingId(collection.id)
    try {
      await toggleCollectionActive(collection.id, !collection.active)
      await loadCollections({ silent: true })
    } catch (toggleError) {
      setError(toggleError?.message ?? 'No pudimos cambiar el estado.')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (collection) => {
    const confirmed = window.confirm(`¿Eliminar colección "${collection.label}"?`)
    if (!confirmed) return

    setDeletingId(collection.id)
    try {
      await deleteCollectionAdmin(collection.id)
      if (editingId === collection.id) {
        setFormOpen(false)
        setEditingId(null)
      }
      await loadCollections({ silent: true })
    } catch (deleteError) {
      setError(deleteError?.message ?? 'No pudimos eliminar la colección.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <div className="flex items-end justify-between">
        <p className="text-sm text-muted">
          Gestioná el universo del álbum: colecciones, visibilidad y ventanas temporales.
        </p>
        <div className="flex items-center gap-3">
          {loading && <p className="text-sm font-medium text-muted">Cargando…</p>}
          <button
            type="button"
            onClick={openNewForm}
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
          >
            Nueva colección
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
                {editingId ? 'Editar colección' : 'Nueva colección'}
              </h3>
              <p className="mt-1 text-sm text-muted">
                Los cambios se reflejan en el player cuando la tabla remota está disponible.
              </p>
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
              Ícono
              <input
                value={form.icon}
                onChange={(event) => updateForm('icon', event.target.value)}
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
              Orden
              <input
                type="number"
                value={form.sort_order}
                onChange={(event) => updateForm('sort_order', event.target.value)}
                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted">
              Página álbum
              <input
                type="number"
                min="1"
                value={form.page}
                onChange={(event) => updateForm('page', event.target.value)}
                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted">
              Track
              <select
                value={form.track}
                onChange={(event) => updateForm('track', event.target.value)}
                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
              >
                {COLLECTION_TRACK_OPTIONS.map((option) => (
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
                {COLLECTION_VISIBILITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted">
              Edición
              <select
                value={form.edition}
                onChange={(event) => updateForm('edition', event.target.value)}
                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
              >
                {COLLECTION_EDITION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted">
              Event ID
              <input
                value={form.event_id}
                onChange={(event) => updateForm('event_id', event.target.value)}
                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted">
              Disponible desde
              <input
                type="datetime-local"
                value={form.available_from}
                onChange={(event) => updateForm('available_from', event.target.value)}
                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted">
              Disponible hasta
              <input
                type="datetime-local"
                value={form.available_until}
                onChange={(event) => updateForm('available_until', event.target.value)}
                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted">
              Condición de unlock
              <select
                value={form.unlock_condition || 'always'}
                onChange={(event) => updateForm('unlock_condition', event.target.value)}
                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
              >
                {UNLOCK_CONDITION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-ink">
              <input
                type="checkbox"
                checked={form.hidden_until_discovered}
                onChange={(event) => updateForm('hidden_until_discovered', event.target.checked)}
              />
              Oculta hasta descubrir
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-ink">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => updateForm('active', event.target.checked)}
              />
              Activa
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear colección'}
          </button>
        </form>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-white">
        <table className="min-w-[1100px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Colección</th>
              <th className="px-4 py-3">Track</th>
              <th className="px-4 py-3">Visibilidad</th>
              <th className="px-4 py-3">Estado player</th>
              <th className="px-4 py-3">Orden</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Evento</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedCollections.map((collection) => {
              const preview = getCollectionAdminPreview(collection)
              return (
              <tr key={collection.id} className="border-t border-border/70">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{collection.icon}</span>
                    <div>
                      <p className="font-semibold text-ink">{collection.label}</p>
                      <p className="text-xs text-muted">{collection.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 capitalize">{collection.track}</td>
                <td className="px-4 py-4">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${getCollectionVisibilityBadgeClass(collection)}`}
                  >
                    {collection.visibility}
                    {collection.hiddenUntilDiscovered ? ' · reveal' : ''}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${preview.badgeClass}`}
                  >
                    {preview.label}
                  </span>
                </td>
                <td className="px-4 py-4 tabular-nums">{collection.sortOrder}</td>
                <td className="px-4 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      collection.active
                        ? 'bg-progress/15 text-progress'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {collection.active ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td className="px-4 py-4 text-xs text-muted">
                  {collection.eventId ? (
                    <>
                      {collection.eventId}
                      {collection.availableFrom && (
                        <p className="mt-1">{formatDate(collection.availableFrom)}</p>
                      )}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEditForm(collection)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggle(collection)}
                      disabled={togglingId === collection.id}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                    >
                      {collection.active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(collection)}
                      disabled={deletingId === collection.id}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    </>
  )
}
