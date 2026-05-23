import { QA_TEST_FIGURE_ID_PREFIX } from '../../config/qaConstants'
import { supabaseLog } from '../../utils/supabaseLog'
import { captureSyncLog } from '../../utils/captureSyncLog'
import { useMobilePhotoDebugStore } from '../../store/useMobilePhotoDebugStore'
import { getSessionUserId, isSupabaseConfigured } from './auth'
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
 * Sincroniza unlock remoto. No lanza — devuelve { ok, remotePhotoUrl, uploadError }.
 */
export async function syncUnlockToSupabase({
  figureId,
  foto,
  fotoSizeBytes,
  photoSource = null,
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
    const userId = await getSessionUserId()
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
      fotoType: foto?.startsWith('data:')
        ? 'dataUrl'
        : foto?.startsWith('http')
          ? 'remoteUrl'
          : typeof foto,
      fotoSizeBytes,
    })
    captureSyncLog.info('sync start', {
      userId,
      figureId: realFigureId,
      source: syncSource,
      hasPhoto: Boolean(foto),
      photoSource,
    })

    let remotePhotoUrl = null
    let uploadError = null

    if (foto?.startsWith('data:')) {
      if (photoSource === 'mobile-native') {
        useMobilePhotoDebugStore.getState().setSnapshot({
          status: 'uploading',
          uploadStatus: 'uploading',
          figureId: realFigureId,
          compressedBlobSize: fotoSizeBytes,
        })
      }

      const uploadResult = await uploadCapturePhoto({ userId, dataUrl: foto })

      if (uploadResult.ok && uploadResult.publicUrl) {
        remotePhotoUrl = uploadResult.publicUrl
        supabaseLog.sync.info('unlock sync — photo uploaded', {
          path: uploadResult.path,
          publicUrl: remotePhotoUrl,
        })
        if (photoSource === 'mobile-native') {
          useMobilePhotoDebugStore.getState().setSnapshot({
            status: 'uploaded',
            uploadStatus: 'success',
            uploadPublicUrl: remotePhotoUrl,
            uploadPath: uploadResult.path,
            figureId: realFigureId,
            compressedBlobSize: fotoSizeBytes,
          })
        }
      } else {
        uploadError = uploadResult
        supabaseLog.sync.warn('unlock sync — photo upload failed', {
          reason: uploadResult.reason,
          error: uploadResult.error,
          path: uploadResult.path,
        })
        captureSyncLog.error('upload error', {
          reason: uploadResult.reason,
          error: uploadResult.error,
          path: uploadResult.path,
        })
        if (photoSource === 'mobile-native') {
          useMobilePhotoDebugStore.getState().setSnapshot({
            status: 'upload-error',
            uploadStatus: 'error',
            uploadError: uploadResult.reason ?? 'UPLOAD_FAILED',
            figureId: realFigureId,
            compressedBlobSize: fotoSizeBytes,
          })
          return {
            ok: false,
            remotePhotoUrl: null,
            uploadError,
            reason: uploadResult.reason ?? 'mobile_upload_failed',
          }
        }
      }
    } else if (foto?.startsWith('http')) {
      remotePhotoUrl = foto
      supabaseLog.sync.info('unlock sync — using existing remote url', { publicUrl: remotePhotoUrl })
    } else if (foto) {
      supabaseLog.sync.warn('unlock sync — unsupported foto format for upload', {
        fotoPrefix: String(foto).slice(0, 32),
      })
      if (photoSource === 'mobile-native') {
        return { ok: false, reason: 'mobile_photo_not_uploadable' }
      }
    }

    await upsertUserFigure({
      userId,
      figureId: realFigureId,
      photoUrl: remotePhotoUrl,
      capturedAt: obtenidaEn ?? Date.now(),
      source: syncSource,
    })
    captureSyncLog.info('user_figures upsert success', {
      userId,
      figureId: realFigureId,
      photoUrl: remotePhotoUrl,
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
      captureSyncLog.info('captures insert success', {
        userId,
        figureId: realFigureId,
        photoUrl: remotePhotoUrl,
      })
    }

    if (foto?.startsWith('data:') && !remotePhotoUrl) {
      supabaseLog.sync.warn('unlock sync partial — figure saved without storage photo', {
        figureId: realFigureId,
        uploadError,
      })
      return {
        ok: true,
        remotePhotoUrl: null,
        uploadError,
        partial: true,
        reason: 'upload_failed',
      }
    }

    supabaseLog.sync.info('unlock sync success', {
      figureId: realFigureId,
      hasRemotePhoto: Boolean(remotePhotoUrl),
      fotoSizeBytes,
    })

    return { ok: true, remotePhotoUrl, uploadError }
  } catch (error) {
    supabaseLog.sync.warn('unlock sync failed — local fallback remains', {
      message: error?.message ?? String(error),
      figureId,
    })
    captureSyncLog.error('sync error', {
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
    const userId = await getSessionUserId()
    if (!userId) return []

    const rows = await fetchUserFigures(userId)
    supabaseLog.sync.info('album pull complete', { count: rows.length })
    return rows
  } catch (error) {
    supabaseLog.sync.warn('album pull failed', { message: error?.message })
    return []
  }
}
