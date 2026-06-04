import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getFiguresAdmin } from '../../services/supabase/adminDashboard'
import { fetchAlbumAdminById } from '../../services/supabase/albumsAdmin'
import { getCollectionsForAlbumAdmin } from '../../services/supabase/collections'
import {
  addFigureToAlbumAdmin,
  countActiveAlbumFiguresAdmin,
  fetchAlbumFiguresAdmin,
  removeFigureFromAlbumAdmin,
  toggleAlbumFigureActiveAdmin,
  updateAlbumFigureAdmin,
  validateAlbumFigureMembership,
} from '../../services/supabase/albumFiguresAdmin'
import { AdminErrorBanner } from '../../components/admin/adminShared'
import { ALBUM_STATUS, getAlbumStatusLabel } from '../../components/admin/adminAlbumsShared'

function normalizeSearch(value) {
  return value.trim().toLowerCase()
}

function MembershipEditRow({
  row,
  collectionOptions,
  albumCollectionIds,
  onSave,
  onToggleActive,
  onRemove,
  saving,
  toggling,
  removing,
}) {
  const [draft, setDraft] = useState({
    collectionId: row.membership.collectionId ?? '',
    sortOrder: row.membership.sortOrder,
    slotNumber: row.membership.slotNumber ?? '',
  })
  const [rowError, setRowError] = useState(null)

  useEffect(() => {
    setDraft({
      collectionId: row.membership.collectionId ?? '',
      sortOrder: row.membership.sortOrder,
      slotNumber: row.membership.slotNumber ?? '',
    })
  }, [row.membership])

  const handleSave = async () => {
    const validationError = validateAlbumFigureMembership(
      {
        collectionId: draft.collectionId,
        sortOrder: draft.sortOrder,
        slotNumber: draft.slotNumber,
      },
      { albumCollectionIds },
    )
    if (validationError) {
      setRowError(validationError)
      return
    }

    setRowError(null)
    await onSave(row.membership.figureId, {
      collectionId: draft.collectionId,
      sortOrder: draft.sortOrder,
      slotNumber: draft.slotNumber,
    })
  }

  return (
    <tr className="border-t border-border/70">
      <td className="px-4 py-4">
        <p className="font-semibold text-ink">{row.figure.title}</p>
        <p className="text-xs text-muted">{row.figure.id}</p>
      </td>
      <td className="px-4 py-4 capitalize">{row.figure.rarity ?? '—'}</td>
      <td className="px-4 py-4">
        <select
          value={draft.collectionId}
          onChange={(event) => setDraft((current) => ({ ...current, collectionId: event.target.value }))}
          className="w-full min-w-[140px] rounded-lg border border-border bg-white px-2 py-1.5 text-xs"
        >
          <option value="">Sin capítulo</option>
          {collectionOptions.map((collection) => (
            <option key={collection.id} value={collection.id}>
              {collection.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-4">
        <input
          type="number"
          value={draft.sortOrder}
          onChange={(event) => setDraft((current) => ({ ...current, sortOrder: event.target.value }))}
          className="w-20 rounded-lg border border-border bg-white px-2 py-1.5 text-xs tabular-nums"
        />
      </td>
      <td className="px-4 py-4">
        <input
          type="number"
          min="1"
          value={draft.slotNumber}
          onChange={(event) => setDraft((current) => ({ ...current, slotNumber: event.target.value }))}
          placeholder="—"
          className="w-20 rounded-lg border border-border bg-white px-2 py-1.5 text-xs tabular-nums"
        />
      </td>
      <td className="px-4 py-4">
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            row.membership.activeInAlbum
              ? 'bg-progress/15 text-progress'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {row.membership.activeInAlbum ? 'Sí' : 'No'}
        </span>
      </td>
      <td className="px-4 py-4">
        {rowError && <p className="mb-2 text-xs text-red-700">{rowError}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold disabled:opacity-50"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => void onToggleActive(row.membership.figureId, !row.membership.activeInAlbum)}
            disabled={toggling}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold disabled:opacity-50"
          >
            {row.membership.activeInAlbum ? 'Desactivar' : 'Activar'}
          </button>
          <button
            type="button"
            onClick={() => void onRemove(row)}
            disabled={removing}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 disabled:opacity-50"
          >
            Quitar
          </button>
        </div>
      </td>
    </tr>
  )
}

export function AdminAlbumFiguresPage() {
  const { albumId } = useParams()
  const [album, setAlbum] = useState(null)
  const [memberships, setMemberships] = useState([])
  const [figures, setFigures] = useState([])
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [savingFigureId, setSavingFigureId] = useState(null)
  const [togglingFigureId, setTogglingFigureId] = useState(null)
  const [removingFigureId, setRemovingFigureId] = useState(null)
  const [addingFigureId, setAddingFigureId] = useState(null)

  const albumCollectionIds = useMemo(
    () => collections.map((collection) => collection.id),
    [collections],
  )

  const membershipByFigureId = useMemo(
    () => new Map(memberships.map((membership) => [membership.figureId, membership])),
    [memberships],
  )

  const figureById = useMemo(
    () => new Map(figures.map((figure) => [String(figure.id), figure])),
    [figures],
  )

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!albumId) return
    if (!silent) setLoading(true)
    setError(null)

    try {
      const [albumRow, membershipRows, figureRows, collectionRows] = await Promise.all([
        fetchAlbumAdminById(albumId),
        fetchAlbumFiguresAdmin(albumId),
        getFiguresAdmin(),
        getCollectionsForAlbumAdmin(albumId),
      ])

      if (!albumRow) {
        setError('No encontramos este álbum.')
        setAlbum(null)
        return
      }

      setAlbum(albumRow)
      setMemberships(membershipRows)
      setFigures(figureRows)
      setCollections(collectionRows)
    } catch (loadError) {
      setError(loadError?.message ?? 'No pudimos cargar las figuritas del álbum.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [albumId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const assignedRows = useMemo(() => {
    return memberships
      .map((membership) => {
        const figure = figureById.get(membership.figureId)
        if (!figure) {
          return {
            membership,
            figure: {
              id: membership.figureId,
              title: membership.figureId,
              rarity: '—',
              active: false,
            },
          }
        }
        return { membership, figure }
      })
      .sort((a, b) => a.membership.sortOrder - b.membership.sortOrder)
  }, [figureById, memberships])

  const activeAssignedCount = useMemo(
    () => memberships.filter((membership) => membership.activeInAlbum).length,
    [memberships],
  )

  const publishedEmptyWarning =
    album?.status === ALBUM_STATUS.PUBLISHED && album?.active && activeAssignedCount === 0

  const availableFigures = useMemo(() => {
    const query = normalizeSearch(search)
    return figures
      .filter((figure) => {
        if (!query) return true
        const title = String(figure.title ?? '').toLowerCase()
        const id = String(figure.id ?? '').toLowerCase()
        return title.includes(query) || id.includes(query)
      })
      .map((figure) => ({
        figure,
        assigned: membershipByFigureId.has(String(figure.id)),
        membership: membershipByFigureId.get(String(figure.id)) ?? null,
      }))
      .sort((a, b) => {
        if (a.assigned !== b.assigned) return a.assigned ? 1 : -1
        return String(a.figure.title).localeCompare(String(b.figure.title), 'es')
      })
  }, [figures, membershipByFigureId, search])

  const handleAdd = async (figureId) => {
    setAddingFigureId(figureId)
    try {
      await addFigureToAlbumAdmin(albumId, figureId)
      await loadData({ silent: true })
    } catch (addError) {
      setError(addError?.message ?? 'No pudimos agregar la figurita.')
    } finally {
      setAddingFigureId(null)
    }
  }

  const handleSaveMembership = async (figureId, patch) => {
    setSavingFigureId(figureId)
    try {
      await updateAlbumFigureAdmin(albumId, figureId, patch)
      await loadData({ silent: true })
    } catch (saveError) {
      setError(saveError?.message ?? 'No pudimos guardar los cambios.')
    } finally {
      setSavingFigureId(null)
    }
  }

  const handleToggleActive = async (figureId, nextActive) => {
    setTogglingFigureId(figureId)
    try {
      await toggleAlbumFigureActiveAdmin(albumId, figureId, nextActive)
      await loadData({ silent: true })
    } catch (toggleError) {
      setError(toggleError?.message ?? 'No pudimos cambiar el estado.')
    } finally {
      setTogglingFigureId(null)
    }
  }

  const handleRemove = async (row) => {
    const isLastActive =
      album?.status === ALBUM_STATUS.PUBLISHED &&
      row.membership.activeInAlbum &&
      activeAssignedCount <= 1

    const message = isLastActive
      ? `¿Quitar "${row.figure.title}"? Este álbum está publicado y quedaría sin figuritas activas visibles para jugadores.`
      : `¿Quitar "${row.figure.title}" de este álbum? La figurita global y el progreso de usuarios no se borran.`

    if (!window.confirm(message)) return

    setRemovingFigureId(row.membership.figureId)
    try {
      await removeFigureFromAlbumAdmin(albumId, row.membership.figureId)
      const remaining = await countActiveAlbumFiguresAdmin(albumId)
      if (album?.status === ALBUM_STATUS.PUBLISHED && album?.active && remaining === 0) {
        setError(
          'Advertencia: el álbum publicado quedó sin figuritas activas. Los jugadores verán un catálogo vacío.',
        )
      }
      await loadData({ silent: true })
    } catch (removeError) {
      setError(removeError?.message ?? 'No pudimos quitar la figurita del álbum.')
    } finally {
      setRemovingFigureId(null)
    }
  }

  if (!albumId) {
    return <AdminErrorBanner message="Falta el ID del álbum." />
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/admin/albums"
            className="text-sm font-semibold text-muted underline-offset-2 hover:underline"
          >
            ← Volver a álbumes
          </Link>
          <h3 className="mt-2 text-xl font-black text-ink">
            {album?.title ?? 'Figuritas del álbum'}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {album
              ? `${album.id} · ${getAlbumStatusLabel(album.status)} · ${activeAssignedCount} activas en álbum`
              : 'Cargando álbum…'}
          </p>
        </div>
        {loading && <p className="text-sm font-medium text-muted">Cargando…</p>}
      </div>

      <AdminErrorBanner message={error} />

      {publishedEmptyWarning && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          Este álbum está publicado y activo pero no tiene figuritas activas asignadas. Los
          jugadores verán un catálogo vacío hasta que agregues figuritas.
        </div>
      )}

      <section className="mt-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h4 className="text-lg font-black">Asignadas ({assignedRows.length})</h4>
            <p className="mt-1 text-sm text-muted">
              Editá capítulo, orden y visibilidad dentro de este álbum. Quitar solo afecta{' '}
              <code className="text-xs">album_figures</code>.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Figurita</th>
                <th className="px-4 py-3">Rareza</th>
                <th className="px-4 py-3">Capítulo</th>
                <th className="px-4 py-3">Orden</th>
                <th className="px-4 py-3">Slot</th>
                <th className="px-4 py-3">Activa</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {assignedRows.map((row) => (
                <MembershipEditRow
                  key={row.membership.figureId}
                  row={row}
                  collectionOptions={collections}
                  albumCollectionIds={albumCollectionIds}
                  onSave={handleSaveMembership}
                  onToggleActive={handleToggleActive}
                  onRemove={handleRemove}
                  saving={savingFigureId === row.membership.figureId}
                  toggling={togglingFigureId === row.membership.figureId}
                  removing={removingFigureId === row.membership.figureId}
                />
              ))}
              {!loading && assignedRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted">
                    Todavía no hay figuritas en este álbum. Agregalas desde el catálogo abajo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h4 className="text-lg font-black">Catálogo global</h4>
            <p className="mt-1 text-sm text-muted">
              Figuritas existentes en <code className="text-xs">figures</code>. Una misma figurita
              puede estar en varios álbumes.
            </p>
          </div>
          <label className="block min-w-[240px] text-xs font-bold uppercase tracking-wide text-muted">
            Buscar
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre o ID…"
              className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
            />
          </label>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Figurita</th>
                <th className="px-4 py-3">Rareza</th>
                <th className="px-4 py-3">Figura global</th>
                <th className="px-4 py-3">En álbum</th>
                <th className="px-4 py-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {availableFigures.map(({ figure, assigned }) => (
                <tr key={figure.id} className="border-t border-border/70">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-ink">{figure.title}</p>
                    <p className="text-xs text-muted">{figure.id}</p>
                  </td>
                  <td className="px-4 py-4 capitalize">{figure.rarity ?? '—'}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        figure.active !== false
                          ? 'bg-progress/15 text-progress'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {figure.active !== false ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {assigned ? (
                      <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">
                        Asignada
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {assigned ? (
                      <span className="text-xs text-muted">Ya en álbum</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleAdd(figure.id)}
                        disabled={addingFigureId === figure.id}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                      >
                        {addingFigureId === figure.id ? 'Agregando…' : 'Agregar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && availableFigures.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted">
                    No hay figuritas que coincidan con la búsqueda.
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
