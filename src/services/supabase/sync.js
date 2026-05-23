import { QA_TEST_FIGURE_ID_PREFIX } from '../../config/qaConstants'
import { supabaseLog } from '../../utils/supabaseLog'
import { getCurrentUserId, isSupabaseConfigured } from './auth'
import { fetchUserFigures, upsertUserFigure } from './figures'
import { insertCapture } from './captures'
import { uploadCapturePhoto } from './storage'

function resolveRealFigureId(figureId, qaTargetFigureId = null) {
  const figureKey = String(figureId)
  if (figureKey.startsWith(QA_TEST_FIGURE_ID_PREFIX) || figureKey.startsWith('dev-')) {
    return qaTargetFigureId ?? Number(figureKey.replace(/^(qa-|dev-)/, ''))
  }
  return figureId
}

/**
 * Sincroniza unlock remoto. No lanza — devuelve { ok, remotePhotoUrl }.
 */
export async function syncUnlockToSupabase({
  figureId,
  foto,
  fotoSizeBytes,
  obtenidaEn,
  captureRecord,
  source = 'capture',
  qaTargetFigureId = null,
}) {
  if (!isSupabaseConfigured()) {
    supabaseLog.sync.warn('skipped — supabase not configured')
    return { ok: false, reason: 'not_configured' }
  }

  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      supabaseLog.sync.warn('skipped — no auth session')
      return { ok: false, reason: 'no_session' }
    }

    const realFigureId = resolveRealFigureId(figureId, qaTargetFigureId)
    const syncSource = source === 'capture' && String(figureId).startsWith(QA_TEST_FIGURE_ID_PREFIX)
      ? 'qa'
      : source

    supabaseLog.sync.info('unlock sync start', {
      userId,
      figureId: realFigureId,
      source: syncSource,
    })

    let remotePhotoUrl = null
    if (foto?.startsWith('data:')) {
      remotePhotoUrl = await uploadCapturePhoto({ userId, dataUrl: foto })
    } else if (foto?.startsWith('http')) {
      remotePhotoUrl = foto
    }

    await upsertUserFigure({
      userId,
      figureId: realFigureId,
      photoUrl: remotePhotoUrl,
      capturedAt: obtenidaEn ?? Date.now(),
      source: syncSource,
    })

    if (captureRecord) {
      await insertCapture({
        userId,
        figureId: realFigureId,
        lat: captureRecord.lat,
        lng: captureRecord.lng,
        photoUrl: remotePhotoUrl,
        createdAt: captureRecord.createdAt ?? obtenidaEn ?? Date.now(),
      })
    }

    supabaseLog.sync.info('unlock sync success', {
      figureId: realFigureId,
      hasRemotePhoto: Boolean(remotePhotoUrl),
      fotoSizeBytes,
    })

    return { ok: true, remotePhotoUrl }
  } catch (error) {
    supabaseLog.sync.warn('unlock sync failed — local fallback remains', {
      message: error?.message ?? String(error),
      figureId,
    })
    return { ok: false, reason: error?.message ?? 'sync_failed' }
  }
}

/**
 * Descarga álbum remoto y devuelve filas para merge local.
 */
export async function pullRemoteAlbum() {
  if (!isSupabaseConfigured()) return []

  try {
    const userId = await getCurrentUserId()
    if (!userId) return []

    const rows = await fetchUserFigures(userId)
    supabaseLog.sync.info('album pull complete', { count: rows.length })
    return rows
  } catch (error) {
    supabaseLog.sync.warn('album pull failed', { message: error?.message })
    return []
  }
}
