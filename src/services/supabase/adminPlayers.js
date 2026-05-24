import { supabase } from '../../lib/supabase'
import { getSessionUserId } from './auth'
import { getBonusFigures, getMainProgressState } from '../../utils/figureGameRules'
import { PROFILE_ROLES } from '../../utils/roles'
import { isAbortError, withTimeout } from '../../utils/adminAsync'

const PROFILE_COLUMNS =
  'id, username, avatar_url, role, is_admin, created_at, album_status, album_reviewed_at, album_reviewed_by, album_review_note, nombre, apellido, dni, email, celular, auth_provider, profile_completed, last_login_at, updated_at, deleted_at, deleted_by, direccion_texto, direccion_lat, direccion_lng, localidad, provincia, pais, codigo_postal'

const FIGURE_COLUMNS =
  'id, title, description, rarity, lat, lng, image_url, active, capture_radius, is_bonus, is_hidden, unlock_order, reveal_after_count, bonus_type, reveal_radius, marker_icon_url, marker_icon_size, challenge_title, challenge_description, challenge_type, challenge_example_image_url, created_at'

const CAPTURE_COLUMNS =
  'id, user_id, figure_id, lat, lng, created_at, photo_url, device, validation_status, reviewed_at, reviewed_by, review_note'

const VALID_ROLES = PROFILE_ROLES
const VALID_REVIEW_STATUSES = ['pending', 'approved', 'rejected']

let figuresCache = null
let figuresCacheAt = 0
const FIGURES_CACHE_TTL_MS = 60_000
const RPC_TIMEOUT_MS = 25_000

function rpcOptions(signal) {
  return signal ? { abortSignal: signal } : undefined
}

async function runRpc(promiseFactory, { signal, timeoutMs = RPC_TIMEOUT_MS } = {}) {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }

  const task = promiseFactory()
  return withTimeout(task, timeoutMs, 'TIMEOUT')
}

function logAdminPlayers(message, detail) {
  console.info('[admin-players]', message, detail)
}

function assertReviewStatus(status) {
  if (!VALID_REVIEW_STATUSES.includes(status)) {
    throw new Error('INVALID_REVIEW_STATUS')
  }
}

function assertRole(role) {
  if (!VALID_ROLES.includes(role)) {
    throw new Error('INVALID_ROLE')
  }
}

function mapRoleFallback(profile) {
  return {
    ...profile,
    role: profile.role ?? (profile.is_admin ? 'admin' : 'user'),
  }
}

function normalizeFigure(row) {
  return {
    ...row,
    id: String(row.id),
    nombre: row.title,
    rareza: row.rarity,
    obtenida: false,
    foto: null,
  }
}

function mapListPlayer(row) {
  return {
    ...row,
    album_status: row.album_status ?? 'pending',
    mainProgress: row.mainProgress ?? { obtained: 0, total: 0 },
    bonusObtained: row.bonusObtained ?? 0,
    totalCaptures: row.totalCaptures ?? 0,
  }
}

async function fetchProfileById(userId) {
  let { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .is('deleted_at', null)
    .single()

  if (error && /deleted_at|deleted_by/i.test(error.message ?? '')) {
    const fallback = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS.replace(', deleted_at, deleted_by', ''))
      .eq('id', userId)
      .single()
    data = fallback.data
    error = fallback.error
  }

  if (error) throw error
  if (!data) throw new Error('PLAYER_NOT_FOUND')
  return mapRoleFallback(data)
}

async function fetchFigures(force = false) {
  const now = Date.now()
  if (!force && figuresCache && now - figuresCacheAt < FIGURES_CACHE_TTL_MS) {
    return figuresCache
  }

  const { data, error } = await supabase.from('figures').select(FIGURE_COLUMNS)
  if (error) throw error
  figuresCache = (data ?? []).map(normalizeFigure)
  figuresCacheAt = now
  return figuresCache
}

async function fetchUserFigures(userId) {
  let query = supabase
    .from('user_figures')
    .select('id, user_id, figure_id, captured_at, photo_url, source, updated_at, last_photo_updated_at')
    .eq('user_id', userId)

  let { data, error } = await query

  if (error && /updated_at|last_photo_updated_at/i.test(error.message ?? '')) {
    const fallback = await supabase
      .from('user_figures')
      .select('id, user_id, figure_id, captured_at, photo_url, source')
      .eq('user_id', userId)
    data = fallback.data
    error = fallback.error
  }

  if (error) throw error
  return data ?? []
}

async function fetchCaptures(userId, { limit = null } = {}) {
  let query = supabase
    .from('captures')
    .select(CAPTURE_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (limit) query = query.limit(limit)

  let { data, error } = await query

  if (error && /validation_status|reviewed_at|reviewed_by|review_note/i.test(error.message ?? '')) {
    let fallbackQuery = supabase
      .from('captures')
      .select('id, user_id, figure_id, lat, lng, created_at, photo_url, device')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (limit) fallbackQuery = fallbackQuery.limit(limit)
    const fallback = await fallbackQuery
    data = fallback.data?.map((capture) => ({
      ...capture,
      validation_status: 'pending',
      reviewed_at: null,
      reviewed_by: null,
      review_note: null,
    }))
    error = fallback.error
  }

  if (error) throw error
  return data ?? []
}

function buildPlayerSummary(profile, figures, unlocks, captures) {
  const unlockedIds = new Set(unlocks.map((row) => String(row.figure_id)))
  const playerFigures = figures.map((figure) => ({
    ...figure,
    obtenida: unlockedIds.has(String(figure.id)),
  }))
  const mainProgress = getMainProgressState(playerFigures)
  const bonusObtained = getBonusFigures(playerFigures).filter((figure) => figure.obtenida).length
  const lastCapture = captures[0] ?? null

  return {
    ...profile,
    album_status: profile.album_status ?? 'pending',
    mainProgress,
    bonusObtained,
    totalCaptures: captures.length,
    lastActivity: lastCapture?.created_at ?? profile.last_login_at ?? null,
    lastCapture,
  }
}

function buildAlbumFigures(figures, unlocks, captures) {
  const unlockByFigureId = new Map(unlocks.map((row) => [String(row.figure_id), row]))
  const capturesByFigureId = new Map()
  captures.forEach((capture) => {
    const key = String(capture.figure_id)
    if (!capturesByFigureId.has(key)) capturesByFigureId.set(key, capture)
  })

  return figures.map((figure) => {
    const unlock = unlockByFigureId.get(String(figure.id))
    const capture = capturesByFigureId.get(String(figure.id))
    return {
      ...figure,
      obtenida: Boolean(unlock),
      captured_at: unlock?.captured_at ?? capture?.created_at ?? null,
      photo_url: unlock?.photo_url ?? capture?.photo_url ?? null,
      last_photo_updated_at: unlock?.last_photo_updated_at ?? unlock?.updated_at ?? null,
      capture,
    }
  })
}

export async function getAdminPlayersPage(
  {
    query = '',
    username = '',
    email = '',
    dni = '',
    localidad = '',
    albumStatus = 'all',
    role = 'all',
    progress = 'all',
    quickTab = 'all',
    page = 1,
    pageSize = 25,
  } = {},
  { signal } = {},
) {
  const safePage = Math.max(1, page)
  const safePageSize = Math.max(1, Math.min(pageSize, 100))
  const offset = (safePage - 1) * safePageSize

  const { data, error } = await runRpc(
    () =>
      supabase.rpc(
        'admin_list_players',
        {
          p_query: query.trim(),
          p_username: username.trim(),
          p_email: email.trim(),
          p_dni: dni.trim(),
          p_localidad: localidad.trim(),
          p_album_status: albumStatus,
          p_role: role,
          p_progress: progress,
          p_quick_tab: quickTab,
          p_limit: safePageSize,
          p_offset: offset,
        },
        rpcOptions(signal),
      ),
    { signal },
  )

  if (error) {
    if (isAbortError(error)) throw error
    throw error
  }

  const payload = data ?? { players: [], total: 0 }
  const players = (payload.players ?? []).map(mapListPlayer)

  logAdminPlayers('players page loaded', {
    page: safePage,
    pageSize: safePageSize,
    count: players.length,
    total: payload.total,
  })

  return {
    players,
    total: Number(payload.total ?? 0),
    page: safePage,
    pageSize: safePageSize,
  }
}

export async function getAdminPlayerMetrics({ signal } = {}) {
  const { data, error } = await runRpc(
    () => supabase.rpc('admin_player_metrics', {}, rpcOptions(signal)),
    { signal },
  )
  if (error) {
    if (isAbortError(error)) throw error
    throw error
  }

  return {
    total: Number(data?.total ?? 0),
    active: Number(data?.active ?? 0),
    blocked: Number(data?.blocked ?? 0),
    admins: Number(data?.admins ?? 0),
    withFigures: Number(data?.withFigures ?? 0),
  }
}

export async function getAdminPlayerMapMarkers({ signal } = {}) {
  const { data, error } = await runRpc(
    () => supabase.rpc('admin_player_map_markers', {}, rpcOptions(signal)),
    { signal },
  )
  if (error) {
    if (isAbortError(error)) throw error
    throw error
  }
  return data ?? []
}

export async function getAdminPlayerBasic(userId) {
  if (!userId) throw new Error('MISSING_USER_ID')

  const [profile, figures, unlocks, captures] = await Promise.all([
    fetchProfileById(userId),
    fetchFigures(),
    fetchUserFigures(userId),
    fetchCaptures(userId, { limit: 1 }),
  ])

  const summary = buildPlayerSummary(profile, figures, unlocks, captures)

  return {
    profile,
    summary,
    mainProgress: summary.mainProgress,
    bonusObtained: summary.bonusObtained,
  }
}

export async function getAdminPlayerCaptures(userId, limit = 8) {
  if (!userId) throw new Error('MISSING_USER_ID')
  return fetchCaptures(userId, { limit })
}

export async function getAdminPlayerAlbum(userId) {
  if (!userId) throw new Error('MISSING_USER_ID')

  const [figures, unlocks, captures] = await Promise.all([
    fetchFigures(),
    fetchUserFigures(userId),
    fetchCaptures(userId),
  ])

  return buildAlbumFigures(figures, unlocks, captures)
}

export async function getAdminPlayerDetail(userId) {
  if (!userId) throw new Error('MISSING_USER_ID')

  const [basic, captures, albumFigures] = await Promise.all([
    getAdminPlayerBasic(userId),
    fetchCaptures(userId),
    getAdminPlayerAlbum(userId),
  ])

  const detail = {
    profile: basic.profile,
    summary: basic.summary,
    albumFigures,
    captures,
    mainProgress: basic.mainProgress,
    bonusObtained: basic.bonusObtained,
  }

  logAdminPlayers('player detail loaded', {
    userId,
    figures: albumFigures.length,
    captures: captures.length,
  })

  return detail
}

export async function updatePlayerAlbumStatus(userId, status, note = '') {
  assertReviewStatus(status)
  const reviewedBy = await getSessionUserId()
  const payload = {
    album_status: status,
    album_reviewed_at: new Date().toISOString(),
    album_reviewed_by: reviewedBy,
    album_review_note: note?.trim() || null,
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .is('deleted_at', null)
    .select(PROFILE_COLUMNS)
    .single()

  if (error) throw error
  logAdminPlayers('album status updated', { userId, status })
  return data
}

export async function updateCaptureValidation(captureId, status, note = '') {
  assertReviewStatus(status)
  const reviewedBy = await getSessionUserId()
  const payload = {
    validation_status: status,
    reviewed_at: new Date().toISOString(),
    reviewed_by: reviewedBy,
    review_note: note?.trim() || null,
  }

  const { data, error } = await supabase
    .from('captures')
    .update(payload)
    .eq('id', captureId)
    .select(CAPTURE_COLUMNS)
    .single()

  if (error) throw error
  logAdminPlayers('capture status updated', { captureId, status })
  return data
}

export async function updatePlayerRole(userId, role) {
  assertRole(role)
  if (!userId) throw new Error('MISSING_USER_ID')

  const { data, error } = await supabase.rpc('super_admin_update_user_role', {
    target_user_id: userId,
    new_role: role,
  })

  if (error) {
    if (/cannot_change_own_role/i.test(error.message ?? '')) {
      throw new Error('CANNOT_CHANGE_OWN_ROLE')
    }
    if (/forbidden/i.test(error.message ?? '')) {
      throw new Error('FORBIDDEN')
    }
    throw error
  }

  logAdminPlayers('role updated', { userId, role })
  return mapRoleFallback(data)
}

export async function deletePlayer(userId) {
  if (!userId) throw new Error('MISSING_USER_ID')

  const { error } = await supabase.rpc('super_admin_delete_user', {
    target_user_id: userId,
  })

  if (error) {
    if (/cannot_delete_self/i.test(error.message ?? '')) {
      throw new Error('CANNOT_DELETE_SELF')
    }
    if (/cannot_delete_last_super_admin/i.test(error.message ?? '')) {
      throw new Error('CANNOT_DELETE_LAST_SUPER_ADMIN')
    }
    if (/forbidden/i.test(error.message ?? '')) {
      throw new Error('FORBIDDEN')
    }
    throw error
  }

  logAdminPlayers('user soft-deleted', { userId })
}

/** @deprecated Use getAdminPlayersPage */
export async function getAdminPlayers() {
  const { players } = await getAdminPlayersPage({ page: 1, pageSize: 100 })
  return players
}
