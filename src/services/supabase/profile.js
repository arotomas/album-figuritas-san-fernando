import { supabase } from '../../lib/supabase'

export const PROFILE_ADDRESS_COLUMNS =
  'id, username, avatar_url, is_admin, created_at, direccion_texto, direccion_lat, direccion_lng, localidad, provincia, pais, codigo_postal'

const ADDRESS_ONLY_COLUMNS =
  'direccion_texto, direccion_lat, direccion_lng, localidad, provincia, pais, codigo_postal'

function isMissingAddressColumnError(error) {
  return /direccion_|localidad|provincia|pais|codigo_postal/i.test(error?.message ?? '')
}

function normalizeAddressPayload(address) {
  return {
    direccion_texto: address?.direccion_texto?.trim() || null,
    direccion_lat:
      address?.direccion_lat == null ? null : Number(address.direccion_lat),
    direccion_lng:
      address?.direccion_lng == null ? null : Number(address.direccion_lng),
    localidad: address?.localidad?.trim() || null,
    provincia: address?.provincia?.trim() || null,
    pais: address?.pais?.trim() || null,
    codigo_postal: address?.codigo_postal?.trim() || null,
  }
}

export function withAddressDefaults(profile) {
  if (!profile) return profile
  return {
    ...profile,
    direccion_texto: profile.direccion_texto ?? null,
    direccion_lat: profile.direccion_lat ?? null,
    direccion_lng: profile.direccion_lng ?? null,
    localidad: profile.localidad ?? null,
    provincia: profile.provincia ?? null,
    pais: profile.pais ?? null,
    codigo_postal: profile.codigo_postal ?? null,
  }
}

export async function updateProfileAddress(userId, address) {
  if (!userId) throw new Error('MISSING_USER_ID')

  const payload = normalizeAddressPayload(address)
  let response = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select(PROFILE_ADDRESS_COLUMNS)
    .single()

  if (response.error && isMissingAddressColumnError(response.error)) {
    console.warn('[profile-address] address columns missing — migration 010 required')
    throw new Error('PROFILE_ADDRESS_COLUMNS_MISSING')
  }

  if (response.error) throw response.error
  return withAddressDefaults(response.data)
}

export async function fetchProfileWithAddress(userId) {
  if (!userId) return null

  let response = await supabase
    .from('profiles')
    .select(PROFILE_ADDRESS_COLUMNS)
    .eq('id', userId)
    .maybeSingle()

  if (response.error && isMissingAddressColumnError(response.error)) {
    response = await supabase
      .from('profiles')
      .select('id, username, avatar_url, is_admin, created_at')
      .eq('id', userId)
      .maybeSingle()
  }

  if (response.error) throw response.error
  return withAddressDefaults(response.data)
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

export { ADDRESS_ONLY_COLUMNS }
