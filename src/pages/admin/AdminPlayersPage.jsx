import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getAdminPlayerDetail,
  getAdminPlayers,
  updatePlayerAlbumStatus,
} from '../../services/supabase/adminPlayers'
import {
  AdminErrorBanner,
  formatDate,
  GameTypeBadges,
  normalizeText,
  PhotoPreviewModal,
  ReviewBadge,
  StatCard,
} from '../../components/admin/adminShared'
import { getFigureChallenge } from '../../utils/figureChallenges'
import { getFullName } from '../../utils/profileValidation'
import {
  AdminPlayerLocationMap,
  AdminPlayersDistributionMap,
} from '../../components/admin/AdminPlayerLocationMap'

export function AdminPlayersPage() {
  const [players, setPlayers] = useState([])
  const [selectedPlayerId, setSelectedPlayerId] = useState(null)
  const [playerDetail, setPlayerDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [playerLoading, setPlayerLoading] = useState(false)
  const [error, setError] = useState(null)
  const [albumReviewNote, setAlbumReviewNote] = useState('')
  const [photoPreview, setPhotoPreview] = useState(null)
  const [playerFilters, setPlayerFilters] = useState({
    query: '',
    username: '',
    nombre: '',
    apellido: '',
    dni: '',
    email: '',
    localidad: '',
    albumStatus: 'all',
    progress: 'all',
  })

  const loadPlayers = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const nextPlayers = await getAdminPlayers()
      setPlayers(nextPlayers)
    } catch (loadError) {
      setError(loadError?.message ?? 'No pudimos cargar los jugadores.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  const loadPlayerDetail = useCallback(async (userId) => {
    if (!userId) return
    setSelectedPlayerId(userId)
    setPlayerLoading(true)
    setError(null)
    try {
      const detail = await getAdminPlayerDetail(userId)
      setPlayerDetail(detail)
      setAlbumReviewNote(detail.profile.album_review_note ?? '')
    } catch (detailError) {
      setError(detailError?.message ?? 'No pudimos cargar el jugador.')
    } finally {
      setPlayerLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPlayers()
  }, [loadPlayers])

  const filteredPlayers = useMemo(
    () =>
      players.filter((player) => {
        const query = normalizeText(playerFilters.query)
        const username = normalizeText(playerFilters.username)
        const nombre = normalizeText(playerFilters.nombre)
        const apellido = normalizeText(playerFilters.apellido)
        const dni = normalizeText(playerFilters.dni)
        const email = normalizeText(playerFilters.email)
        const localidad = normalizeText(playerFilters.localidad)

        const matchesQuery =
          !query ||
          [
            player.username,
            player.nombre,
            player.apellido,
            player.dni,
            player.email,
            player.localidad,
            getFullName(player),
          ].some((value) => normalizeText(value).includes(query))
        const matchesUsername = !username || normalizeText(player.username).includes(username)
        const matchesNombre = !nombre || normalizeText(player.nombre).includes(nombre)
        const matchesApellido = !apellido || normalizeText(player.apellido).includes(apellido)
        const matchesDni = !dni || normalizeText(player.dni).includes(dni)
        const matchesEmail = !email || normalizeText(player.email).includes(email)
        const matchesLocalidad = !localidad || normalizeText(player.localidad).includes(localidad)
        const matchesStatus =
          playerFilters.albumStatus === 'all' ||
          (player.album_status ?? 'pending') === playerFilters.albumStatus
        const complete =
          player.mainProgress.total > 0 &&
          player.mainProgress.obtained >= player.mainProgress.total
        const matchesProgress =
          playerFilters.progress === 'all' ||
          (playerFilters.progress === 'complete' && complete) ||
          (playerFilters.progress === 'incomplete' && !complete)

        return (
          matchesQuery &&
          matchesUsername &&
          matchesNombre &&
          matchesApellido &&
          matchesDni &&
          matchesEmail &&
          matchesLocalidad &&
          matchesStatus &&
          matchesProgress
        )
      }),
    [playerFilters, players],
  )

  const updatePlayerFilter = (key, value) => {
    setPlayerFilters((current) => ({ ...current, [key]: value }))
  }

  const handleAlbumReview = async (status) => {
    if (!selectedPlayerId) return
    setError(null)
    try {
      await updatePlayerAlbumStatus(selectedPlayerId, status, albumReviewNote)
      await Promise.all([
        loadPlayers({ silent: true }),
        loadPlayerDetail(selectedPlayerId),
      ])
    } catch (reviewError) {
      setError(reviewError?.message ?? 'No pudimos actualizar el estado del álbum.')
    }
  }

  return (
    <div className="space-y-6">
    <>
      <div className="flex items-end justify-between">
        <p className="text-sm text-muted">
          Revisá inscriptos, progreso, fotos y estado de aprobación del álbum.
        </p>
        <div className="flex items-center gap-3">
          {(loading || playerLoading) && (
            <p className="text-sm font-medium text-muted">Cargando…</p>
          )}
          <button
            type="button"
            onClick={() => loadPlayers()}
            className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-bold"
          >
            Actualizar
          </button>
        </div>
      </div>

      <AdminErrorBanner message={error} />

      <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black">Distribución de domicilios</h3>
        <p className="mt-1 text-sm text-muted">
          Vista admin — ubicación aproximada según dirección declarada por cada jugador.
        </p>
        <div className="mt-4">
          <AdminPlayersDistributionMap players={players} className="h-[360px]" />
        </div>
      </section>

      <div className="grid grid-cols-[minmax(520px,0.8fr)_minmax(0,1.2fr)] gap-6">
        <div className="min-w-0 rounded-2xl border border-border bg-white shadow-sm">
          <div className="flex flex-wrap items-end gap-3 border-b border-border bg-slate-50 p-4">
            <label className="text-xs font-bold uppercase tracking-wide text-muted">
              Buscar
              <input
                value={playerFilters.query}
                onChange={(event) => updatePlayerFilter('query', event.target.value)}
                placeholder="Nombre, email, DNI..."
                className="mt-1 block w-52 rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
              />
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-muted">
              Username
              <input
                value={playerFilters.username}
                onChange={(event) => updatePlayerFilter('username', event.target.value)}
                placeholder="Apodo"
                className="mt-1 block w-36 rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
              />
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-muted">
              Localidad
              <input
                value={playerFilters.localidad}
                onChange={(event) => updatePlayerFilter('localidad', event.target.value)}
                placeholder="San Fernando"
                className="mt-1 block w-36 rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
              />
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-muted">
              DNI
              <input
                value={playerFilters.dni}
                onChange={(event) => updatePlayerFilter('dni', event.target.value)}
                placeholder="12345678"
                className="mt-1 block w-32 rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
              />
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-muted">
              Email
              <input
                value={playerFilters.email}
                onChange={(event) => updatePlayerFilter('email', event.target.value)}
                placeholder="email"
                className="mt-1 block w-40 rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
              />
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-muted">
              Estado
              <select
                value={playerFilters.albumStatus}
                onChange={(event) => updatePlayerFilter('albumStatus', event.target.value)}
                className="mt-1 block w-40 rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
              >
                <option value="all">Todos</option>
                <option value="pending">Pendiente</option>
                <option value="approved">Aprobado</option>
                <option value="rejected">Rechazado</option>
              </select>
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-muted">
              Progreso
              <select
                value={playerFilters.progress}
                onChange={(event) => updatePlayerFilter('progress', event.target.value)}
                className="mt-1 block w-40 rounded-xl border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink"
              >
                <option value="all">Todos</option>
                <option value="complete">Completo</option>
                <option value="incomplete">Incompleto</option>
              </select>
            </label>
          </div>

          <div className="max-h-[720px] overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Jugador</th>
                  <th className="px-4 py-3">Localidad</th>
                  <th className="px-4 py-3">Alta</th>
                  <th className="px-4 py-3">Principal</th>
                  <th className="px-4 py-3">Bonus</th>
                  <th className="px-4 py-3">Capturas</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Última act.</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map((player) => (
                  <tr
                    key={player.id}
                    className={`cursor-pointer border-t border-border/70 hover:bg-slate-50 ${
                      selectedPlayerId === player.id ? 'bg-progress/10' : ''
                    }`}
                    onClick={() => loadPlayerDetail(player.id)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold">{player.username ?? 'Sin usuario'}</p>
                      <p className="text-xs text-muted">{getFullName(player) || player.email || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">{player.localidad ?? '-'}</td>
                    <td className="px-4 py-3 text-xs">{formatDate(player.created_at)}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {player.mainProgress.obtained}/{player.mainProgress.total}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{player.bonusObtained}</td>
                    <td className="px-4 py-3 font-mono text-xs">{player.totalCaptures}</td>
                    <td className="px-4 py-3">
                      <ReviewBadge status={player.album_status ?? 'pending'} />
                    </td>
                    <td className="px-4 py-3 text-xs">{formatDate(player.lastActivity)}</td>
                  </tr>
                ))}
                {!filteredPlayers.length && !loading && (
                  <tr>
                    <td colSpan="8" className="px-4 py-10 text-center text-muted">
                      No hay jugadores para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-border bg-slate-50 p-5">
          {!playerDetail ? (
            <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-border bg-white text-center text-muted">
              Seleccioná un jugador para revisar su álbum.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-black">
                      {playerDetail.profile.username ?? 'Sin usuario'}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-ink">
                      {getFullName(playerDetail.profile) || 'Sin nombre'}
                    </p>
                    <p className="mt-1 font-mono text-xs text-muted">{playerDetail.profile.id}</p>
                  </div>
                  <ReviewBadge status={playerDetail.profile.album_status ?? 'pending'} />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <StatCard
                    label="Progreso principal"
                    value={`${playerDetail.mainProgress.obtained}/${playerDetail.mainProgress.total}`}
                  />
                  <StatCard label="Bonus obtenidas" value={playerDetail.bonusObtained} />
                  <StatCard label="Capturas" value={playerDetail.captures.length} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-muted">
                  <p>Alta: {formatDate(playerDetail.profile.created_at)}</p>
                  <p>Último acceso: {formatDate(playerDetail.profile.last_login_at)}</p>
                  <p>Última captura: {formatDate(playerDetail.summary.lastActivity)}</p>
                  <p>Provider: {playerDetail.profile.auth_provider ?? 'anonymous'}</p>
                  <p>DNI: {playerDetail.profile.dni ?? '-'}</p>
                  <p>Email: {playerDetail.profile.email ?? '-'}</p>
                  <p>Celular: {playerDetail.profile.celular ?? '-'}</p>
                  <p>Perfil completo: {playerDetail.profile.profile_completed ? 'Sí' : 'No'}</p>
                </div>

                <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-blue-900">
                    Domicilio (solo admin)
                  </p>
                  {playerDetail.profile.direccion_texto ? (
                    <>
                      <p className="mt-2 text-sm font-semibold text-ink">
                        {playerDetail.profile.direccion_texto}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {[playerDetail.profile.localidad, playerDetail.profile.provincia]
                          .filter(Boolean)
                          .join(', ')}
                        {playerDetail.profile.codigo_postal
                          ? ` · CP ${playerDetail.profile.codigo_postal}`
                          : ''}
                      </p>
                      <div className="mt-3">
                        <AdminPlayerLocationMap
                          lat={playerDetail.profile.direccion_lat}
                          lng={playerDetail.profile.direccion_lng}
                          label={playerDetail.profile.username ?? 'Jugador'}
                        />
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-muted">Sin dirección registrada.</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h4 className="text-lg font-black">Revisión de álbum</h4>
                <textarea
                  value={albumReviewNote}
                  onChange={(event) => setAlbumReviewNote(event.target.value)}
                  placeholder="Nota administrativa: Fotos correctas, faltan capturas claras..."
                  rows="3"
                  className="mt-3 w-full resize-none rounded-xl border border-border px-3 py-2 text-sm"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleAlbumReview('approved')}
                    className="rounded-xl bg-progress px-4 py-2 text-sm font-bold text-ink"
                  >
                    Aprobar álbum completo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAlbumReview('rejected')}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white"
                  >
                    Rechazar álbum completo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAlbumReview('pending')}
                    className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-bold"
                  >
                    Marcar como pendiente
                  </button>
                </div>
              </div>

              <div>
                <h4 className="mb-3 text-lg font-black">Álbum completo del jugador</h4>
                <div className="grid grid-cols-3 gap-3">
                  {playerDetail.albumFigures.map((figure) => {
                    const capture = figure.capture
                    return (
                      <div
                        key={figure.id}
                        className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
                      >
                        <div className="aspect-[4/3] bg-slate-100">
                          {figure.photo_url ? (
                            <button
                              type="button"
                              className="h-full w-full"
                              onClick={() =>
                                setPhotoPreview({ url: figure.photo_url, title: figure.title })
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
                            <div className="flex h-full items-center justify-center text-xs font-bold uppercase text-muted">
                              No obtenida
                            </div>
                          )}
                        </div>
                        <div className="space-y-2 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold leading-tight">{figure.title}</p>
                            <GameTypeBadges figure={figure} />
                          </div>
                          <p className="text-xs text-muted">
                            {figure.obtenida
                              ? `Capturada: ${formatDate(figure.captured_at)}`
                              : 'Pendiente'}
                          </p>
                          {(() => {
                            const challenge = getFigureChallenge(figure)
                            if (!challenge || !figure.obtenida) return null
                            return (
                              <div className="rounded-xl border border-progress/25 bg-progress/10 p-2.5">
                                <p className="text-[10px] font-black uppercase tracking-wide text-ink">
                                  Consigna
                                </p>
                                <p className="mt-1 text-xs font-bold text-ink">{challenge.title}</p>
                                <p className="mt-1 text-[11px] leading-5 text-muted">
                                  {challenge.description}
                                </p>
                              </div>
                            )
                          })()}
                          {figure.last_photo_updated_at && (
                            <p className="text-xs text-muted">
                              Foto actualizada: {formatDate(figure.last_photo_updated_at)}
                            </p>
                          )}
                          {capture?.lat != null && capture?.lng != null && (
                            <p className="font-mono text-[11px] text-muted">
                              {Number(capture.lat).toFixed(5)}, {Number(capture.lng).toFixed(5)}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <PhotoPreviewModal preview={photoPreview} onClose={() => setPhotoPreview(null)} />
    </>
    </div>
  )
}
