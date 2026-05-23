import { supabase } from '../../lib/supabase'
import { profileLog } from '../../utils/authLog'
import {
  computeProfileCompleted,
  normalizeDni,
  normalizePhone,
} from '../../utils/profileValidation'

export const PROFILE_BASE_COLUMNS =
  'id, username, avatar_url, is_admin, role, created_at, album_status, album_reviewed_at, album_reviewed_by, album_review_note'

export const PROFILE_IDENTITY_COLUMNS =
  'nombre, apellido, dni, email, celular, auth_provider, profile_completed, last_login_at, updated_at'

export const PROFILE_ADDRESS_COLUMNS =
  'direccion_texto, direccion_lat, direccion_lng, localidad, provincia, pais, codigo_postal'

export const PROFILE_FULL_COLUMNS = `${PROFILE_BASE_COLUMNS}, ${PROFILE_IDENTITY_COLUMNS}, ${PROFILE_ADDRESS_COLUMNS}`

const LEGACY_COLUMNS = 'id, username, avatar_url, is_admin, created_at'

function isMissingExtendedColumnError(error) {
  return /nombre|apellido|dni|email|celular|auth_provider|profile_completed|last_login_at|updated_at|direccion_|localidad|provincia|pais|codigo_postal|album_status|album_review|\brole\b/i.test(
    error?.message ?? '',
  )
}

function normalizeAddressPayload(address) {
  return {
    direccion_texto: address?.direccion_texto?.trim() || null,
    direccion_lat: address?.direccion_lat == null ? null : Number(address.direccion_lat),
    direccion_lng: address?.direccion_lng == null ? null : Number(address.direccion_lng),
    localidad: address?.localidad?.trim() || null,
    provincia: address?.provincia?.trim() || null,
    pais: address?.pais?.trim() || null,
    codigo_postal: address?.codigo_postal?.trim() || null,
  }
}

export function withProfileDefaults(profile) {
  if (!profile) return profile
  return {
    ...profile,
    role: profile.role ?? (profile.is_admin ? 'admin' : 'user'),
    nombre: profile.nombre ?? null,
    apellido: profile.apellido ?? null,
    dni: profile.dni ?? null,
    email: profile.email ?? null,
    celular: profile.celular ?? null,
    auth_provider: profile.auth_provider ?? 'anonymous',
    profile_completed: profile.profile_completed ?? false,
    last_login_at: profile.last_login_at ?? null,
    updated_at: profile.updated_at ?? null,
    album_status: profile.album_status ?? 'pending',
    album_reviewed_at: profile.album_reviewed_at ?? null,
    album_reviewed_by: profile.album_reviewed_by ?? null,
    album_review_note: profile.album_review_note ?? null,
    direccion_texto: profile.direccion_texto ?? null,
    direccion_lat: profile.direccion_lat ?? null,
    direccion_lng: profile.direccion_lng ?? null,
    localidad: profile.localidad ?? null,
    provincia: profile.provincia ?? null,
    pais: profile.pais ?? null,
    codigo_postal: profile.codigo_postal ?? null,
  }
}

function buildProfilePayload(userId, input, address = null) {
  const payload = {
    id: userId,
    nombre: input.nombre?.trim() || null,
    apellido: input.apellido?.trim() || null,
    dni: normalizeDni(input.dni) || null,
    email: input.email?.trim()?.toLowerCase() || null,
    celular: normalizePhone(input.celular) || null,
    username: input.username?.trim() || null,
    auth_provider: input.auth_provider?.trim() || null,
  }

  if (address) {
    Object.assign(payload, normalizeAddressPayload(address))
  } else if (input.direccion_texto || input.direccion_lat != null) {
    Object.assign(payload, normalizeAddressPayload(input))
  }

  payload.profile_completed = computeProfileCompleted(payload)
  return payload
}

async function selectProfile(userId, columns = PROFILE_FULL_COLUMNS) {
  return supabase.from('profiles').select(columns).eq('id', userId).maybeSingle()
}

export async function fetchProfileById(userId) {
  if (!userId) return null

  let response = await selectProfile(userId, PROFILE_FULL_COLUMNS)

  if (response.error && isMissingExtendedColumnError(response.error)) {
    response = await selectProfile(userId, LEGACY_COLUMNS)
  }

  if (response.error) throw response.error
  return withProfileDefaults(response.data)
}

export async function isUsernameAvailable(username, userId = null) {
  const trimmed = username?.trim()
  if (!trimmed) return false

  const { data, error } = await supabase.rpc('is_username_available', {
    candidate: trimmed,
    for_user_id: userId,
  })

  if (error) {
    profileLog.error('username availability check failed', {
      message: error.message,
      code: error.code,
    })
    throw error
  }

  return Boolean(data)
}

export async function upsertUserProfile(userId, input, address = null) {
  if (!userId) throw new Error('MISSING_USER_ID')

  const payload = buildProfilePayload(userId, input, address)
  profileLog.info('profile upsert start', { userId, username: payload.username })

  let response = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select(PROFILE_FULL_COLUMNS)
    .single()

  if (response.error && isMissingExtendedColumnError(response.error)) {
    const legacyPayload = {
      id: userId,
      username: payload.username,
    }
    response = await supabase
      .from('profiles')
      .upsert(legacyPayload, { onConflict: 'id' })
      .select(LEGACY_COLUMNS)
      .single()
  }

  if (response.error) {
    if (/duplicate key|profiles_username_unique/i.test(response.error.message ?? '')) {
      throw new Error('USERNAME_TAKEN')
    }
    throw response.error
  }

  profileLog.info('profile upsert success', {
    userId,
    profileCompleted: response.data?.profile_completed ?? false,
  })

  return withProfileDefaults(response.data)
}

export async function completeUserProfile(userId, input, address) {
  const available = await isUsernameAvailable(input.username, userId)
  if (!available) throw new Error('USERNAME_TAKEN')

  return upsertUserProfile(
    userId,
    {
      ...input,
      profile_completed: true,
    },
    address,
  )
}

export async function updateProfileFields(userId, input, address = null) {
  const payload = buildProfilePayload(userId, input, address)
  delete payload.id

  if (payload.username) {
    const available = await isUsernameAvailable(payload.username, userId)
    if (!available) throw new Error('USERNAME_TAKEN')
  }

  let response = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select(PROFILE_FULL_COLUMNS)
    .single()

  if (response.error && isMissingExtendedColumnError(response.error)) {
    throw new Error('PROFILE_COLUMNS_MISSING')
  }

  if (response.error) {
    if (/duplicate key|profiles_username_unique/i.test(response.error.message ?? '')) {
      throw new Error('USERNAME_TAKEN')
    }
    throw response.error
  }

  return withProfileDefaults(response.data)
}

export async function touchProfileLogin(userId) {
  if (!userId) return

  const { error } = await supabase
    .from('profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', userId)

  if (error && !isMissingExtendedColumnError(error)) {
    profileLog.error('touch login failed', { message: error.message })
  }
}

export async function ensureProfileFromAuthUser(authUser, provider = 'email') {
  if (!authUser?.id) throw new Error('MISSING_AUTH_USER')

  const existing = await fetchProfileById(authUser.id)
  if (existing?.id) return existing

  const metadata = authUser.user_metadata ?? {}
  const fullName = metadata.full_name ?? metadata.name ?? ''
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean)

  return upsertUserProfile(authUser.id, {
    email: authUser.email ?? null,
    nombre: parts[0] ?? null,
    apellido: parts.slice(1).join(' ') || null,
    auth_provider: provider,
    profile_completed: false,
  })
}

export async function fetchProfileWithAddress(userId) {
  return fetchProfileById(userId)
}

export async function updateProfileAddress(userId, address) {
  const current = await fetchProfileById(userId)
  return updateProfileFields(userId, current ?? {}, address)
}

export function pickAddressFields(profile) {
  if (!profile) return null
  return {
    direccion_texto: profile.direccion_texto ?? null,
    direccion_lat: profile.direccion_lat ?? null,
    direccion_lng: profile.direccion_lng ?? null,
    localidad: profile.localidad ?? null,
    provincia: profile.provincia ?? null,
    pais: profile.pais ?? null,
    codigo_postal: profile.codigo_postal ?? null,
  }
}

// Backward compatibility exports
export { withProfileDefaults as withAddressDefaults }
