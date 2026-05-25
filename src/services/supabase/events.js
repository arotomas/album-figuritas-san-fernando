import { supabase } from '../../lib/supabase'
import { COLLECTION_EDITION, COLLECTION_VISIBILITY } from '../../config/albumCollections'

const EVENT_COLUMNS =
  'id, slug, label, description, cover_image, badge, ambience, starts_at, ends_at, active, edition, visibility, created_at, updated_at'

export function normalizeRemoteEvent(row) {
  if (!row?.id) return null

  return {
    id: String(row.id),
    slug: row.slug ?? String(row.id),
    label: row.label ?? String(row.id),
    description: row.description ?? '',
    coverImage: row.cover_image ?? null,
    badge: row.badge ?? null,
    ambience: row.ambience ?? null,
    startsAt: row.starts_at ?? null,
    endsAt: row.ends_at ?? null,
    active: row.active !== false,
    edition: row.edition ?? COLLECTION_EDITION.EVENT,
    visibility: row.visibility ?? COLLECTION_VISIBILITY.PUBLIC,
  }
}

export async function fetchAlbumEvents({ includeInactive = false } = {}) {
  let query = supabase
    .from('album_events')
    .select(EVENT_COLUMNS)
    .order('starts_at', { ascending: true, nullsFirst: false })

  if (!includeInactive) {
    query = query.eq('active', true)
  }

  const { data, error } = await query

  if (error) {
    if (/album_events|relation.*does not exist/i.test(error.message ?? '')) {
      console.warn('[events-remote]', 'table missing — using static fallback')
      return []
    }
    throw error
  }

  return (data ?? []).map(normalizeRemoteEvent).filter(Boolean)
}

/** Fetch tolerante a fallos — nunca rompe el player. */
export async function fetchAlbumEventsSafe(options = {}) {
  try {
    const events = await fetchAlbumEvents(options)
    if (events.length === 0) {
      return { events: null, source: 'static', reason: 'empty-remote' }
    }
    console.info('[events-remote]', 'loaded', {
      count: events.length,
      ids: events.map((item) => item.id),
    })
    return { events, source: 'remote', reason: null }
  } catch (error) {
    console.warn('[events-remote]', 'fetch failed — static fallback', {
      message: error?.message ?? String(error),
    })
    return {
      events: null,
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

function normalizeEventPayload(event) {
  return {
    id: event.id.trim(),
    slug: (event.slug ?? event.id).trim(),
    label: event.label.trim(),
    description: event.description?.trim() || null,
    cover_image: event.cover_image?.trim() || null,
    badge: event.badge?.trim() || null,
    ambience: event.ambience?.trim() || null,
    starts_at: toIsoOrNull(event.starts_at),
    ends_at: toIsoOrNull(event.ends_at),
    active: Boolean(event.active),
    edition: event.edition ?? COLLECTION_EDITION.EVENT,
    visibility: event.visibility ?? COLLECTION_VISIBILITY.PUBLIC,
    updated_at: new Date().toISOString(),
  }
}

export async function getEventsAdmin() {
  const { data, error } = await supabase
    .from('album_events')
    .select(EVENT_COLUMNS)
    .order('starts_at', { ascending: true, nullsFirst: false })

  if (error) throw error
  return (data ?? []).map(normalizeRemoteEvent).filter(Boolean)
}

export async function createEventAdmin(event) {
  const payload = {
    ...normalizeEventPayload(event),
    created_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('album_events')
    .insert(payload)
    .select(EVENT_COLUMNS)
    .single()

  if (error) throw error
  return normalizeRemoteEvent(data)
}

export async function updateEventAdmin(id, event) {
  const payload = normalizeEventPayload({ ...event, id })

  const { data, error } = await supabase
    .from('album_events')
    .update(payload)
    .eq('id', id)
    .select(EVENT_COLUMNS)
    .single()

  if (error) throw error
  return normalizeRemoteEvent(data)
}

export async function toggleEventActive(id, nextActive) {
  const { data, error } = await supabase
    .from('album_events')
    .update({ active: nextActive, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, active')
    .single()

  if (error) throw error
  return data
}

export async function deleteEventAdmin(id) {
  const { count: collectionCount, error: collectionError } = await supabase
    .from('album_collections')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', id)

  if (collectionError) throw collectionError
  if ((collectionCount ?? 0) > 0) {
    throw new Error('No se puede eliminar: hay colecciones vinculadas a este evento.')
  }

  const { count: figureCount, error: figureError } = await supabase
    .from('figures')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', id)

  if (figureError) throw figureError
  if ((figureCount ?? 0) > 0) {
    throw new Error('No se puede eliminar: hay figuritas vinculadas a este evento.')
  }

  const { error } = await supabase.from('album_events').delete().eq('id', id)
  if (error) throw error
  return { id }
}
