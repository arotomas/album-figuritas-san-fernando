import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  deletePlayer,
  getAdminPlayerMetrics,
  getAdminPlayersPage,
  updatePlayerAlbumStatus,
  updatePlayerRole,
} from '../../services/supabase/adminPlayers'
import { PhotoPreviewModal } from '../../components/admin/adminShared'
import { getFullName } from '../../utils/profileValidation'
import { useAppStore } from '../../store/useAppStore'
import { isSuperAdminProfile } from '../../utils/roles'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useLatestRequest } from '../../hooks/useLatestRequest'
import { isAbortError, normalizeAdminError } from '../../utils/adminAsync'
import { AdminPlayerDrawer } from '../../components/admin/players/AdminPlayerDrawer'
import { AdminPlayersMapSection } from '../../components/admin/players/AdminPlayersMapSection'
import { AdminPlayersMetrics } from '../../components/admin/players/AdminPlayersMetrics'
import { AdminPlayersTable } from '../../components/admin/players/AdminPlayersTable'
import {
  AdminConfirmModal,
  AdminInlineError,
  AdminToast,
} from '../../components/admin/players/AdminPlayersUi'
import {
  DEFAULT_PLAYER_FILTERS,
  getDefaultPageSize,
} from '../../components/admin/players/playerAdminUtils'
import { scheduleEffectUpdate } from '../../utils/scheduleEffectUpdate'

function DeleteUserModal({ player, confirmText, onConfirmTextChange, onCancel, onConfirm, busy }) {
  const expected = player?.username ?? ''

  return (
    <AdminConfirmModal
      open
      title="Eliminar jugador (soft delete)"
      description="El jugador se ocultará del panel y quedará registrado para auditoría. No se borran datos físicamente."
      confirmLabel="Confirmar eliminación"
      variant="danger"
      busy={busy}
      confirmDisabled={confirmText.trim() !== expected}
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      <p className="mt-4 text-sm font-semibold text-ink">
        Usuario: {player?.username ?? 'Sin username'} ({getFullName(player) || player?.email || player?.id})
      </p>
      <label className="mt-5 block text-xs font-bold uppercase tracking-wide text-muted">
        Escribí <span className="font-mono normal-case">{expected}</span> para confirmar
        <input
          value={confirmText}
          onChange={(event) => onConfirmTextChange(event.target.value)}
          className="mt-2 block w-full rounded-xl border border-border px-3 py-2 text-sm normal-case tracking-normal text-ink"
          placeholder={expected}
          autoComplete="off"
          disabled={busy}
        />
      </label>
      <p className="mt-2 text-xs text-muted">El botón confirmar se habilita al escribir el username exacto.</p>
    </AdminConfirmModal>
  )
}

export function AdminPlayersPage() {
  const supabaseProfile = useAppStore((state) => state.supabaseProfile)
  const supabaseUserId = useAppStore((state) => state.supabaseUserId)
  const isSuperAdmin = isSuperAdminProfile(supabaseProfile)

  const listRequest = useLatestRequest()
  const metricsRequest = useLatestRequest()
  const listRequestRef = useRef(listRequest)
  listRequestRef.current = listRequest

  const [players, setPlayers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(getDefaultPageSize)
  const [metrics, setMetrics] = useState({
    total: 0,
    active: 0,
    blocked: 0,
    admins: 0,
    withFigures: 0,
  })

  const [selectedPlayerId, setSelectedPlayerId] = useState(null)
  const [previewPlayer, setPreviewPlayer] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [loading, setLoading] = useState(true)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [listError, setListError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [toast, setToast] = useState(null)

  const [albumReviewNote, setAlbumReviewNote] = useState('')
  const [photoPreview, setPhotoPreview] = useState(null)
  const [roleUpdating, setRoleUpdating] = useState(false)
  const [reviewBusy, setReviewBusy] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const [quickTab, setQuickTab] = useState('all')
  const [playerFilters, setPlayerFilters] = useState(DEFAULT_PLAYER_FILTERS)

  const debouncedFilters = useDebouncedValue(playerFilters, 300)
  const debouncedQuickTab = useDebouncedValue(quickTab, 150)

  const filtersKey = useMemo(
    () =>
      JSON.stringify({
        debouncedFilters,
        debouncedQuickTab,
        pageSize,
      }),
    [debouncedFilters, debouncedQuickTab, pageSize],
  )

  const listQueryKey = useMemo(
    () => `${filtersKey}:${page}`,
    [filtersKey, page],
  )

  const loadMetrics = useCallback(async () => {
    const { id, signal } = metricsRequest.begin()
    scheduleEffectUpdate(() => setMetricsLoading(true))

    try {
      const nextMetrics = await getAdminPlayerMetrics({ signal })
      if (!metricsRequest.isLatest(id)) return
      setMetrics(nextMetrics)
    } catch (loadError) {
      if (isAbortError(loadError) || !metricsRequest.isLatest(id)) return
      console.warn('[admin-players] metrics failed', loadError)
    } finally {
      if (metricsRequest.isLatest(id)) setMetricsLoading(false)
    }
  }, [metricsRequest])

  useEffect(() => {
    const request = listRequestRef.current
    const { id, signal } = request.begin()
    scheduleEffectUpdate(() => {
      setLoading(true)
      setListError(null)
    })

    getAdminPlayersPage(
      {
        query: debouncedFilters.query,
        username: debouncedFilters.username,
        email: debouncedFilters.email,
        dni: debouncedFilters.dni,
        localidad: debouncedFilters.localidad,
        albumStatus: debouncedFilters.albumStatus,
        role: debouncedFilters.role,
        progress: debouncedFilters.progress,
        quickTab: debouncedQuickTab,
        page,
        pageSize,
      },
      { signal },
    )
      .then((result) => {
        if (!request.isLatest(id)) return
        setPlayers(result.players)
        setTotal(result.total)
        setPage((current) => (current === result.page ? current : result.page))
      })
      .catch((loadError) => {
        if (isAbortError(loadError) || !request.isLatest(id)) return
        setListError(normalizeAdminError(loadError))
      })
      .finally(() => {
        if (request.isLatest(id)) setLoading(false)
      })
  }, [listQueryKey])

  useEffect(() => {
    void loadMetrics()
  }, [loadMetrics])

  const openPlayerDrawer = useCallback((player) => {
    setPreviewPlayer(player)
    setSelectedPlayerId(player.id)
    setDrawerOpen(true)
    setActionError(null)
  }, [])

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
    setSelectedPlayerId(null)
    setPreviewPlayer(null)
    setAlbumReviewNote('')
  }, [])

  const updatePlayerFilter = useCallback((key, value) => {
    setPlayerFilters((current) => ({ ...current, [key]: value }))
    setPage(1)
  }, [])

  const handleQuickTabChange = useCallback((tabId) => {
    setQuickTab(tabId)
    setPage(1)
  }, [])

  const handlePageChange = useCallback((nextPage) => {
    setPage(nextPage)
  }, [])

  const handlePageSizeChange = useCallback((nextPageSize) => {
    setPageSize(nextPageSize)
    setPage(1)
  }, [])

  const clearFilters = useCallback(() => {
    setPlayerFilters(DEFAULT_PLAYER_FILTERS)
    setQuickTab('all')
    setPage(1)
  }, [])

  const refreshAll = useCallback(async () => {
    const { id, signal } = listRequest.begin()
    setLoading(true)
    setListError(null)

    try {
      const [nextMetrics, result] = await Promise.all([
        getAdminPlayerMetrics({ signal }),
        getAdminPlayersPage(
          {
            query: debouncedFilters.query,
            username: debouncedFilters.username,
            email: debouncedFilters.email,
            dni: debouncedFilters.dni,
            localidad: debouncedFilters.localidad,
            albumStatus: debouncedFilters.albumStatus,
            role: debouncedFilters.role,
            progress: debouncedFilters.progress,
            quickTab: debouncedQuickTab,
            page,
            pageSize,
          },
          { signal },
        ),
      ])

      if (!listRequest.isLatest(id)) return
      setMetrics(nextMetrics)
      setPlayers(result.players)
      setTotal(result.total)
      setToast('Datos actualizados.')
    } catch (loadError) {
      if (isAbortError(loadError) || !listRequest.isLatest(id)) return
      setListError(normalizeAdminError(loadError))
    } finally {
      if (listRequest.isLatest(id)) {
        setLoading(false)
        setMetricsLoading(false)
      }
    }
  }, [debouncedFilters, debouncedQuickTab, listRequest, page, pageSize])

  const retryList = useCallback(() => {
    void refreshAll()
  }, [refreshAll])

  const handleAlbumReview = useCallback(
    async (status) => {
      if (!selectedPlayerId) return
      setReviewBusy(true)
      setActionError(null)
      try {
        await updatePlayerAlbumStatus(selectedPlayerId, status, albumReviewNote)
        setToast(
          status === 'approved'
            ? 'Álbum aprobado.'
            : status === 'rejected'
              ? 'Jugador bloqueado (álbum rechazado).'
              : 'Álbum marcado como pendiente.',
        )
        await refreshAll()
      } catch (reviewError) {
        setActionError(normalizeAdminError(reviewError) ?? 'No pudimos actualizar el estado del álbum.')
      } finally {
        setReviewBusy(false)
      }
    },
    [albumReviewNote, refreshAll, selectedPlayerId],
  )

  const handleRoleChange = useCallback(
    async (nextRole) => {
      if (!selectedPlayerId || !isSuperAdmin) return
      setRoleUpdating(true)
      setActionError(null)
      try {
        await updatePlayerRole(selectedPlayerId, nextRole)
        setToast('Rol actualizado.')
        await refreshAll()
      } catch (roleError) {
        const message = roleError?.message ?? String(roleError)
        if (message === 'CANNOT_CHANGE_OWN_ROLE') {
          setActionError('No podés cambiar tu propio rol.')
        } else if (message === 'FORBIDDEN') {
          setActionError('Solo un super admin puede cambiar roles.')
        } else {
          setActionError(normalizeAdminError(roleError) ?? 'No pudimos actualizar el rol del usuario.')
        }
      } finally {
        setRoleUpdating(false)
      }
    },
    [isSuperAdmin, refreshAll, selectedPlayerId],
  )

  const handleDeleteUser = useCallback(async () => {
    if (!selectedPlayerId || !isSuperAdmin || !previewPlayer) return
    if (deleteConfirmText.trim() !== (previewPlayer.username ?? '')) return

    setDeleteBusy(true)
    setActionError(null)
    try {
      await deletePlayer(selectedPlayerId)
      setDeleteModalOpen(false)
      setDeleteConfirmText('')
      closeDrawer()
      setToast('Jugador eliminado (soft delete).')
      await refreshAll()
    } catch (deleteError) {
      const message = deleteError?.message ?? String(deleteError)
      if (message === 'CANNOT_DELETE_SELF') {
        setActionError('No podés eliminar tu propia cuenta desde el panel.')
      } else if (message === 'CANNOT_DELETE_LAST_SUPER_ADMIN') {
        setActionError('No se puede eliminar al último super admin.')
      } else if (message === 'FORBIDDEN') {
        setActionError('Solo un super admin puede eliminar usuarios.')
      } else {
        setActionError(normalizeAdminError(deleteError) ?? 'No pudimos eliminar el usuario.')
      }
    } finally {
      setDeleteBusy(false)
    }
  }, [
    closeDrawer,
    deleteConfirmText,
    isSuperAdmin,
    previewPlayer,
    refreshAll,
    selectedPlayerId,
  ])

  const handleDeleteRequest = useCallback(() => {
    setDeleteConfirmText('')
    setDeleteModalOpen(true)
  }, [])

  const handlePhotoPreview = useCallback((preview) => {
    setPhotoPreview(preview)
  }, [])

  const dismissToast = useCallback(() => setToast(null), [])

  const metricsDisplay = useMemo(
    () => ({
      total: metricsLoading ? '…' : metrics.total,
      active: metricsLoading ? '…' : metrics.active,
      blocked: metricsLoading ? '…' : metrics.blocked,
      admins: metricsLoading ? '…' : metrics.admins,
      withFigures: metricsLoading ? '…' : metrics.withFigures,
    }),
    [metrics, metricsLoading],
  )

  const deleteModal =
    deleteModalOpen && previewPlayer ? (
      <DeleteUserModal
        player={previewPlayer}
        confirmText={deleteConfirmText}
        onConfirmTextChange={setDeleteConfirmText}
        onCancel={() => {
          if (deleteBusy) return
          setDeleteModalOpen(false)
          setDeleteConfirmText('')
        }}
        onConfirm={handleDeleteUser}
        busy={deleteBusy}
      />
    ) : null

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="text-sm text-muted">
          Revisá inscriptos, progreso, capturas y estado de aprobación del álbum.
        </p>
        <div className="flex items-center gap-3">
          {(loading || metricsLoading) && (
            <p className="text-sm font-medium text-muted" aria-live="polite">
              Actualizando…
            </p>
          )}
          <button
            type="button"
            onClick={() => void refreshAll()}
            disabled={loading}
            className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-bold shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Actualizar
          </button>
        </div>
      </div>

      <AdminPlayersMetrics metrics={metricsDisplay} />

      <AdminInlineError message={listError} onRetry={retryList} />
      <AdminInlineError message={actionError} />

      <AdminPlayersTable
        players={players}
        loading={loading}
        selectedPlayerId={selectedPlayerId}
        quickTab={quickTab}
        onQuickTabChange={handleQuickTabChange}
        filters={playerFilters}
        onFilterChange={updatePlayerFilter}
        onSelectPlayer={openPlayerDrawer}
        onClearFilters={clearFilters}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      <AdminPlayersMapSection />

      <AdminPlayerDrawer
        open={drawerOpen}
        previewPlayer={previewPlayer}
        selectedPlayerId={selectedPlayerId}
        supabaseUserId={supabaseUserId}
        isSuperAdmin={isSuperAdmin}
        albumReviewNote={albumReviewNote}
        onAlbumReviewNoteChange={setAlbumReviewNote}
        onClose={closeDrawer}
        onAlbumReview={handleAlbumReview}
        onRoleChange={handleRoleChange}
        onDeleteRequest={handleDeleteRequest}
        roleUpdating={roleUpdating}
        reviewBusy={reviewBusy}
        onPhotoPreview={handlePhotoPreview}
      />

      <PhotoPreviewModal preview={photoPreview} onClose={() => setPhotoPreview(null)} />

      {deleteModal}

      <AdminToast message={toast} onDismiss={dismissToast} />
    </div>
  )
}
