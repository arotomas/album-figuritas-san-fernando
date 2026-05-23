import { MAX_PHOTO_BYTES } from '../config/persistence'
import { withTimeout } from './withTimeout'

const LOAD_MS = 8_000
const ENCODE_MS = 8_000

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

function canvasToBlobAsync(canvas, quality, mimeType = 'image/jpeg') {
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
    canvasToBlobAsync(canvas, quality),
    ENCODE_MS,
    'encodeCanvas',
  )

  if (typeof encoded === 'string') {
    return {
      dataUrl: encoded,
      sizeBytes: Math.max(1, Math.round(encoded.length * 0.75)),
      width: canvas.width,
      height: canvas.height,
    }
  }

  const dataUrl = await blobToDataUrl(encoded)
  return {
    dataUrl,
    sizeBytes: encoded.size,
    width: canvas.width,
    height: canvas.height,
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

  ctx.drawImage(bitmap, 0, 0, width, height)
  return encodeSmallCanvas(canvas, quality)
}

async function loadBitmapFromFile(file, maxDim) {
  if (typeof createImageBitmap !== 'function') {
    throw new Error('BITMAP_UNSUPPORTED')
  }

  try {
    return await withTimeout(
      createImageBitmap(file, {
        resizeWidth: maxDim,
        resizeHeight: maxDim,
        resizeQuality: 'medium',
      }),
      LOAD_MS,
      'createImageBitmapResize',
    )
  } catch {
    return withTimeout(createImageBitmap(file), LOAD_MS, 'createImageBitmap')
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
  const attempts = [
    { maxDim: 720, quality: 0.62 },
    { maxDim: 560, quality: 0.5 },
    { maxDim: 420, quality: 0.4 },
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
    const img = await loadImageElementFromFile(file)
    const { width, height } = calculateDimensions(
      img.naturalWidth,
      img.naturalHeight,
      420,
      420,
    )
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')?.drawImage(img, 0, 0, width, height)
    const result = await encodeSmallCanvas(canvas, 0.35)
    if (result.sizeBytes <= MAX_PHOTO_BYTES || isQaTest) {
      return result
    }
  } catch (error) {
    lastError = error
  }

  if (isQaTest) {
    return {
      dataUrl: QA_PLACEHOLDER_JPEG,
      sizeBytes: Math.max(1, Math.round(QA_PLACEHOLDER_JPEG.length * 0.75)),
      width: 1,
      height: 1,
    }
  }

  throw lastError ?? new Error('PREPARE_FAILED')
}
