import { supabase } from '../../lib/supabase'
import { getSessionUserId } from './auth'
import { getBonusFigures, getMainProgressState } from '../../utils/figureGameRules'
import { PROFILE_ROLES } from '../../utils/roles'

const PROFILE_COLUMNS =
  'id, username, role, is_admin, created_at, album_status, album_reviewed_at, album_reviewed_by, album_review_note, nombre, apellido, dni, email, celular, auth_provider, profile_completed, last_login_at, updated_at, direccion_texto, direccion_lat, direccion_lng, localidad, provincia, pais, codigo_postal'

const FIGURE_COLUMNS =
  'id, title, description, rarity, lat, lng, image_url, active, capture_radius, is_bonus, is_hidden, unlock_order, reveal_after_count, bonus_type, reveal_radius, marker_icon_url, marker_icon_size, challenge_title, challenge_description, challenge_type, challenge_example_image_url, created_at'

const CAPTURE_COLUMNS =
  'id, user_id, figure_id, lat, lng, created_at, photo_url, device, validation_status, reviewed_at, reviewed_by, review_note'

const VALID_ROLES = PROFILE_ROLES

const VALID_REVIEW_STATUSES = ['pending', 'approved', 'rejected']

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

async function fetchProfiles() {
  let { data, error } = await supabase.from('profiles').select(PROFILE_COLUMNS)

  if (error && /album_status|album_review/i.test(error.message ?? '')) {
    const fallback = await supabase.from('profiles').select('id, username, created_at')
    data = fallback.data?.map((profile) => ({
      ...profile,
      role: 'user',
      is_admin: false,
      album_status: 'pending',
      album_reviewed_at: null,
      album_reviewed_by: null,
      album_review_note: null,
      nombre: null,
      apellido: null,
      dni: null,
      email: null,
      celular: null,
      auth_provider: 'anonymous',
      profile_completed: false,
      last_login_at: null,
      updated_at: null,
      direccion_texto: null,
      direccion_lat: null,
      direccion_lng: null,
      localidad: null,
      provincia: null,
      pais: null,
      codigo_postal: null,
    }))
    error = fallback.error
  } else if (
    error &&
    /nombre|apellido|dni|email|celular|auth_provider|profile_completed|last_login_at|updated_at|direccion_|localidad|provincia|pais|codigo_postal/i.test(
      error.message ?? '',
    )
  ) {
    const fallback = await supabase
      .from('profiles')
      .select('id, username, created_at, album_status, album_reviewed_at, album_reviewed_by, album_review_note')
    data = fallback.data?.map((profile) => ({
      ...profile,
      role: profile.role ?? 'user',
      is_admin: profile.is_admin ?? false,
      nombre: null,
      apellido: null,
      dni: null,
      email: null,
      celular: null,
      auth_provider: 'anonymous',
      profile_completed: false,
      last_login_at: null,
      updated_at: null,
      direccion_texto: null,
      direccion_lat: null,
      direccion_lng: null,
      localidad: null,
      provincia: null,
      pais: null,
      codigo_postal: null,
    }))
    error = fallback.error
  }

  if (error) throw error
  return (data ?? []).map(mapRoleFallback)
}

async function fetchFigures() {
  const { data, error } = await supabase.from('figures').select(FIGURE_COLUMNS)
  if (error) throw error
  return (data ?? []).map(normalizeFigure)
}

async function fetchUserFigures(userId = null) {
  let query = supabase
    .from('user_figures')
    .select('id, user_id, figure_id, captured_at, photo_url, source, updated_at, last_photo_updated_at')

  if (userId) query = query.eq('user_id', userId)

  let { data, error } = await query

  if (error && /updated_at|last_photo_updated_at/i.test(error.message ?? '')) {
    let fallbackQuery = supabase
      .from('user_figures')
      .select('id, user_id, figure_id, captured_at, photo_url, source')
    if (userId) fallbackQuery = fallbackQuery.eq('user_id', userId)
    const fallback = await fallbackQuery
    data = fallback.data
    error = fallback.error
  }

  if (error) throw error
  return data ?? []
}

async function fetchCaptures(userId = null) {
  let query = supabase.from('captures').select(CAPTURE_COLUMNS)
  if (userId) query = query.eq('user_id', userId)

  let { data, error } = await query

  if (error && /validation_status|reviewed_at|reviewed_by|review_note/i.test(error.message ?? '')) {
    let fallbackQuery = supabase
      .from('captures')
      .select('id, user_id, figure_id, lat, lng, created_at, photo_url, device')
    if (userId) fallbackQuery = fallbackQuery.eq('user_id', userId)
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
  const userUnlocks = unlocks.filter((row) => row.user_id === profile.id)
  const userCaptures = captures.filter((row) => row.user_id === profile.id)
  const unlockedIds = new Set(userUnlocks.map((row) => String(row.figure_id)))
  const playerFigures = figures.map((figure) => ({
    ...figure,
    obtenida: unlockedIds.has(String(figure.id)),
  }))
  const mainProgress = getMainProgressState(playerFigures)
  const bonusObtained = getBonusFigures(playerFigures).filter((figure) => figure.obtenida).length
  const lastCapture = userCaptures
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]

  return {
    ...profile,
    album_status: profile.album_status ?? 'pending',
    mainProgress,
    bonusObtained,
    totalCaptures: userCaptures.length,
    lastActivity: lastCapture?.created_at ?? null,
    lastCapture,
  }
}

export async function getAdminPlayers() {
  const [profiles, figures, unlocks, captures] = await Promise.all([
    fetchProfiles(),
    fetchFigures(),
    fetchUserFigures(),
    fetchCaptures(),
  ])

  const players = profiles
    .map((profile) => buildPlayerSummary(profile, figures, unlocks, captures))
    .sort((a, b) => new Date(b.lastActivity ?? b.created_at) - new Date(a.lastActivity ?? a.created_at))

  logAdminPlayers('players loaded', { count: players.length })
  return players
}

export async function getAdminPlayerDetail(userId) {
  if (!userId) throw new Error('MISSING_USER_ID')

  const [profiles, figures, unlocks, captures] = await Promise.all([
    fetchProfiles(),
    fetchFigures(),
    fetchUserFigures(userId),
    fetchCaptures(userId),
  ])
  const profile = profiles.find((row) => row.id === userId)
  if (!profile) throw new Error('PLAYER_NOT_FOUND')

  const unlockByFigureId = new Map(unlocks.map((row) => [String(row.figure_id), row]))
  const capturesByFigureId = new Map()
  captures
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .forEach((capture) => {
      const key = String(capture.figure_id)
      if (!capturesByFigureId.has(key)) capturesByFigureId.set(key, capture)
    })

  const albumFigures = figures.map((figure) => {
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
  const summary = buildPlayerSummary(profile, figures, unlocks, captures)

  const detail = {
    profile,
    summary,
    albumFigures,
    captures,
    mainProgress: getMainProgressState(albumFigures),
    bonusObtained: getBonusFigures(albumFigures).filter((figure) => figure.obtenida).length,
  }

  logAdminPlayers('player detail loaded', { userId, figures: albumFigures.length, captures: captures.length })
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

  logAdminPlayers('user deleted', { userId })
}
