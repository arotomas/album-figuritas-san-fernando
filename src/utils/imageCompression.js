import { MAX_PHOTO_BYTES } from '../config/persistence'
import { rasterizeFileToCanvas } from './imageOrientation'
import { withTimeout } from './withTimeout'

const DEFAULT_OPTIONS = {
  maxWidth: 960,
  maxHeight: 960,
  quality: 0.68,
  mimeType: 'image/jpeg',
}

const IMAGE_LOAD_TIMEOUT_MS = 10_000
const COMPRESS_TIMEOUT_MS = 12_000

function loadImageFromSource(source) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    let objectUrl = null
    let settled = false

    const finish = (handler) => (value) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      handler(value)
    }

    const timer = window.setTimeout(() => {
      image.onload = null
      image.onerror = null
      finish(reject)(new Error('IMAGE_LOAD_TIMEOUT'))
    }, IMAGE_LOAD_TIMEOUT_MS)

    image.onload = finish(() => {
      if (!image.width || !image.height) {
        reject(new Error('IMAGE_EMPTY'))
        return
      }
      resolve(image)
    })

    image.onerror = finish(() => reject(new Error('IMAGE_LOAD_FAILED')))

    try {
      if (source instanceof Blob) {
        objectUrl = URL.createObjectURL(source)
        image.src = objectUrl
        return
      }

      image.src = source
    } catch (error) {
      finish(reject)(error)
    }
  })
}

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

function canvasToDataUrl(canvas, quality, mimeType) {
  const dataUrl = canvas.toDataURL(mimeType, quality)
  if (!dataUrl || dataUrl === 'data:,') {
    throw new Error('COMPRESSION_TO_DATA_URL_FAILED')
  }
  return dataUrl
}

function canvasToBlobAsync(canvas, quality, mimeType) {
  return new Promise((resolve, reject) => {
    if (!canvas.toBlob) {
      try {
        resolve(dataUrlToBlob(canvasToDataUrl(canvas, quality, mimeType)))
      } catch (error) {
        reject(error)
      }
      return
    }

    canvas.toBlob(
      (blob) => {
        if (!blob || !blob.size) {
          reject(new Error('COMPRESSION_EMPTY_OUTPUT'))
          return
        }
        resolve(blob)
      },
      mimeType,
      quality,
    )
  })
}

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',')
  if (!base64) {
    throw new Error('COMPRESSION_INVALID_DATA_URL')
  }

  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
  const binary = atob(base64)
  const array = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i += 1) {
    array[i] = binary.charCodeAt(i)
  }

  return new Blob([array], { type: mime })
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    const timer = window.setTimeout(() => {
      reader.abort()
      reject(new Error('BLOB_READ_TIMEOUT'))
    }, IMAGE_LOAD_TIMEOUT_MS)

    reader.onload = () => {
      window.clearTimeout(timer)
      if (typeof reader.result === 'string' && reader.result.length > 22) {
        resolve(reader.result)
      } else {
        reject(new Error('COMPRESSION_INVALID_DATA_URL'))
      }
    }
    reader.onerror = () => {
      window.clearTimeout(timer)
      reject(new Error('BLOB_READ_FAILED'))
    }
    reader.onabort = () => {
      window.clearTimeout(timer)
      reject(new Error('BLOB_READ_ABORT'))
    }
    reader.readAsDataURL(blob)
  })
}

function resolveDrawSource(source) {
  if (source instanceof HTMLCanvasElement) {
    if (!source.width || !source.height) {
      throw new Error('CANVAS_EMPTY')
    }
    return {
      drawSource: source,
      width: source.width,
      height: source.height,
    }
  }

  if (source instanceof ImageBitmap) {
    if (!source.width || !source.height) {
      throw new Error('IMAGE_EMPTY')
    }
    return {
      drawSource: source,
      width: source.width,
      height: source.height,
    }
  }

  return null
}

async function resolveRasterSource(source) {
  const direct = resolveDrawSource(source)
  if (direct) return direct

  if (source instanceof Blob && typeof createImageBitmap === 'function') {
    const canvas = await rasterizeFileToCanvas(source)
    return {
      drawSource: canvas,
      width: canvas.width,
      height: canvas.height,
    }
  }

  const image = await loadImageFromSource(source)
  return {
    drawSource: image,
    width: image.width,
    height: image.height,
  }
}

async function encodeCanvas(canvas, quality, mimeType) {
  try {
    const blob = await withTimeout(
      canvasToBlobAsync(canvas, quality, mimeType),
      COMPRESS_TIMEOUT_MS,
      'canvasToBlob',
    )
    const dataUrl = await blobToDataUrl(blob)
    return { dataUrl, blob }
  } catch {
    const dataUrl = canvasToDataUrl(canvas, quality, mimeType)
    const blob = dataUrlToBlob(dataUrl)
    if (!blob.size) {
      throw new Error('COMPRESSION_EMPTY_OUTPUT')
    }
    return { dataUrl, blob }
  }
}

/**
 * Comprime una imagen vía canvas. Acepta canvas directamente sin round-trip toDataURL.
 */
export async function compressImage(source, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options }

  try {
    const { drawSource, width: sourceWidth, height: sourceHeight } =
      await resolveRasterSource(source)

    const { width, height } = calculateDimensions(
      sourceWidth,
      sourceHeight,
      config.maxWidth,
      config.maxHeight,
    )

    if (!width || !height) {
      throw new Error('COMPRESSION_INVALID_DIMENSIONS')
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('CANVAS_CONTEXT_UNAVAILABLE')
    }

    context.drawImage(drawSource, 0, 0, width, height)

    const { dataUrl, blob } = await encodeCanvas(canvas, config.quality, config.mimeType)

    return {
      dataUrl,
      blob,
      width,
      height,
      sizeBytes: blob.size,
    }
  } catch (error) {
    throw new Error(error?.message || 'COMPRESSION_FAILED')
  }
}

/**
 * Intenta comprimir con calidades/dimensiones decrecientes hasta cumplir límite o agotar fallbacks.
 */
export async function compressImageWithFallback(source, options = {}) {
  const attempts = [
    { maxWidth: options.maxWidth ?? 960, maxHeight: options.maxHeight ?? 960, quality: options.quality ?? 0.68 },
    { maxWidth: 720, maxHeight: 720, quality: 0.55 },
    { maxWidth: 640, maxHeight: 640, quality: 0.45 },
    { maxWidth: 480, maxHeight: 480, quality: 0.35 },
  ]

  let lastError = null

  for (const attempt of attempts) {
    try {
      const result = await withTimeout(
        compressImage(source, { ...options, ...attempt }),
        COMPRESS_TIMEOUT_MS,
        'compressImage',
      )
      if (!result?.dataUrl) {
        throw new Error('COMPRESSION_FAILED')
      }
      if (!result.sizeBytes || result.sizeBytes <= MAX_PHOTO_BYTES) {
        return result
      }
      lastError = new Error('COMPRESSION_TOO_LARGE')
    } catch (error) {
      lastError = error
    }
  }

  if (lastError) throw lastError
  throw new Error('COMPRESSION_FAILED')
}

/** Fallback de emergencia: data URL directa del archivo (solo QA / último recurso). */
export function readFileAsDataUrl(file) {
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
      finish(reject)(new Error('FILE_READ_TIMEOUT'))
    }, IMAGE_LOAD_TIMEOUT_MS)

    reader.onload = finish(() => {
      if (typeof reader.result === 'string' && reader.result.length > 22) {
        resolve(reader.result)
      } else {
        reject(new Error('FILE_READ_EMPTY'))
      }
    })
    reader.onerror = finish(() => reject(new Error('FILE_READ_FAILED')))
    reader.onabort = finish(() => reject(new Error('FILE_READ_ABORT')))
    reader.readAsDataURL(file)
  })
}
