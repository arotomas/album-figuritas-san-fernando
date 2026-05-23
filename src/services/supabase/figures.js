import { supabase } from '../../lib/supabase'
import { supabaseLog } from '../../utils/supabaseLog'

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
    photo_url: photoUrl ?? null,
    captured_at: capturedAt ? new Date(capturedAt).toISOString() : new Date().toISOString(),
    source,
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
    throw error
  }

  supabaseLog.figures.info('user figure saved', { figureId: remoteFigureId })
  return data
}
