import { supabase } from '../../lib/supabase'
import { MAX_PHOTO_BYTES } from '../../config/persistence'
import { supabaseLog } from '../../utils/supabaseLog'
import { captureSyncLog, storageTestLog } from '../../utils/captureSyncLog'
import { getSessionUserId } from './auth'

export const CAPTURES_BUCKET = 'captures'

/** Límite del bucket en Supabase (migration 001). */
export const STORAGE_BUCKET_MAX_BYTES = 524_288

const JPEG_MIME = 'image/jpeg'

function summarizeUploadError(error) {
  if (!error) return null
  return {
    message: error.message,
    name: error.name,
    statusCode: error.statusCode ?? error.status ?? null,
  }
}

/**
 * Path relativo al bucket: userId/timestamp.jpg
 * Nunca incluir prefijo "captures/".
 */
export function buildCaptureStoragePath(userId, timestamp = Date.now()) {
  const cleanUserId = String(userId).replace(/^captures\//, '').split('/')[0]
  return `${cleanUserId}/${timestamp}.jpg`
}

export function normalizeStoragePath(path) {
  if (!path) return path
  return path.replace(/^captures\//, '')
}

export function dataUrlToBlob(dataUrl) {
  if (typeof dataUrl !== 'string') {
    throw new Error('INVALID_DATA_URL')
  }

  const trimmed = dataUrl.trim()
  if (!trimmed.startsWith('data:')) {
    throw new Error('INVALID_DATA_URL')
  }

  const [header, base64] = trimmed.split(',')
  if (!base64) {
    throw new Error('INVALID_DATA_URL')
  }

  const mime = header.match(/:(.*?);/)?.[1]?.toLowerCase() || JPEG_MIME
  const binary = atob(base64.replace(/\s/g, ''))
  const array = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i += 1) {
    array[i] = binary.charCodeAt(i)
  }

  return new Blob([array], { type: mime.includes('jpeg') || mime.includes('jpg') ? JPEG_MIME : mime })
}

export function validateUploadBlob(blob, maxBytes = STORAGE_BUCKET_MAX_BYTES) {
  if (!(blob instanceof Blob)) {
    return { ok: false, reason: 'NOT_A_BLOB' }
  }
  if (blob.size <= 0) {
    return { ok: false, reason: 'EMPTY_BLOB', size: blob.size }
  }
  if (blob.size >= maxBytes) {
    return { ok: false, reason: 'FILE_TOO_LARGE', size: blob.size, maxBytes }
  }
  const type = blob.type || JPEG_MIME
  if (!type.startsWith('image/')) {
    return { ok: false, reason: 'INVALID_MIME', type }
  }
  return { ok: true, size: blob.size, type }
}

function createMinimalJpegBlob() {
  const jpegBytes = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00,
    0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06,
    0x05, 0x08, 0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b,
    0x0c, 0x19, 0x12, 0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
    0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31,
    0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff,
    0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00,
    0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x7f, 0x80, 0xff, 0xd9,
  ])
  return new Blob([jpegBytes], { type: JPEG_MIME })
}

/**
 * Prueba aislada de upload — blob JPEG mínimo válido.
 */
export async function testStorageUpload() {
  const sessionUserId = await getSessionUserId()
  if (!sessionUserId) {
    const result = { ok: false, reason: 'NO_SESSION' }
    supabaseLog.upload.warn('test upload skipped', result)
    storageTestLog.error('error', result)
    return result
  }

  const blob = createMinimalJpegBlob()
  const path = buildCaptureStoragePath(sessionUserId, Date.now())

  supabaseLog.upload.info('test upload start', {
    bucket: CAPTURES_BUCKET,
    path,
    size: blob.size,
    type: blob.type,
    sessionUserId,
  })
  storageTestLog.info('start', {
    bucket: CAPTURES_BUCKET,
    path,
    size: blob.size,
    type: blob.type,
    sessionUserId,
  })

  const { data, error } = await supabase.storage.from(CAPTURES_BUCKET).upload(path, blob, {
    contentType: JPEG_MIME,
    upsert: true,
    cacheControl: '3600',
  })

  supabaseLog.upload.info('test upload response', {
    data,
    error: summarizeUploadError(error),
  })

  if (error) {
    storageTestLog.error('error', {
      path,
      error: summarizeUploadError(error),
    })
    return { ok: false, reason: error.message, error: summarizeUploadError(error), path }
  }

  const { data: publicData } = supabase.storage.from(CAPTURES_BUCKET).getPublicUrl(path)
  const publicUrl = publicData?.publicUrl ?? null

  supabaseLog.upload.info('test upload public url', { publicUrl })
  storageTestLog.info('success', { path, publicUrl, data })

  return { ok: true, path, publicUrl, data }
}

/**
 * Sube foto al bucket captures con path userId/timestamp.jpg
 * @returns {{ ok: boolean, publicUrl?: string, path?: string, error?: object, reason?: string }}
 */
export async function uploadCapturePhoto({
  userId,
  dataUrl,
  maxBytes = STORAGE_BUCKET_MAX_BYTES,
}) {
  const sessionUserId = await getSessionUserId()
  const effectiveUserId = sessionUserId ?? userId

  if (!effectiveUserId || !dataUrl) {
    const result = { ok: false, reason: 'MISSING_USER_OR_DATA' }
    supabaseLog.upload.warn('upload skipped', result)
    return result
  }

  if (sessionUserId && userId && sessionUserId !== userId) {
    supabaseLog.upload.warn('upload userId mismatch — using session user', {
      requestedUserId: userId,
      sessionUserId,
    })
  }

  try {
    const blob = dataUrlToBlob(dataUrl)
    const validation = validateUploadBlob(blob, maxBytes)

    if (!validation.ok) {
      supabaseLog.upload.warn('upload skipped — invalid blob', {
        ...validation,
        appMaxPhotoBytes: MAX_PHOTO_BYTES,
        bucketMaxBytes: STORAGE_BUCKET_MAX_BYTES,
      })
      captureSyncLog.error('upload error', {
        reason: validation.reason,
        size: validation.size,
        type: validation.type,
        bucketMaxBytes: STORAGE_BUCKET_MAX_BYTES,
      })
      return { ok: false, reason: validation.reason, ...validation }
    }

    const timestamp = Date.now()
    const path = buildCaptureStoragePath(effectiveUserId, timestamp)
    const uploadBlob =
      blob.type === JPEG_MIME ? blob : new Blob([blob], { type: JPEG_MIME })

    supabaseLog.upload.info('upload start', {
      bucket: CAPTURES_BUCKET,
      path,
      size: uploadBlob.size,
      type: uploadBlob.type,
      sessionUserId: effectiveUserId,
    })
    captureSyncLog.info('upload start', {
      bucket: CAPTURES_BUCKET,
      path,
      size: uploadBlob.size,
      type: uploadBlob.type,
    })

    const { data, error } = await supabase.storage.from(CAPTURES_BUCKET).upload(path, uploadBlob, {
      contentType: JPEG_MIME,
      upsert: false,
      cacheControl: '3600',
    })

    supabaseLog.upload.info('upload response', {
      data,
      error: summarizeUploadError(error),
    })

    if (error) {
      supabaseLog.upload.warn('upload failed', {
        bucket: CAPTURES_BUCKET,
        path,
        error: summarizeUploadError(error),
      })
      captureSyncLog.error('upload error', {
        bucket: CAPTURES_BUCKET,
        path,
        error: summarizeUploadError(error),
      })
      return {
        ok: false,
        reason: error.message,
        error: summarizeUploadError(error),
        path,
      }
    }

    const { data: publicData } = supabase.storage.from(CAPTURES_BUCKET).getPublicUrl(path)
    const publicUrl = publicData?.publicUrl ?? null

    supabaseLog.upload.info('public url', { publicUrl, path, bucket: CAPTURES_BUCKET })
    captureSyncLog.info('upload success', {
      bucket: CAPTURES_BUCKET,
      path,
      publicUrl,
    })

    if (!publicUrl) {
      return { ok: false, reason: 'NO_PUBLIC_URL', path, data }
    }

    return { ok: true, publicUrl, path, data }
  } catch (error) {
    const payload = {
      ok: false,
      reason: error?.message ?? String(error),
      error: summarizeUploadError(error),
    }
    supabaseLog.upload.warn('upload error', payload)
    captureSyncLog.error('upload error', payload)
    return payload
  }
}
