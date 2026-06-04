import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  createAlbumAdmin,
  fetchAlbumsAdmin,
  setDefaultAlbum,
  toggleAlbumActive,
  updateAlbumAdmin,
  updateAlbumStatus,
} from '../../services/supabase/albumsAdmin'
import { AdminErrorBanner } from '../../components/admin/adminShared'
import {
  ALBUM_STATUS,
  ALBUM_STATUS_OPTIONS,
  buildAlbumId,
  DEFAULT_ALBUM_FORM,
  getAlbumStatusBadgeClass,
  getAlbumStatusLabel,
  toAlbumForm,
  validateAlbumForm,
} from '../../components/admin/adminAlbumsShared'

export function AdminAlbumsPage() {
  const [albums, setAlbums] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(DEFAULT_ALBUM_FORM)
  const [formError, setFormError] = useState(null)
  const [formMessage, setFormMessage] = useState(null)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [statusUpdatingId, setStatusUpdatingId] = useState(null)
  const [defaultUpdatingId, setDefaultUpdatingId] = useState(null)

  const loadAlbums = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const rows = await fetchAlbumsAdmin()
      setAlbums(rows)
    } catch (loadError) {
      setError(loadError?.message ?? 'No pudimos cargar los álbumes.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAlbums()
  }, [loadAlbums])

  const sortedAlbums = useMemo(
    () => [...albums].sort((a, b) => a.sortOrder - b.sortOrder),
    [albums],
  )

  const openNewForm = () => {
    setEditingId(null)
    setForm(DEFAULT_ALBUM_FORM)
    setFormError(null)
    setFormMessage(null)
    setFormOpen(true)
  }

  const openEditForm = (album) => {
    setEditingId(album.id)
    setForm(toAlbumForm(album))
    setFormError(null)
    setFormMessage(null)
    setFormOpen(true)
  }

  const updateForm = (key, value) => {
    setForm((current) => {
      const next = { ...current, [key]: value }
      if (key === 'title' && !editingId && !current.slug) {
        const slug = buildAlbumId(value)
        next.slug = slug
        next.id = slug
      }
      return next
    })
  }

  const handleSave = async (event) => {
    event.preventDefault()
    const validationError = validateAlbumForm(form, { isEdit: Boolean(editingId) })
    if (validationError) {
      setFormError(validationError)
      return
    }

    setSaving(true)
    setFormError(null)
    setFormMessage(null)
    try {
      if (editingId) {
        await updateAlbumAdmin(editingId, form)
        setFormMessage('Álbum actualizado')
      } else {
        await createAlbumAdmin(form)
        setFormOpen(false)
        setEditingId(null)
        setForm(DEFAULT_ALBUM_FORM)
      }
      await loadAlbums({ silent: true })
    } catch (saveError) {
      setFormError(saveError?.message ?? 'No pudimos guardar el álbum.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (album) => {
    setTogglingId(album.id)
    try {
      await toggleAlbumActive(album.id, !album.active)
      await loadAlbums({ silent: true })
    } catch (toggleError) {
      setError(toggleError?.message ?? 'No pudimos cambiar el estado activo.')
    } finally {
      setTogglingId(null)
    }
  }

  const handleStatusChange = async (album, status) => {
    setStatusUpdatingId(album.id)
    try {
      await updateAlbumStatus(album.id, status)
      await loadAlbums({ silent: true })
    } catch (statusError) {
      setError(statusError?.message ?? 'No pudimos cambiar el estado.')
    } finally {
      setStatusUpdatingId(null)
    }
  }

  const handleSetDefault = async (album) => {
    setDefaultUpdatingId(album.id)
    try {
      await setDefaultAlbum(album.id)
      await loadAlbums({ silent: true })
    } catch (defaultError) {
      setError(defaultError?.message ?? 'No pudimos marcar el álbum como default.')
    } finally {
      setDefaultUpdatingId(null)
    }
  }

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <p className="max-w-2xl text-sm text-muted">
          Gestioná ediciones del juego: título, portada, publicación y álbum por defecto. Los
          jugadores solo ven álbumes publicados y activos.
        </p>
        <div className="flex shrink-0 items-center gap-3">
          {loading && <p className="text-sm font-medium text-muted">Cargando…</p>}
          <button
            type="button"
            onClick={openNewForm}
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
          >
            Nuevo álbum
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
                {editingId ? 'Editar álbum' : 'Nuevo álbum'}
              </h3>
              <p className="mt-1 text-sm text-muted">
                Creá en borrador y publicá cuando esté listo. La portada es una URL por ahora.
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
              Título
              <input
                value={form.title}
                onChange={(event) => updateForm('title', event.target.value)}
                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
                required
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted">
              Subtítulo
              <input
                value={form.subtitle}
                onChange={(event) => updateForm('subtitle', event.target.value)}
                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
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
            <label className="md:col-span-2 block text-xs font-bold uppercase tracking-wide text-muted">
              Descripción
              <textarea
                value={form.description}
                onChange={(event) => updateForm('description', event.target.value)}
                rows="3"
                className="mt-1 block w-full resize-none rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
              />
            </label>
            <label className="md:col-span-2 block text-xs font-bold uppercase tracking-wide text-muted">
              Portada URL
              <input
                value={form.cover_image}
                onChange={(event) => updateForm('cover_image', event.target.value)}
                placeholder="https://..."
                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted">
              Estado
              <select
                value={form.status}
                onChange={(event) => updateForm('status', event.target.value)}
                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
              >
                {ALBUM_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
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
              Bonus completitud (pts)
              <input
                type="number"
                min="0"
                value={form.completion_bonus_points}
                onChange={(event) => updateForm('completion_bonus_points', event.target.value)}
                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted">
              Zoom mapa
              <input
                type="number"
                min="1"
                max="22"
                value={form.map_zoom}
                onChange={(event) => updateForm('map_zoom', event.target.value)}
                placeholder="13"
                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted">
              Latitud mapa
              <input
                type="number"
                step="any"
                value={form.map_center_lat}
                onChange={(event) => updateForm('map_center_lat', event.target.value)}
                placeholder="-34.4417"
                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted">
              Longitud mapa
              <input
                type="number"
                step="any"
                value={form.map_center_lng}
                onChange={(event) => updateForm('map_center_lng', event.target.value)}
                placeholder="-58.5575"
                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-ink md:col-span-2">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => updateForm('active', event.target.checked)}
              />
              Activo (visible si está publicado)
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-ink md:col-span-2">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(event) => updateForm('is_default', event.target.checked)}
              />
              Álbum por defecto (solo uno)
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear álbum'}
          </button>
        </form>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-white">
        <table className="min-w-[1100px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Álbum</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Activo</th>
              <th className="px-4 py-3">Default</th>
              <th className="px-4 py-3">Orden</th>
              <th className="px-4 py-3">Bonus</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedAlbums.map((album) => (
              <tr key={album.id} className="border-t border-border/70">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    {album.coverImage ? (
                      <img
                        src={album.coverImage}
                        alt=""
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-[10px] text-muted">
                        Sin portada
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-ink">{album.title}</p>
                      <p className="text-xs text-muted">{album.id}</p>
                      {album.subtitle && (
                        <p className="text-xs text-muted">{album.subtitle}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${getAlbumStatusBadgeClass(album.status)}`}
                  >
                    {getAlbumStatusLabel(album.status)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      album.active
                        ? 'bg-progress/15 text-progress'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {album.active ? 'Sí' : 'No'}
                  </span>
                </td>
                <td className="px-4 py-4">
                  {album.isDefault ? (
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">
                      Default
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-4 tabular-nums">{album.sortOrder}</td>
                <td className="px-4 py-4 tabular-nums">{album.completionBonusPoints}</td>
                <td className="px-4 py-4">
                  <div className="flex max-w-md flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEditForm(album)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold"
                    >
                      Editar
                    </button>
                    <Link
                      to={`/admin/albums/${album.id}/figures`}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold"
                    >
                      Gestionar figuritas
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(album)}
                      disabled={togglingId === album.id}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                    >
                      {album.active ? 'Desactivar' : 'Activar'}
                    </button>
                    {album.status !== ALBUM_STATUS.PUBLISHED && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(album, ALBUM_STATUS.PUBLISHED)}
                        disabled={statusUpdatingId === album.id}
                        className="rounded-lg border border-progress/40 px-3 py-1.5 text-xs font-bold text-progress disabled:opacity-50"
                      >
                        Publicar
                      </button>
                    )}
                    {album.status !== ALBUM_STATUS.DRAFT && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(album, ALBUM_STATUS.DRAFT)}
                        disabled={statusUpdatingId === album.id}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                      >
                        Borrador
                      </button>
                    )}
                    {album.status !== ALBUM_STATUS.ARCHIVED && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(album, ALBUM_STATUS.ARCHIVED)}
                        disabled={statusUpdatingId === album.id}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                      >
                        Archivar
                      </button>
                    )}
                    {!album.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(album)}
                        disabled={defaultUpdatingId === album.id}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                      >
                        Default
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && sortedAlbums.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted">
                  Todavía no hay álbumes. Creá el primero con «Nuevo álbum».
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
