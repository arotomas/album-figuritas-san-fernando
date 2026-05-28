import { createOrientedBitmap } from './imageOrientation'

const JPEG_MIME = 'image/jpeg'

export async function isValidJpegBlob(blob) {
  if (!(blob instanceof Blob) || blob.size < 4) return false
  try {
    const head = new Uint8Array(await blob.slice(0, 2).arrayBuffer())
    if (head[0] !== 0xff || head[1] !== 0xd8) return false
    const tail = new Uint8Array(await blob.slice(-2).arrayBuffer())
    return tail[0] === 0xff && tail[1] === 0xd9
  } catch {
    return false
  }
}

/** Re-codifica a JPEG baseline decodificable en iOS/Android. */
export async function normalizeJpegBlob(blob) {
  if (!(blob instanceof Blob) || blob.size <= 0) {
    throw new Error('INVALID_JPEG_BLOB')
  }

  if (typeof createImageBitmap !== 'function') {
    return blob
  }

  const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' })
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('CANVAS_UNAVAILABLE')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0)

    const normalized = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (next) => (next?.size ? resolve(next) : reject(new Error('JPEG_ENCODE_EMPTY'))),
        JPEG_MIME,
        0.85,
      )
    })

    if (!(await isValidJpegBlob(normalized))) {
      throw new Error('JPEG_ENCODE_INVALID')
    }

    return normalized
  } finally {
    bitmap.close?.()
  }
}

export function createPhotoPreviewUrl({ blob, dataUrl }) {
  if (blob instanceof Blob && blob.size > 0) {
    return { url: URL.createObjectURL(blob), revoke: true }
  }
  if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
    return { url: dataUrl, revoke: false }
  }
  return { url: null, revoke: false }
}

export function revokePhotoPreviewUrl(entry) {
  if (entry?.revoke && entry?.url?.startsWith('blob:')) {
    URL.revokeObjectURL(entry.url)
  }
}
