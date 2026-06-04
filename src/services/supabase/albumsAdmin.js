import { supabase } from '../../lib/supabase'
import { ALBUM_STATUS } from '../../components/admin/adminAlbumsShared'
import { normalizePublishedAlbum } from './albums'

const ALBUM_COLUMNS =
  'id, slug, title, subtitle, description, cover_image, status, sort_order, is_default, active, map_center_lat, map_center_lng, map_zoom, completion_bonus_points, created_at, updated_at'

function normalizeAlbumRow(row) {
  return normalizePublishedAlbum(row)
}

function toNumberOrNull(value) {
  if (value === '' || value == null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeAlbumPayload(album) {
  return {
    id: album.id.trim(),
    slug: album.slug.trim(),
    title: album.title.trim(),
    subtitle: album.subtitle?.trim() || null,
    description: album.description?.trim() || null,
    cover_image: album.cover_image?.trim() || null,
    status: album.status ?? ALBUM_STATUS.DRAFT,
    sort_order: Number(album.sort_order) || 100,
    is_default: Boolean(album.is_default),
    active: Boolean(album.active),
    map_center_lat: toNumberOrNull(album.map_center_lat),
    map_center_lng: toNumberOrNull(album.map_center_lng),
    map_zoom: toNumberOrNull(album.map_zoom),
    completion_bonus_points: Math.max(0, Number(album.completion_bonus_points) || 0),
    updated_at: new Date().toISOString(),
  }
}

async function clearOtherDefaultAlbums(exceptId = null) {
  let query = supabase
    .from('albums')
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq('is_default', true)

  if (exceptId) {
    query = query.neq('id', exceptId)
  }

  const { error } = await query
  if (error) throw error
}

export async function fetchAlbumsAdmin() {
  const { data, error } = await supabase
    .from('albums')
    .select(ALBUM_COLUMNS)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true })

  if (error) throw error
  return (data ?? []).map(normalizeAlbumRow).filter(Boolean)
}

export async function createAlbumAdmin(album) {
  const payload = {
    ...normalizeAlbumPayload(album),
    created_at: new Date().toISOString(),
  }

  if (payload.is_default) {
    await clearOtherDefaultAlbums()
  }

  const { data, error } = await supabase
    .from('albums')
    .insert(payload)
    .select(ALBUM_COLUMNS)
    .single()

  if (error) throw error
  return normalizeAlbumRow(data)
}

export async function updateAlbumAdmin(id, album) {
  const payload = normalizeAlbumPayload({ ...album, id })

  if (payload.is_default) {
    await clearOtherDefaultAlbums(id)
  }

  const { data, error } = await supabase
    .from('albums')
    .update(payload)
    .eq('id', id)
    .select(ALBUM_COLUMNS)
    .single()

  if (error) throw error
  return normalizeAlbumRow(data)
}

export async function toggleAlbumActive(id, nextActive) {
  const { data, error } = await supabase
    .from('albums')
    .update({ active: nextActive, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, active, status')
    .single()

  if (error) throw error
  return data
}

export async function updateAlbumStatus(id, status) {
  if (!Object.values(ALBUM_STATUS).includes(status)) {
    throw new Error('Estado de álbum inválido.')
  }

  const { data, error } = await supabase
    .from('albums')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(ALBUM_COLUMNS)
    .single()

  if (error) throw error
  return normalizeAlbumRow(data)
}

export async function setDefaultAlbum(id) {
  await clearOtherDefaultAlbums(id)

  const { data, error } = await supabase
    .from('albums')
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(ALBUM_COLUMNS)
    .single()

  if (error) throw error
  return normalizeAlbumRow(data)
}
