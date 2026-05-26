import { supabase } from '../../lib/supabase'
import { supabaseLog } from '../../utils/supabaseLog'
import { captureSyncLog } from '../../utils/captureSyncLog'
import { enrichFigureWithCollection } from '../../utils/collectionModel'
import {
  FIGURE_CORE_COLUMNS,
  FIGURE_GAMEPLAY_DEFAULTS,
  FIGURE_PUBLIC_SELECT,
  FIGURE_SCHEMA_FALLBACK_PATTERN,
  FIGURE_UNIVERSE_DEFAULTS,
} from '../../config/figureSchema'

const PUBLIC_FIGURE_COLUMNS = FIGURE_PUBLIC_SELECT

function normalizeRemoteFigure(row) {
  const lat = Number(row.lat)
  const lng = Number(row.lng)

  if (!row?.id || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    console.warn('[figures-remote]', 'invalid figure ignored', JSON.stringify({
      id: row?.id ?? null,
      lat: row?.lat ?? null,
      lng: row?.lng ?? null,
    }))
    return null
  }

  const rarity = row.rarity || 'común'
  const title = row.title || `Figurita ${row.id}`
  const isBonus = Boolean(row.is_bonus)
  const bonusType = row.bonus_type ?? (rarity === 'legendaria' ? 'legendary' : rarity === 'épica' ? 'epic' : null)

  return {
    id: String(row.id),
    slug: String(row.id),
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
    collection_id: row.collection_id ?? null,
    category: row.category ?? null,
    page: row.page != null ? Number(row.page) : null,
    event_id: row.event_id ?? null,
    event_starts_at: row.event_starts_at ?? null,
    event_ends_at: row.event_ends_at ?? null,
    active: row.active !== false,
    source: 'remote',
    emoji: '📍',
    obtenida: false,
    foto: null,
    fotoSizeBytes: null,
    obtenidaEn: null,
  }
}

export async function fetchPublicFigures() {
  let { data, error } = await supabase
    .from('figures')
    .select(PUBLIC_FIGURE_COLUMNS)
    .eq('active', true)
    .order('created_at', { ascending: true })

  let usedSchemaColumnFallback = false

  if (error && FIGURE_SCHEMA_FALLBACK_PATTERN.test(error.message ?? '')) {
    usedSchemaColumnFallback = true
    console.warn('[figures-remote]', 'schema column fallback — using core columns only', JSON.stringify({
      message: error.message,
      code: error.code,
    }))

    const fallback = await supabase
      .from('figures')
      .select(FIGURE_CORE_COLUMNS)
      .eq('active', true)
      .order('created_at', { ascending: true })

    data = fallback.data?.map((row) => ({
      ...row,
      ...FIGURE_GAMEPLAY_DEFAULTS,
      ...FIGURE_UNIVERSE_DEFAULTS,
    }))
    error = fallback.error
  }

  if (error) {
    console.warn('[figures-remote]', 'fetch error', JSON.stringify({
      message: error.message,
      code: error.code,
      details: error.details,
    }))
    throw error
  }

  const figures = (data ?? []).map(normalizeRemoteFigure).filter(Boolean)
  let normalOrder = 0
  const figuresWithRevealDefaults = figures.map((figure) => {
    if (figure.is_bonus) return enrichFigureWithCollection(figure)
    normalOrder += 1
    const unlockOrder = figure.unlock_order ?? normalOrder
    return enrichFigureWithCollection({
      ...figure,
      unlock_order: unlockOrder,
      reveal_after_count: figure.reveal_after_count || Math.max(0, unlockOrder - 5),
    })
  })

  if (figuresWithRevealDefaults.length === 0) {
    console.info('[CATALOG-EMPTY]', {
      remoteCount: 0,
      schemaColumnFallback: usedSchemaColumnFallback,
    })
    console.info('[CATALOG-SOURCE]', { source: 'remote', count: 0 })
  } else {
    console.info('[CATALOG-SOURCE]', {
      source: 'remote',
      count: figuresWithRevealDefaults.length,
      ids: figuresWithRevealDefaults.map((figure) => figure.id),
    })
  }

  console.log('[SUPABASE-CHECK]', {
    url: import.meta.env.VITE_SUPABASE_URL ?? '(missing)',
    project: import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] ?? '(unknown)',
    source: 'fetchPublicFigures',
    pathname: typeof window !== 'undefined' ? window.location.pathname : '(ssr)',
    figureCount: figuresWithRevealDefaults.length,
    hadError: Boolean(error),
    schemaColumnFallback: usedSchemaColumnFallback,
  })

  return figuresWithRevealDefaults
}

export function toRemoteFigureId(figureId) {
  return String(figureId)
}

export async function fetchUserFigures(userId) {
  if (!userId) return []

  const { data, error } = await supabase
    .from('user_figures')
    .select('id, figure_id, captured_at, photo_url, source')
    .eq('user_id', userId)
    .order('captured_at', { ascending: false })

  if (error) {
    supabaseLog.figures.warn('fetch user figures failed', { message: error.message })
    throw error
  }

  supabaseLog.figures.info('fetched user figures', { count: data?.length ?? 0 })
  return data ?? []
}

export async function deleteUserFigurePhoto({ userId, figureId }) {
  if (!userId || figureId == null) {
    throw new Error('MISSING_USER_OR_FIGURE')
  }

  const remoteFigureId = toRemoteFigureId(figureId)
  const now = new Date().toISOString()
  const payload = {
    photo_url: null,
    updated_at: now,
    last_photo_updated_at: now,
  }

  const { data, error } = await supabase
    .from('user_figures')
    .update(payload)
    .eq('user_id', userId)
    .eq('figure_id', remoteFigureId)
    .select('id, figure_id, captured_at, photo_url, source, updated_at, last_photo_updated_at')
    .maybeSingle()

  if (error) {
    const missingColumn = /updated_at|last_photo_updated_at/i.test(error.message ?? '')
    if (missingColumn) {
      const fallback = await supabase
        .from('user_figures')
        .update({ photo_url: null })
        .eq('user_id', userId)
        .eq('figure_id', remoteFigureId)
        .select('id, figure_id, captured_at, photo_url, source')
        .maybeSingle()
      if (fallback.error) throw fallback.error
      if (!fallback.data) throw new Error('USER_FIGURE_NOT_FOUND')
      supabaseLog.figures.info('user figure photo deleted (fallback)', {
        figureId: remoteFigureId,
      })
      return fallback.data
    }
    throw error
  }

  if (!data) {
    throw new Error('USER_FIGURE_NOT_FOUND')
  }

  supabaseLog.figures.info('user figure photo deleted', { figureId: remoteFigureId })
  captureSyncLog.info('user_figures photo deleted', { figureId: remoteFigureId })
  return data
}

export async function replaceUserFigurePhoto({
  userId,
  figureId,
  photoUrl,
  source = 'retake',
}) {
  if (!userId || figureId == null || !photoUrl) {
    throw new Error('MISSING_USER_OR_FIGURE_OR_PHOTO')
  }

  const remoteFigureId = toRemoteFigureId(figureId)
  const now = new Date().toISOString()
  const payload = {
    photo_url: photoUrl,
    source,
    updated_at: now,
    last_photo_updated_at: now,
  }

  const { data, error } = await supabase
    .from('user_figures')
    .update(payload)
    .eq('user_id', userId)
    .eq('figure_id', remoteFigureId)
    .select('id, figure_id, captured_at, photo_url, source, updated_at, last_photo_updated_at')
    .maybeSingle()

  if (error) {
    const missingColumn =
      /updated_at|last_photo_updated_at/i.test(error.message ?? '')
    if (missingColumn) {
      const fallback = await supabase
        .from('user_figures')
        .update({ photo_url: photoUrl, source })
        .eq('user_id', userId)
        .eq('figure_id', remoteFigureId)
        .select('id, figure_id, captured_at, photo_url, source')
        .maybeSingle()
      if (fallback.error) throw fallback.error
      if (!fallback.data) throw new Error('USER_FIGURE_NOT_FOUND')
      supabaseLog.figures.info('user figure photo replaced (fallback)', {
        figureId: remoteFigureId,
      })
      return fallback.data
    }
    throw error
  }

  if (!data) {
    throw new Error('USER_FIGURE_NOT_FOUND')
  }

  supabaseLog.figures.info('user figure photo replaced', { figureId: remoteFigureId })
  captureSyncLog.info('user_figures photo replaced', {
    figureId: remoteFigureId,
    photoUrl: data.photo_url ?? null,
  })
  return data
}

export async function upsertUserFigure({
  userId,
  figureId,
  photoUrl,
  capturedAt,
  source = 'capture',
}) {
  if (!userId || figureId == null) {
    throw new Error('MISSING_USER_OR_FIGURE')
  }

  const remoteFigureId = toRemoteFigureId(figureId)
  const payload = {
    user_id: userId,
    figure_id: remoteFigureId,
    captured_at: capturedAt ? new Date(capturedAt).toISOString() : new Date().toISOString(),
    source,
  }

  if (photoUrl) {
    payload.photo_url = photoUrl
  }

  const { data, error } = await supabase
    .from('user_figures')
    .upsert(payload, { onConflict: 'user_id,figure_id' })
    .select('id, figure_id, captured_at, photo_url, source')
    .single()

  if (error) {
    supabaseLog.figures.warn('upsert user figure failed', {
      figureId: remoteFigureId,
      message: error.message,
    })
    captureSyncLog.error('user_figures upsert error', {
      figureId: remoteFigureId,
      message: error.message,
      code: error.code,
      details: error.details,
    })
    throw error
  }

  supabaseLog.figures.info('user figure saved', { figureId: remoteFigureId })
  captureSyncLog.info('user_figures upsert success', {
    figureId: remoteFigureId,
    photoUrl: data.photo_url ?? null,
  })
  return data
}

/** Borra todo el progreso remoto del usuario (reset completo). */
export async function deleteAllUserFigures(userId) {
  if (!userId) return { deleted: 0 }

  const { error, count } = await supabase
    .from('user_figures')
    .delete({ count: 'exact' })
    .eq('user_id', userId)

  if (error) {
    supabaseLog.figures.warn('delete all user figures failed', { message: error.message })
    captureSyncLog.error('user_figures delete all error', {
      userId,
      message: error.message,
      code: error.code,
    })
    throw error
  }

  const deleted = count ?? 0
  supabaseLog.figures.info('user figures deleted', { userId, deleted })
  captureSyncLog.info('user_figures delete all success', { userId, deleted })
  return { deleted }
}
