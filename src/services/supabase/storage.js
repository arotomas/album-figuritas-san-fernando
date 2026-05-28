import { supabase } from '../../lib/supabase'
import { MAX_PHOTO_BYTES } from '../../config/persistence'
import { supabaseLog } from '../../utils/supabaseLog'
import { captureSyncLog, storageTestLog } from '../../utils/captureSyncLog'
import { getSessionUserId } from './auth'

export const CAPTURES_BUCKET = 'captures'
export const MARKER_ICONS_BUCKET = 'marker-icons'
export const MARKER_ICON_MAX_BYTES = 200 * 1024
export const MARKER_ICON_MIME_TYPES = [
  'image/png',
  'image/webp',
  'image/svg+xml',
  'image/jpeg',
  'image/jpg',
]
export const MARKER_ICON_TARGET_PX = 256
export const FIGURE_IMAGE_MAX_BYTES = 200 * 1024
export const FIGURE_IMAGE_MIME_TYPES = [
  'image/png',
  'image/webp',
  'image/jpeg',
  'image/jpg',
]

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

function sanitizeStorageSegment(value, fallback = 'marker') {
  return String(value || fallback)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || fallback
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

export function buildMarkerIconStoragePath(figureId, filename, timestamp = Date.now()) {
  const safeFigureId = sanitizeStorageSegment(figureId, 'temp')
  const safeFilename = sanitizeStorageSegment(filename, 'marker-icon')
  return `marker-icons/${safeFigureId}/${timestamp}-${safeFilename}`
}

export function buildFigureImageStoragePath(figureId, filename, timestamp = Date.now()) {
  const safeFigureId = sanitizeStorageSegment(figureId, 'temp')
  const safeFilename = sanitizeStorageSegment(filename, 'figure-image')
  return `figure-images/${safeFigureId}/${timestamp}-${safeFilename}`
}

export function buildChallengeExampleStoragePath(figureId, filename, timestamp = Date.now()) {
  const safeFigureId = sanitizeStorageSegment(figureId, 'temp')
  const safeFilename = sanitizeStorageSegment(filename, 'challenge-example')
  return `challenge-examples/${safeFigureId}/${timestamp}-${safeFilename}`
}

export function validateMarkerIconFile(file) {
  if (!(file instanceof File)) {
    return { ok: false, reason: 'NOT_A_FILE' }
  }
  if (!MARKER_ICON_MIME_TYPES.includes(file.type)) {
    return { ok: false, reason: 'INVALID_MIME', type: file.type }
  }
  if (file.size <= 0) {
    return { ok: false, reason: 'EMPTY_FILE', size: file.size }
  }
  if (file.size > MARKER_ICON_MAX_BYTES) {
    return {
      ok: false,
      reason: 'FILE_TOO_LARGE',
      size: file.size,
      maxBytes: MARKER_ICON_MAX_BYTES,
    }
  }
  return { ok: true, size: file.size, type: file.type }
}

export function validateFigureImageFile(file) {
  if (!(file instanceof File)) {
    return { ok: false, reason: 'NOT_A_FILE' }
  }
  if (!FIGURE_IMAGE_MIME_TYPES.includes(file.type)) {
    return { ok: false, reason: 'INVALID_MIME', type: file.type }
  }
  if (file.size <= 0) {
    return { ok: false, reason: 'EMPTY_FILE', size: file.size }
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, reason: 'FILE_TOO_LARGE_SOURCE', size: file.size, maxBytes: 5 * 1024 * 1024 }
  }
  return { ok: true, size: file.size, type: file.type }
}

async function loadImageFromFile(file) {
  const { rasterizeFileToCanvas } = await import('../../utils/imageOrientation.js')
  return rasterizeFileToCanvas(file)
}

async function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('ICON_ENCODE_FAILED'))
          return
        }
        resolve(blob)
      },
      type,
      quality,
    )
  })
}

/**
 * Normaliza imágenes de marcador:
 * - recorte centrado cuadrado
 * - resize a 256x256
 * - compresión automática hasta <= 200 KB
 */
export async function optimizeMarkerIconFile(file) {
  if (!file) return { ok: false, reason: 'NOT_A_FILE' }
  if (file.type === 'image/svg+xml') {
    return { ok: true, file, transformed: false }
  }

  const image = await loadImageFromFile(file)
  const sourceSize = Math.min(image.width, image.height)
  if (!sourceSize || sourceSize <= 0) {
    return { ok: false, reason: 'INVALID_IMAGE_DIMENSIONS' }
  }

  const sourceX = Math.floor((image.width - sourceSize) / 2)
  const sourceY = Math.floor((image.height - sourceSize) / 2)

  const canvas = document.createElement('canvas')
  canvas.width = MARKER_ICON_TARGET_PX
  canvas.height = MARKER_ICON_TARGET_PX
  const ctx = canvas.getContext('2d')
  if (!ctx) return { ok: false, reason: 'CANVAS_UNAVAILABLE' }

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    MARKER_ICON_TARGET_PX,
    MARKER_ICON_TARGET_PX,
  )

  const baseName = String(file.name || 'marker-icon')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')

  let encoded = await canvasToBlob(canvas, 'image/webp', 0.9)
  let quality = 0.9
  while (encoded.size > MARKER_ICON_MAX_BYTES && quality > 0.45) {
    quality -= 0.1
    encoded = await canvasToBlob(canvas, 'image/webp', quality)
  }

  if (encoded.size > MARKER_ICON_MAX_BYTES) {
    encoded = await canvasToBlob(canvas, 'image/jpeg', 0.82)
    quality = 0.82
    while (encoded.size > MARKER_ICON_MAX_BYTES && quality > 0.45) {
      quality -= 0.08
      encoded = await canvasToBlob(canvas, 'image/jpeg', quality)
    }
  }

  const optimizedFile = new File(
    [encoded],
    `${baseName}.${encoded.type === 'image/jpeg' ? 'jpg' : 'webp'}`,
    {
      type: encoded.type,
      lastModified: Date.now(),
    },
  )

  return {
    ok: true,
    file: optimizedFile,
    transformed: true,
    sourceWidth: image.width,
    sourceHeight: image.height,
  }
}

/**
 * Normaliza imagen general de figurita/consigna:
 * - conserva relación de aspecto
 * - limita lado mayor
 * - comprime a WebP/JPEG para entrar al límite del bucket
 */
export async function optimizeFigureImageFile(file) {
  if (!file) return { ok: false, reason: 'NOT_A_FILE' }
  const baseValidation = validateFigureImageFile(file)
  if (!baseValidation.ok) return baseValidation

  const image = await loadImageFromFile(file)
  const srcW = image.width
  const srcH = image.height
  if (!srcW || !srcH) return { ok: false, reason: 'INVALID_IMAGE_DIMENSIONS' }

  const maxSide = 1280
  const scale = Math.min(1, maxSide / Math.max(srcW, srcH))
  const targetW = Math.max(1, Math.round(srcW * scale))
  const targetH = Math.max(1, Math.round(srcH * scale))

  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')
  if (!ctx) return { ok: false, reason: 'CANVAS_UNAVAILABLE' }

  ctx.clearRect(0, 0, targetW, targetH)
  ctx.drawImage(image, 0, 0, targetW, targetH)

  const baseName = String(file.name || 'figure-image')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')

  let encoded = await canvasToBlob(canvas, 'image/webp', 0.9)
  let quality = 0.9
  while (encoded.size > FIGURE_IMAGE_MAX_BYTES && quality > 0.4) {
    quality -= 0.08
    encoded = await canvasToBlob(canvas, 'image/webp', quality)
  }

  if (encoded.size > FIGURE_IMAGE_MAX_BYTES) {
    encoded = await canvasToBlob(canvas, 'image/jpeg', 0.82)
    quality = 0.82
    while (encoded.size > FIGURE_IMAGE_MAX_BYTES && quality > 0.4) {
      quality -= 0.08
      encoded = await canvasToBlob(canvas, 'image/jpeg', quality)
    }
  }

  if (encoded.size > FIGURE_IMAGE_MAX_BYTES) {
    return { ok: false, reason: 'FILE_TOO_LARGE', size: encoded.size, maxBytes: FIGURE_IMAGE_MAX_BYTES }
  }

  const optimizedFile = new File(
    [encoded],
    `${baseName}.${encoded.type === 'image/jpeg' ? 'jpg' : 'webp'}`,
    { type: encoded.type, lastModified: Date.now() },
  )

  return { ok: true, file: optimizedFile, transformed: true, sourceWidth: srcW, sourceHeight: srcH }
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

export async function uploadMarkerIcon({ figureId, file }) {
  const optimization = await optimizeMarkerIconFile(file)
  if (!optimization.ok) {
    return { ok: false, ...optimization }
  }
  const iconFile = optimization.file
  const validation = validateMarkerIconFile(iconFile)
  const path = buildMarkerIconStoragePath(figureId, iconFile?.name)

  if (!validation.ok) {
    console.error('[admin-icons]', 'upload error', {
      figureId,
      path,
      ...validation,
    })
    return { ok: false, path, ...validation }
  }

  console.info('[admin-icons]', 'upload start', {
    bucket: MARKER_ICONS_BUCKET,
    path,
    size: iconFile.size,
    type: iconFile.type,
    transformed: optimization.transformed,
  })

  const { data, error } = await supabase.storage.from(MARKER_ICONS_BUCKET).upload(path, iconFile, {
    contentType: iconFile.type,
    upsert: true,
    cacheControl: '31536000',
  })

  if (error) {
    console.error('[admin-icons]', 'upload error', {
      bucket: MARKER_ICONS_BUCKET,
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

  const { data: publicData } = supabase.storage.from(MARKER_ICONS_BUCKET).getPublicUrl(path)
  const publicUrl = publicData?.publicUrl ?? null

  console.info('[admin-icons]', 'upload success', {
    bucket: MARKER_ICONS_BUCKET,
    path,
    publicUrl,
    data,
  })

  if (!publicUrl) {
    return { ok: false, reason: 'NO_PUBLIC_URL', path, data }
  }

  return { ok: true, path, publicUrl, data }
}

export async function uploadFigureImageAsset({ figureId, file, kind = 'figure' }) {
  const optimization = await optimizeFigureImageFile(file)
  if (!optimization.ok) return { ok: false, ...optimization }

  const optimizedFile = optimization.file
  const pathBuilder = kind === 'challenge' ? buildChallengeExampleStoragePath : buildFigureImageStoragePath
  const path = pathBuilder(figureId, optimizedFile?.name)

  const { data, error } = await supabase.storage.from(MARKER_ICONS_BUCKET).upload(path, optimizedFile, {
    contentType: optimizedFile.type,
    upsert: true,
    cacheControl: '31536000',
  })

  if (error) {
    return { ok: false, reason: error.message, error: summarizeUploadError(error), path }
  }

  const { data: publicData } = supabase.storage.from(MARKER_ICONS_BUCKET).getPublicUrl(path)
  const publicUrl = publicData?.publicUrl ?? null
  if (!publicUrl) return { ok: false, reason: 'NO_PUBLIC_URL', path, data }
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
    let blob = dataUrlToBlob(dataUrl)
    try {
      const { normalizeJpegBlob } = await import('../../utils/photoEncode.js')
      blob = await normalizeJpegBlob(blob)
    } catch {
      // Si no se puede re-normalizar, subir el blob original.
    }
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

/** Elimina fotos del bucket captures/{userId}/ (best-effort). */
export async function deleteUserCaptureStorage(userId) {
  if (!userId) return { deleted: 0, skipped: true }

  const folder = String(userId).replace(/^captures\//, '').split('/')[0]
  const { data: files, error: listError } = await supabase.storage.from(CAPTURES_BUCKET).list(folder, {
    limit: 200,
  })

  if (listError) {
    supabaseLog.upload.warn('capture storage list failed', {
      folder,
      message: listError.message,
    })
    captureSyncLog.error('capture storage list error', {
      folder,
      message: listError.message,
    })
    throw listError
  }

  if (!files?.length) {
    return { deleted: 0 }
  }

  const paths = files
    .filter((file) => file?.name && !file.name.endsWith('/'))
    .map((file) => `${folder}/${file.name}`)

  if (!paths.length) {
    return { deleted: 0 }
  }

  const { error: deleteError } = await supabase.storage.from(CAPTURES_BUCKET).remove(paths)

  if (deleteError) {
    supabaseLog.upload.warn('capture storage delete failed', {
      folder,
      message: deleteError.message,
    })
    captureSyncLog.error('capture storage delete error', {
      folder,
      message: deleteError.message,
    })
    throw deleteError
  }

  supabaseLog.upload.info('capture storage deleted', { folder, deleted: paths.length })
  captureSyncLog.info('capture storage delete success', { folder, deleted: paths.length })
  return { deleted: paths.length }
}
