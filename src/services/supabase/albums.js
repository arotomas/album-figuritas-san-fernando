import { supabase } from '../../lib/supabase'

const ALBUM_COLUMNS =
  'id, slug, title, subtitle, description, cover_image, status, sort_order, is_default, active, map_center_lat, map_center_lng, map_zoom, completion_bonus_points'

export function normalizePublishedAlbum(row) {
  if (!row?.id) return null

  return {
    id: String(row.id),
    slug: row.slug ?? String(row.id),
    title: row.title ?? String(row.id),
    subtitle: row.subtitle ?? null,
    description: row.description ?? '',
    coverImage: row.cover_image ?? null,
    status: row.status ?? 'published',
    sortOrder: Number(row.sort_order) || 100,
    isDefault: Boolean(row.is_default),
    active: row.active !== false,
    mapCenterLat: row.map_center_lat != null ? Number(row.map_center_lat) : null,
    mapCenterLng: row.map_center_lng != null ? Number(row.map_center_lng) : null,
    mapZoom: row.map_zoom != null ? Number(row.map_zoom) : null,
    completionBonusPoints: Number(row.completion_bonus_points) || 0,
  }
}

/** Álbumes visibles para jugadores (published + active). */
export async function fetchPublishedAlbums() {
  const { data, error } = await supabase
    .from('albums')
    .select(ALBUM_COLUMNS)
    .eq('status', 'published')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true })

  if (error) {
    if (/albums|relation.*does not exist/i.test(error.message ?? '')) {
      console.warn('[albums-remote]', 'table missing', { message: error.message })
      return []
    }
    throw error
  }

  const albums = (data ?? []).map(normalizePublishedAlbum).filter(Boolean)

  console.info('[albums-remote]', 'published loaded', {
    count: albums.length,
    ids: albums.map((album) => album.id),
  })

  return albums
}
