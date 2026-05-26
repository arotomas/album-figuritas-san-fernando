import { supabase } from '../../lib/supabase'
import { supabaseLog } from '../../utils/supabaseLog'
import { captureSyncLog } from '../../utils/captureSyncLog'
import { toRemoteFigureId } from './figures'

function getDeviceLabel() {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent ?? ''
  if (/Android/i.test(ua)) return 'android'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Mobile/i.test(ua)) return 'mobile'
  return 'desktop'
}

export async function insertCapture({
  userId,
  figureId,
  lat,
  lng,
  photoUrl,
  createdAt,
}) {
  if (!userId || figureId == null) {
    throw new Error('MISSING_USER_OR_FIGURE')
  }

  const payload = {
    user_id: userId,
    figure_id: toRemoteFigureId(figureId),
    lat: lat ?? null,
    lng: lng ?? null,
    photo_url: photoUrl ?? null,
    device: getDeviceLabel(),
    created_at: createdAt ? new Date(createdAt).toISOString() : new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('captures')
    .insert(payload)
    .select('id, figure_id, created_at, photo_url')
    .single()

  if (error) {
    supabaseLog.sync.warn('capture insert failed', {
      figureId: payload.figure_id,
      message: error.message,
    })
    captureSyncLog.error('captures insert error', {
      figureId: payload.figure_id,
      message: error.message,
      code: error.code,
      details: error.details,
    })
    throw error
  }

  supabaseLog.sync.info('capture row inserted', { captureId: data.id, figureId: data.figure_id })
  captureSyncLog.info('captures insert success', {
    captureId: data.id,
    figureId: data.figure_id,
    photoUrl: data.photo_url ?? null,
  })
  return data
}

/** Borra el historial de capturas del usuario (reset completo). */
export async function deleteAllUserCaptures(userId) {
  if (!userId) return { deleted: 0 }

  const { error, count } = await supabase
    .from('captures')
    .delete({ count: 'exact' })
    .eq('user_id', userId)

  if (error) {
    supabaseLog.sync.warn('delete all captures failed', { message: error.message })
    captureSyncLog.error('captures delete all error', {
      userId,
      message: error.message,
      code: error.code,
    })
    throw error
  }

  const deleted = count ?? 0
  supabaseLog.sync.info('captures deleted', { userId, deleted })
  captureSyncLog.info('captures delete all success', { userId, deleted })
  return { deleted }
}
