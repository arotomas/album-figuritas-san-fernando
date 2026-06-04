import { supabase } from '../../lib/supabase'
import { isQaCatalogFigureId } from '../../config/qaConstants'
import {
  FIGURE_CORE_COLUMNS,
  FIGURE_GAMEPLAY_DEFAULTS,
  FIGURE_PUBLIC_SELECT,
  FIGURE_SCHEMA_FALLBACK_PATTERN,
  FIGURE_UNIVERSE_DEFAULTS,
} from '../../config/figureSchema'
import { enrichFigureWithCollection } from '../../utils/collectionModel'

const MEMBERSHIP_COLUMNS =
  'album_id, figure_id, collection_id, slot_number, sort_order, active_in_album'

function isMissingAlbumFiguresTable(error) {
  return /album_figures|relation.*does not exist/i.test(error?.message ?? '')
}

export async function fetchAlbumFigureMemberships(albumId) {
  if (!albumId) return []

  const { data, error } = await supabase
    .from('album_figures')
    .select(MEMBERSHIP_COLUMNS)
    .eq('album_id', albumId)
    .eq('active_in_album', true)
    .order('sort_order', { ascending: true })

  if (error) {
    if (isMissingAlbumFiguresTable(error)) return null
    throw error
  }

  return data ?? []
}

function normalizeRemoteFigureRow(row, membership) {
  const lat = Number(row.lat)
  const lng = Number(row.lng)

  if (!row?.id || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }

  const rarity = row.rarity || 'común'
  const title = row.title || `Figurita ${row.id}`
  const isBonus = Boolean(row.is_bonus)
  const bonusType =
    row.bonus_type ?? (rarity === 'legendaria' ? 'legendary' : rarity === 'épica' ? 'epic' : null)

  const collectionId =
    membership?.collection_id != null && String(membership.collection_id).trim() !== ''
      ? String(membership.collection_id).trim()
      : row.collection_id ?? null

  const figureId = String(row.id)
  const isQaCatalogFigure = isQaCatalogFigureId(figureId)

  return {
    id: figureId,
    slug: figureId,
    isQaTest: isQaCatalogFigure,
    nombre: title,
    title,
    description: row.description ?? '',
    rareza: rarity,
    rarity,
    lat,
    lng,
    image_url: row.image_url ?? null,
    capture_radius: Number(row.capture_radius) || 250,
    is_bonus: isBonus,
    is_hidden: Boolean(row.is_hidden),
    unlock_order: row.unlock_order != null ? Number(row.unlock_order) : null,
    reveal_after_count: Number(row.reveal_after_count) || 0,
    bonus_type: bonusType,
    reveal_radius: Number(row.reveal_radius) || 200,
    marker_icon_url: row.marker_icon_url ?? null,
    marker_icon_size: Number(row.marker_icon_size) || 48,
    challenge_title: row.challenge_title ?? null,
    challenge_description: row.challenge_description ?? null,
    challenge_type: row.challenge_type ?? null,
    challenge_example_image_url: row.challenge_example_image_url ?? null,
    collection_id: collectionId,
    category: row.category ?? null,
    page: row.page != null ? Number(row.page) : null,
    event_id: row.event_id ?? null,
    event_starts_at: row.event_starts_at ?? null,
    event_ends_at: row.event_ends_at ?? null,
    active: row.active !== false,
    album_id: membership?.album_id ?? null,
    album_slot_number: membership?.slot_number ?? null,
    album_sort_order: membership?.sort_order ?? null,
    source: 'remote',
    emoji: '📍',
    obtenida: false,
    foto: null,
    fotoSizeBytes: null,
    obtenidaEn: null,
  }
}

async function fetchFigureRowsByIds(figureIds) {
  if (!figureIds.length) return []

  let { data, error } = await supabase
    .from('figures')
    .select(FIGURE_PUBLIC_SELECT)
    .in('id', figureIds)
    .eq('active', true)

  if (error && FIGURE_SCHEMA_FALLBACK_PATTERN.test(error.message ?? '')) {
    const fallback = await supabase
      .from('figures')
      .select(FIGURE_CORE_COLUMNS)
      .in('id', figureIds)
      .eq('active', true)

    data = fallback.data?.map((row) => ({
      ...row,
      ...FIGURE_GAMEPLAY_DEFAULTS,
      ...FIGURE_UNIVERSE_DEFAULTS,
    }))
    error = fallback.error
  }

  if (error) throw error
  return data ?? []
}

/**
 * Catálogo jugable para un álbum: figures ⋈ album_figures.
 * Devuelve null si la tabla album_figures no existe (caller puede hacer fallback).
 */
export async function fetchPublicFiguresForAlbum(albumId) {
  if (!albumId) return []

  const memberships = await fetchAlbumFigureMemberships(albumId)

  if (memberships === null) {
    return null
  }

  if (memberships.length === 0) {
    console.info('[CATALOG-SOURCE]', { source: 'album_figures', albumId, count: 0 })
    return []
  }

  const membershipByFigureId = new Map(
    memberships.map((row) => [String(row.figure_id), row]),
  )
  const figureIds = [...membershipByFigureId.keys()]
  const rows = await fetchFigureRowsByIds(figureIds)

  let normalOrder = 0
  const figures = rows
    .map((row) => normalizeRemoteFigureRow(row, membershipByFigureId.get(String(row.id))))
    .filter(Boolean)
    .map((figure) => {
      if (figure.is_bonus) return enrichFigureWithCollection(figure)
      normalOrder += 1
      const unlockOrder = figure.unlock_order ?? normalOrder
      return enrichFigureWithCollection({
        ...figure,
        unlock_order: unlockOrder,
        reveal_after_count: figure.reveal_after_count || Math.max(0, unlockOrder - 5),
      })
    })

  console.info('[CATALOG-SOURCE]', {
    source: 'album_figures',
    albumId,
    count: figures.length,
    ids: figures.map((figure) => figure.id),
  })

  return figures
}
