import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { FaXmark } from 'react-icons/fa6'
import { formatDate, GameTypeBadges, ReviewBadge } from '../adminShared'
import {
  getAdminPlayerAlbum,
  getAdminPlayerBasic,
  getAdminPlayerCaptures,
} from '../../../services/supabase/adminPlayers'
import { getFigureChallenge } from '../../../utils/figureChallenges'
import { getFullName } from '../../../utils/profileValidation'
import { formatRoleLabel, PROFILE_ROLES } from '../../../utils/roles'
import { isAbortError } from '../../../utils/adminAsync'
import { useLatestRequest } from '../../../hooks/useLatestRequest'
import { countRarities, formatRelativeTime, getPlayerInitials } from './playerAdminUtils'
import { AdminConfirmModal } from './AdminPlayersUi'

const LazyPlayerLocationMap = lazy(() =>
  import('../AdminPlayerLocationMap').then((module) => ({
    default: module.AdminPlayerLocationMap,
  })),
)

function RoleBadge({ role }) {
  const styles = {
    user: 'bg-slate-100 text-slate-700',
    moderator: 'bg-sky-100 text-sky-800',
    admin: 'bg-amber-100 text-amber-900',
    super_admin: 'bg-violet-100 text-violet-900',
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
        styles[role] ?? styles.user
      }`}
    >
      {formatRoleLabel(role)}
    </span>
  )
}

function DrawerAvatar({ profile }) {
  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt=""
        className="h-14 w-14 rounded-full object-cover ring-2 ring-white"
      />
    )
  }

  return (
    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white ring-2 ring-white">
      {getPlayerInitials(profile)}
    </span>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</span>
      <span className="text-sm text-ink">{value ?? '-'}</span>
    </div>
  )
}

function BlockSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  )
}

function GridSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="aspect-square animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  )
}

function AdminToolButton({ label, description, onClick, variant = 'default', disabled, busy }) {
  const styles =
    variant === 'danger'
      ? 'bg-red-600 text-white hover:bg-red-700'
      : variant === 'secondary'
        ? 'border border-border bg-white text-ink hover:bg-slate-50'
        : 'bg-slate-900 text-white hover:bg-slate-800'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className={`rounded-xl px-4 py-2 text-left text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50 ${styles}`}
    >
      <span>{busy ? 'Procesando…' : label}</span>
      {description && !busy && (
        <span className="mt-0.5 block text-xs font-normal opacity-80">{description}</span>
      )}
    </button>
  )
}

export function AdminPlayerDrawer({
  open,
  previewPlayer,
  selectedPlayerId,
  supabaseUserId,
  isSuperAdmin,
  albumReviewNote,
  onAlbumReviewNoteChange,
  onClose,
  onAlbumReview,
  onRoleChange,
  onDeleteRequest,
  roleUpdating,
  reviewBusy,
  onPhotoPreview,
}) {
  const drawerRef = useRef(null)
  const closeButtonRef = useRef(null)
  const noteChangeRef = useRef(onAlbumReviewNoteChange)
  noteChangeRef.current = onAlbumReviewNoteChange

  const basicRequest = useLatestRequest()
  const capturesRequest = useLatestRequest()
  const albumRequest = useLatestRequest()

  const [basic, setBasic] = useState(null)
  const [basicLoading, setBasicLoading] = useState(false)
  const [captures, setCaptures] = useState(null)
  const [capturesLoading, setCapturesLoading] = useState(false)
  const [albumFigures, setAlbumFigures] = useState(null)
  const [albumLoading, setAlbumLoading] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [pendingRole, setPendingRole] = useState(null)

  const profile = basic?.profile ?? previewPlayer
  const mainProgress = basic?.mainProgress ?? previewPlayer?.mainProgress
  const bonusObtained = basic?.bonusObtained ?? previewPlayer?.bonusObtained ?? 0

  const rarities = useMemo(() => countRarities(albumFigures ?? []), [albumFigures])

  const mainPct = useMemo(() => {
    const obtained = mainProgress?.obtained ?? 0
    const total = mainProgress?.total ?? 0
    return total > 0 ? Math.round((obtained / total) * 100) : 0
  }, [mainProgress])

  const hadOpenPlayerRef = useRef(false)

  useEffect(() => {
    if (!open || !selectedPlayerId) {
      basicRequest.cancelAll()
      capturesRequest.cancelAll()
      albumRequest.cancelAll()

      if (hadOpenPlayerRef.current) {
        hadOpenPlayerRef.current = false
        setBasic(null)
        setCaptures(null)
        setAlbumFigures(null)
        setShowMap(false)
        setConfirmAction(null)
        setPendingRole(null)
      }
      return undefined
    }

    hadOpenPlayerRef.current = true
    const { id } = basicRequest.begin()
    setBasicLoading(true)

    getAdminPlayerBasic(selectedPlayerId)
      .then((data) => {
        if (!basicRequest.isLatest(id)) return
        setBasic(data)
        noteChangeRef.current?.(data.profile.album_review_note ?? '')
      })
      .catch((error) => {
        if (isAbortError(error) || !basicRequest.isLatest(id)) return
        console.warn('[admin-players] basic load failed', error)
      })
      .finally(() => {
        if (basicRequest.isLatest(id)) setBasicLoading(false)
      })

    return undefined
  }, [open, selectedPlayerId, basicRequest])

  useEffect(() => {
    if (!open || !selectedPlayerId || !basic) return undefined

    const { id } = capturesRequest.begin()
    setCapturesLoading(true)

    getAdminPlayerCaptures(selectedPlayerId, 8)
      .then((data) => {
        if (!capturesRequest.isLatest(id)) return
        setCaptures(data)
      })
      .catch((error) => {
        if (isAbortError(error) || !capturesRequest.isLatest(id)) return
        console.warn('[admin-players] captures load failed', error)
      })
      .finally(() => {
        if (capturesRequest.isLatest(id)) setCapturesLoading(false)
      })

    return undefined
  }, [open, selectedPlayerId, basic, capturesRequest])

  useEffect(() => {
    if (!open || !selectedPlayerId || !basic) return undefined

    const { id } = albumRequest.begin()
    setAlbumLoading(true)

    getAdminPlayerAlbum(selectedPlayerId)
      .then((data) => {
        if (!albumRequest.isLatest(id)) return
        setAlbumFigures(data)
      })
      .catch((error) => {
        if (isAbortError(error) || !albumRequest.isLatest(id)) return
        console.warn('[admin-players] album load failed', error)
      })
      .finally(() => {
        if (albumRequest.isLatest(id)) setAlbumLoading(false)
      })

    return undefined
  }, [open, selectedPlayerId, basic, albumRequest])

  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !confirmAction && !roleUpdating && !reviewBusy) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose, confirmAction, roleUpdating, reviewBusy])

  if (!open) return null

  const isSelf = selectedPlayerId === supabaseUserId
  const albumStatus = profile?.album_status ?? 'pending'
  const actionsBusy = reviewBusy || roleUpdating

  const handleConfirm = () => {
    if (!confirmAction) return
    const action = confirmAction
    setConfirmAction(null)
    if (action.type === 'review') {
      void onAlbumReview?.(action.status)
    } else if (action.type === 'role') {
      void onRoleChange?.(action.role)
    } else if (action.type === 'delete') {
      onDeleteRequest?.()
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end">
        <button
          type="button"
          aria-label="Cerrar panel"
          className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
          onClick={() => {
            if (!actionsBusy) onClose()
          }}
        />

        <aside
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Detalle de ${profile?.username ?? 'jugador'}`}
          className="relative flex h-full w-full flex-col bg-white shadow-2xl lg:max-w-[540px]"
        >
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div className="flex items-start gap-3">
              {profile && <DrawerAvatar profile={profile} />}
              <div>
                <h3 className="text-lg font-black text-ink">{profile?.username ?? 'Sin usuario'}</h3>
                <p className="text-sm text-muted">{getFullName(profile) || profile?.email || '-'}</p>
                {previewPlayer?.lastActivity && (
                  <p className="mt-0.5 text-xs text-muted">
                    Actividad: {formatRelativeTime(previewPlayer.lastActivity)}
                  </p>
                )}
              </div>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              disabled={actionsBusy}
              className="rounded-lg p-2 text-muted transition-colors hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50"
              aria-label="Cerrar panel de jugador"
            >
              <FaXmark />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="space-y-6">
              <section aria-labelledby="drawer-profile-heading" className="space-y-4 rounded-2xl border border-border bg-slate-50/60 p-4">
                <h4 id="drawer-profile-heading" className="sr-only">
                  Perfil del jugador
                </h4>
                {basicLoading && !basic ? (
                  <BlockSkeleton rows={4} />
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <ReviewBadge status={albumStatus} />
                      <RoleBadge role={profile?.role ?? 'user'} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InfoRow label="Email" value={profile?.email} />
                      <InfoRow label="DNI" value={profile?.dni} />
                      <InfoRow label="Localidad" value={profile?.localidad} />
                      <InfoRow label="Alta" value={formatDate(profile?.created_at)} />
                      <InfoRow label="Último acceso" value={formatRelativeTime(profile?.last_login_at)} />
                      <InfoRow label="Celular" value={profile?.celular} />
                    </div>
                    {profile?.direccion_texto && (
                      <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3">
                        <p className="text-[10px] font-black uppercase tracking-wide text-blue-900">
                          Domicilio (solo admin)
                        </p>
                        <p className="mt-1 text-sm font-semibold text-ink">{profile.direccion_texto}</p>
                        {!showMap ? (
                          <button
                            type="button"
                            onClick={() => setShowMap(true)}
                            className="mt-3 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                          >
                            Ver mapa del domicilio
                          </button>
                        ) : (
                          <div className="mt-3">
                            <Suspense fallback={<div className="h-[140px] animate-pulse rounded-2xl bg-slate-100" />}>
                              <LazyPlayerLocationMap
                                lat={profile.direccion_lat}
                                lng={profile.direccion_lng}
                                label={profile.username ?? 'Jugador'}
                                className="h-[140px]"
                              />
                            </Suspense>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </section>

              <section aria-labelledby="drawer-progress-heading">
                <h4 id="drawer-progress-heading" className="text-xs font-black uppercase tracking-wide text-muted">
                  Progreso del álbum
                </h4>
                {basicLoading && !basic ? (
                  <div className="mt-3">
                    <BlockSkeleton rows={2} />
                  </div>
                ) : (
                  <>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="rounded-xl border border-border bg-white px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Figuritas</p>
                        <p className="mt-0.5 text-lg font-black tabular-nums">
                          {mainProgress?.obtained ?? 0}/{mainProgress?.total ?? 0}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border bg-white px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Porcentaje</p>
                        <p className="mt-0.5 text-lg font-black tabular-nums">{mainPct}%</p>
                      </div>
                      <div className="rounded-xl border border-border bg-white px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Bonus</p>
                        <p className="mt-0.5 text-lg font-black tabular-nums">{bonusObtained}</p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-progress transition-all"
                        style={{ width: `${mainPct}%` }}
                      />
                    </div>
                    {albumLoading ? (
                      <div className="mt-3 h-6 animate-pulse rounded-full bg-slate-100" aria-hidden="true" />
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        {Object.entries(rarities).map(([key, count]) => (
                          <span
                            key={key}
                            className="rounded-full bg-white px-2.5 py-1 font-semibold capitalize text-ink ring-1 ring-border"
                          >
                            {key}: {count}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </section>

              <section aria-labelledby="drawer-captures-heading">
                <h4 id="drawer-captures-heading" className="text-xs font-black uppercase tracking-wide text-muted">
                  Últimas capturas
                </h4>
                {capturesLoading ? (
                  <div className="mt-3">
                    <GridSkeleton count={4} />
                  </div>
                ) : captures?.length ? (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {captures.map((capture) => {
                      const figure = albumFigures?.find(
                        (row) => String(row.id) === String(capture.figure_id),
                      )
                      return (
                        <div
                          key={capture.id}
                          className="overflow-hidden rounded-xl border border-border bg-white"
                        >
                          <button
                            type="button"
                            className="aspect-square w-full bg-slate-100"
                            aria-label={`Ver captura de ${figure?.title ?? 'figurita'}`}
                            onClick={() =>
                              capture.photo_url &&
                              onPhotoPreview?.({
                                url: capture.photo_url,
                                title: figure?.title ?? 'Captura',
                              })
                            }
                          >
                            {capture.photo_url ? (
                              <img
                                src={capture.photo_url}
                                alt=""
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <span className="flex h-full items-center justify-center text-[10px] font-bold uppercase text-muted">
                                Sin foto
                              </span>
                            )}
                          </button>
                          <div className="space-y-1 p-2">
                            <p className="truncate text-xs font-semibold text-ink">
                              {figure?.title ?? 'Figurita'}
                            </p>
                            <p className="text-[10px] text-muted">{formatRelativeTime(capture.created_at)}</p>
                            <ReviewBadge status={capture.validation_status ?? 'pending'} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted">Sin capturas registradas.</p>
                )}
              </section>

              <section aria-labelledby="drawer-review-heading" className="rounded-2xl border border-border bg-white p-4">
                <h4 id="drawer-review-heading" className="text-xs font-black uppercase tracking-wide text-muted">
                  Revisión de álbum
                </h4>
                <textarea
                  value={albumReviewNote}
                  onChange={(event) => onAlbumReviewNoteChange(event.target.value)}
                  placeholder="Nota administrativa…"
                  rows="3"
                  disabled={actionsBusy}
                  className="mt-3 w-full resize-none rounded-xl border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-60"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <AdminToolButton
                    label="Aprobar álbum"
                    onClick={() =>
                      setConfirmAction({
                        type: 'review',
                        status: 'approved',
                        title: 'Aprobar álbum',
                        description: 'El jugador quedará con álbum aprobado.',
                        variant: 'default',
                      })
                    }
                    disabled={actionsBusy}
                    busy={reviewBusy}
                  />
                  <AdminToolButton
                    label="Rechazar álbum"
                    onClick={() =>
                      setConfirmAction({
                        type: 'review',
                        status: 'rejected',
                        title: 'Rechazar álbum',
                        description: 'Marca el álbum como rechazado y bloquea operativamente al jugador.',
                        variant: 'danger',
                      })
                    }
                    disabled={actionsBusy}
                    busy={reviewBusy}
                  />
                  <AdminToolButton
                    label="Marcar pendiente"
                    onClick={() =>
                      setConfirmAction({
                        type: 'review',
                        status: 'pending',
                        title: 'Marcar como pendiente',
                        description: 'Restaura el estado de revisión a pendiente.',
                        variant: 'secondary',
                      })
                    }
                    disabled={actionsBusy}
                    busy={reviewBusy}
                  />
                </div>
              </section>

              <section aria-labelledby="drawer-tools-heading">
                <h4 id="drawer-tools-heading" className="text-xs font-black uppercase tracking-wide text-muted">
                  Herramientas admin
                </h4>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <AdminToolButton
                    label="Bloquear jugador"
                    description="Marca el álbum como rechazado"
                    onClick={() =>
                      setConfirmAction({
                        type: 'review',
                        status: 'rejected',
                        title: 'Bloquear jugador',
                        description: '¿Confirmás bloquear este jugador rechazando su álbum?',
                        variant: 'danger',
                      })
                    }
                    variant="danger"
                    disabled={albumStatus === 'rejected' || actionsBusy}
                    busy={reviewBusy}
                  />
                  <AdminToolButton
                    label="Desbloquear"
                    description="Restaura estado pendiente"
                    onClick={() =>
                      setConfirmAction({
                        type: 'review',
                        status: 'pending',
                        title: 'Desbloquear jugador',
                        description: '¿Restaurar el estado del álbum a pendiente?',
                        variant: 'secondary',
                      })
                    }
                    variant="secondary"
                    disabled={albumStatus !== 'rejected' || actionsBusy}
                    busy={reviewBusy}
                  />
                  {isSuperAdmin && !isSelf && (
                    <>
                      <label className="col-span-full rounded-xl border border-border bg-white px-4 py-3">
                        <span className="text-xs font-bold uppercase tracking-wide text-muted">Cambiar rol</span>
                        <select
                          value={pendingRole ?? profile?.role ?? 'user'}
                          disabled={roleUpdating || reviewBusy}
                          onChange={(event) => {
                            const nextRole = event.target.value
                            if (nextRole === (profile?.role ?? 'user')) return
                            setPendingRole(nextRole)
                            setConfirmAction({
                              type: 'role',
                              role: nextRole,
                              title: 'Cambiar rol',
                              description: `¿Confirmás cambiar el rol a ${formatRoleLabel(nextRole)}?`,
                              variant: 'default',
                            })
                          }}
                          className="mt-2 block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        >
                          {PROFILE_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {formatRoleLabel(role)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <AdminToolButton
                        label="Eliminar cuenta"
                        description="Soft delete — oculta del panel"
                        onClick={() =>
                          setConfirmAction({
                            type: 'delete',
                            title: 'Eliminar jugador',
                            description: 'Se abrirá el flujo de confirmación con el username.',
                            variant: 'danger',
                          })
                        }
                        variant="danger"
                        disabled={actionsBusy}
                      />
                    </>
                  )}
                </div>
              </section>

              <section aria-labelledby="drawer-album-heading">
                <h4 id="drawer-album-heading" className="text-xs font-black uppercase tracking-wide text-muted">
                  Álbum completo
                </h4>
                {albumLoading ? (
                  <div className="mt-3">
                    <GridSkeleton count={6} />
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {(albumFigures ?? []).map((figure) => {
                      const challenge = getFigureChallenge(figure)
                      return (
                        <div
                          key={figure.id}
                          className="overflow-hidden rounded-xl border border-border bg-white"
                        >
                          <div className="aspect-[4/3] bg-slate-100">
                            {figure.photo_url ? (
                              <button
                                type="button"
                                className="h-full w-full"
                                aria-label={`Ver foto de ${figure.title}`}
                                onClick={() =>
                                  onPhotoPreview?.({ url: figure.photo_url, title: figure.title })
                                }
                              >
                                <img
                                  src={figure.photo_url}
                                  alt={figure.title}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              </button>
                            ) : (
                              <div className="flex h-full items-center justify-center text-[10px] font-bold uppercase text-muted">
                                No obtenida
                              </div>
                            )}
                          </div>
                          <div className="space-y-1.5 p-2.5">
                            <div className="flex items-start justify-between gap-1">
                              <p className="text-xs font-bold leading-tight">{figure.title}</p>
                              <GameTypeBadges figure={figure} />
                            </div>
                            {figure.obtenida && challenge && (
                              <p className="text-[10px] leading-4 text-muted">{challenge.title}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            </div>
          </div>
        </aside>
      </div>

      <AdminConfirmModal
        open={Boolean(confirmAction)}
        title={confirmAction?.title ?? 'Confirmar acción'}
        description={confirmAction?.description}
        variant={confirmAction?.variant ?? 'default'}
        busy={actionsBusy}
        onCancel={() => {
          if (actionsBusy) return
          setConfirmAction(null)
          setPendingRole(null)
        }}
        onConfirm={handleConfirm}
      />
    </>
  )
}
