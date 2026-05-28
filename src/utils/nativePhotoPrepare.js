import { MAX_PHOTO_BYTES } from '../config/persistence'
import { createOrientedBitmap, rasterizeFileToCanvas } from './imageOrientation'
import { isValidJpegBlob, normalizeJpegBlob } from './photoEncode'
import { withTimeout } from './withTimeout'
import { mobilePhotoLog } from './mobilePhotoLog'

const LOAD_MS = 8_000
const ENCODE_MS = 8_000
const JPEG_MIME = 'image/jpeg'

/** JPEG mínimo válido (~600 bytes) — último recurso QA. */
export const QA_PLACEHOLDER_JPEG =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k='

function calculateDimensions(width, height, maxWidth, maxHeight) {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height }
  }
  const ratio = Math.min(maxWidth / width, maxHeight / height)
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  }
}

function canvasToBlobAsync(canvas, quality, mimeType = JPEG_MIME) {
  return new Promise((resolve, reject) => {
    if (!canvas.toBlob) {
      try {
        const dataUrl = canvas.toDataURL(mimeType, quality)
        if (!dataUrl || dataUrl === 'data:,') {
          reject(new Error('ENCODE_FAILED'))
          return
        }
        resolve(dataUrl)
      } catch (error) {
        reject(error)
      }
      return
    }

    canvas.toBlob(
      (blob) => {
        if (!blob?.size) {
          reject(new Error('ENCODE_EMPTY'))
          return
        }
        resolve(blob)
      },
      mimeType,
      quality,
    )
  })
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    let settled = false

    const finish = (handler) => (value) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      handler(value)
    }

    const timer = window.setTimeout(() => {
      reader.abort()
      finish(reject)(new Error('BLOB_READ_TIMEOUT'))
    }, LOAD_MS)

    reader.onload = finish(() => {
      if (typeof reader.result === 'string' && reader.result.length > 22) {
        resolve(reader.result)
      } else {
        reject(new Error('BLOB_READ_EMPTY'))
      }
    })
    reader.onerror = finish(() => reject(new Error('BLOB_READ_FAILED')))
    reader.onabort = finish(() => reject(new Error('BLOB_READ_ABORT')))
    reader.readAsDataURL(blob)
  })
}

async function encodeSmallCanvas(canvas, quality) {
  const encoded = await withTimeout(
    canvasToBlobAsync(canvas, quality, JPEG_MIME),
    ENCODE_MS,
    'encodeCanvas',
  )

  let rawBlob = encoded
  if (typeof encoded === 'string') {
    if (!encoded.startsWith('data:image/jpeg')) {
      throw new Error('MOBILE_JPEG_ENCODE_FAILED')
    }
    const [, base64] = encoded.split(',')
    if (!base64) throw new Error('MOBILE_JPEG_ENCODE_FAILED')
    const binary = atob(base64.replace(/\s/g, ''))
    const array = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) array[i] = binary.charCodeAt(i)
    rawBlob = new Blob([array], { type: JPEG_MIME })
  }

  if (!(rawBlob instanceof Blob) || rawBlob.size <= 0) {
    throw new Error('MOBILE_INVALID_JPEG_BLOB')
  }

  const blob =
    (await isValidJpegBlob(rawBlob))
      ? await normalizeJpegBlob(rawBlob).catch(() => rawBlob)
      : await normalizeJpegBlob(rawBlob)

  const dataUrl = await blobToDataUrl(blob)
  if (!dataUrl.startsWith('data:image/jpeg')) {
    throw new Error('MOBILE_JPEG_DATA_URL_FAILED')
  }

  return {
    dataUrl,
    blob,
    sizeBytes: blob.size,
    width: canvas.width,
    height: canvas.height,
    type: blob.type,
  }
}

async function bitmapToCompressed(bitmap, maxWidth, maxHeight, quality) {
  const { width, height } = calculateDimensions(
    bitmap.width,
    bitmap.height,
    maxWidth,
    maxHeight,
  )

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('CANVAS_UNAVAILABLE')

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, width, height)
  return encodeSmallCanvas(canvas, quality)
}

async function loadBitmapFromFile(file, maxDim) {
  if (typeof createImageBitmap !== 'function') {
    throw new Error('BITMAP_UNSUPPORTED')
  }

  try {
    return await withTimeout(
      createOrientedBitmap(file, {
        resizeWidth: maxDim,
        resizeQuality: 'high',
      }),
      LOAD_MS,
      'createImageBitmapResize',
    )
  } catch {
    return withTimeout(createOrientedBitmap(file), LOAD_MS, 'createImageBitmap')
  }
}

function loadImageElementFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    let settled = false

    const finish = (handler) => (value) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      URL.revokeObjectURL(url)
      handler(value)
    }

    const timer = window.setTimeout(() => {
      img.onload = null
      img.onerror = null
      finish(reject)(new Error('IMAGE_LOAD_TIMEOUT'))
    }, LOAD_MS)

    img.onload = finish(() => resolve(img))
    img.onerror = finish(() => reject(new Error('IMAGE_LOAD_FAILED')))
    img.src = url
  })
}

/**
 * Pipeline mobile: bitmap redimensionado + canvas chico + toBlob.
 * Evita decodificar 12MP completos en el hilo principal.
 */
export async function prepareNativeCapturePhoto(file, { isQaTest = false } = {}) {
  if (!file || file.size <= 0) {
    throw new Error('MOBILE_FILE_EMPTY')
  }

  const attempts = [
    { maxDim: 720, quality: 0.75 },
    { maxDim: 640, quality: 0.68 },
    { maxDim: 560, quality: 0.58 },
    { maxDim: 420, quality: 0.48 },
  ]

  let lastError = null

  for (const attempt of attempts) {
    let bitmap = null
    try {
      bitmap = await loadBitmapFromFile(file, attempt.maxDim)
      const result = await bitmapToCompressed(
        bitmap,
        attempt.maxDim,
        attempt.maxDim,
        attempt.quality,
      )
      mobilePhotoLog.info('compressed jpeg', {
        mode: 'bitmap',
        maxDim: attempt.maxDim,
        quality: attempt.quality,
        size: result.sizeBytes,
        type: result.type,
        width: result.width,
        height: result.height,
      })
      if (result.sizeBytes <= MAX_PHOTO_BYTES || isQaTest) {
        return result
      }
      lastError = new Error('PHOTO_TOO_LARGE')
    } catch (error) {
      lastError = error
    } finally {
      bitmap?.close?.()
    }
  }

  try {
    const oriented = await rasterizeFileToCanvas(file)
    const { width, height } = calculateDimensions(
      oriented.width,
      oriented.height,
      420,
      420,
    )
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')?.drawImage(oriented, 0, 0, width, height)
    const result = await encodeSmallCanvas(canvas, 0.35)
    mobilePhotoLog.info('compressed jpeg', {
      mode: 'image-element',
      maxDim: 420,
      quality: 0.35,
      size: result.sizeBytes,
      type: result.type,
      width: result.width,
      height: result.height,
    })
    if (result.sizeBytes <= MAX_PHOTO_BYTES || isQaTest) {
      return result
    }
  } catch (error) {
    lastError = error
  }

  throw lastError ?? new Error('PREPARE_FAILED')
}
