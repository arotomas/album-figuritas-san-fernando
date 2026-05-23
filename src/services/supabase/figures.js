import { supabase } from '../../lib/supabase'
import { supabaseLog } from '../../utils/supabaseLog'
import { captureSyncLog } from '../../utils/captureSyncLog'

const PUBLIC_FIGURE_COLUMNS =
  'id, title, description, rarity, lat, lng, image_url, active, capture_radius, created_at'

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
    active: row.active !== false,
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

  if (error && /capture_radius/i.test(error.message ?? '')) {
    const fallback = await supabase
      .from('figures')
      .select('id, title, description, rarity, lat, lng, image_url, active, created_at')
      .eq('active', true)
      .order('created_at', { ascending: true })

    data = fallback.data?.map((row) => ({ ...row, capture_radius: 250 }))
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

  console.info('[figures-remote]', 'loaded', JSON.stringify({
    count: figures.length,
    ids: figures.map((figure) => figure.id),
    fallback: false,
  }))

  return figures
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
