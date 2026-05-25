import { supabase } from '../../lib/supabase'
import {
  COLLECTION_EDITION,
  COLLECTION_TRACK,
  COLLECTION_VISIBILITY,
} from '../../config/albumCollections'

const COLLECTION_COLUMNS =
  'id, slug, label, description, icon, cover_image, page, sort_order, track, visibility, edition, event_id, available_from, available_until, hidden_until_discovered, unlock_condition, active, created_at, updated_at'

export function normalizeRemoteCollection(row) {
  if (!row?.id) return null

  return {
    id: String(row.id),
    slug: row.slug ?? String(row.id),
    label: row.label ?? String(row.id),
    description: row.description ?? '',
    icon: row.icon ?? '📍',
    coverImage: row.cover_image ?? null,
    page: row.page != null ? Number(row.page) : null,
    sortOrder: Number(row.sort_order) || 100,
    track: row.track ?? COLLECTION_TRACK.MAIN,
    visibility: row.visibility ?? COLLECTION_VISIBILITY.PUBLIC,
    edition: row.edition ?? COLLECTION_EDITION.STANDARD,
    eventId: row.event_id ?? null,
    availableFrom: row.available_from ?? null,
    availableUntil: row.available_until ?? null,
    hiddenUntilDiscovered: Boolean(row.hidden_until_discovered),
    unlockCondition: row.unlock_condition ?? null,
    active: row.active !== false,
  }
}

export async function fetchAlbumCollections({ includeInactive = false } = {}) {
  let query = supabase
    .from('album_collections')
    .select(COLLECTION_COLUMNS)
    .order('sort_order', { ascending: true })

  if (!includeInactive) {
    query = query.eq('active', true)
  }

  const { data, error } = await query

  if (error) {
    if (/album_collections|relation.*does not exist/i.test(error.message ?? '')) {
      console.warn('[collections-remote]', 'table missing — using static fallback')
      return []
    }
    throw error
  }

  return (data ?? []).map(normalizeRemoteCollection).filter(Boolean)
}

/** Fetch tolerante a fallos — nunca rompe el player. */
export async function fetchAlbumCollectionsSafe(options = {}) {
  try {
    const collections = await fetchAlbumCollections(options)
    if (collections.length === 0) {
      return { collections: null, source: 'static', reason: 'empty-remote' }
    }
    console.info('[collections-remote]', 'loaded', {
      count: collections.length,
      ids: collections.map((item) => item.id),
    })
    return { collections, source: 'remote', reason: null }
  } catch (error) {
    console.warn('[collections-remote]', 'fetch failed — static fallback', {
      message: error?.message ?? String(error),
    })
    return {
      collections: null,
      source: 'static',
      reason: error?.message ?? 'fetch-error',
    }
  }
}

function toIsoOrNull(value) {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null
}

function normalizeCollectionPayload(collection) {
  return {
    id: collection.id.trim(),
    slug: (collection.slug ?? collection.id).trim(),
    label: collection.label.trim(),
    description: collection.description?.trim() || null,
    icon: collection.icon?.trim() || null,
    cover_image: collection.cover_image?.trim() || null,
    page: collection.page === '' || collection.page == null ? null : Number(collection.page),
    sort_order: Number(collection.sort_order) || 100,
    track: collection.track ?? COLLECTION_TRACK.MAIN,
    visibility: collection.visibility ?? COLLECTION_VISIBILITY.PUBLIC,
    edition: collection.edition ?? COLLECTION_EDITION.STANDARD,
    event_id: collection.event_id?.trim() || null,
    available_from: toIsoOrNull(collection.available_from),
    available_until: toIsoOrNull(collection.available_until),
    hidden_until_discovered: Boolean(collection.hidden_until_discovered),
    unlock_condition: collection.unlock_condition?.trim() || null,
    active: Boolean(collection.active),
    updated_at: new Date().toISOString(),
  }
}

export async function getCollectionsAdmin() {
  const { data, error } = await supabase
    .from('album_collections')
    .select(COLLECTION_COLUMNS)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data ?? []).map(normalizeRemoteCollection).filter(Boolean)
}

export async function createCollectionAdmin(collection) {
  const payload = {
    ...normalizeCollectionPayload(collection),
    created_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('album_collections')
    .insert(payload)
    .select(COLLECTION_COLUMNS)
    .single()

  if (error) throw error
  return normalizeRemoteCollection(data)
}

export async function updateCollectionAdmin(id, collection) {
  const payload = normalizeCollectionPayload({ ...collection, id })

  const { data, error } = await supabase
    .from('album_collections')
    .update(payload)
    .eq('id', id)
    .select(COLLECTION_COLUMNS)
    .single()

  if (error) throw error
  return normalizeRemoteCollection(data)
}

export async function toggleCollectionActive(id, nextActive) {
  const { data, error } = await supabase
    .from('album_collections')
    .update({ active: nextActive, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, active')
    .single()

  if (error) throw error
  return data
}

export async function deleteCollectionAdmin(id) {
  const { count, error: countError } = await supabase
    .from('figures')
    .select('id', { count: 'exact', head: true })
    .eq('collection_id', id)

  if (countError) throw countError
  if ((count ?? 0) > 0) {
    throw new Error('No se puede eliminar: hay figuritas asignadas a esta colección.')
  }

  const { error } = await supabase.from('album_collections').delete().eq('id', id)
  if (error) throw error
  return { id }
}
