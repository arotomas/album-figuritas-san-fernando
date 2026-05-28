/**
 * Aplica orientación EXIF al decodificar (fotos de Mac/iPhone suelen llegar rotadas en canvas).
 * @see https://developer.mozilla.org/en-US/docs/Web/API/createImageBitmap/imageOrientation
 */
export function getBitmapOptions(overrides = {}) {
  return {
    imageOrientation: 'from-image',
    ...overrides,
  }
}

export async function createOrientedBitmap(fileOrBlob, options = {}) {
  if (typeof createImageBitmap !== 'function') {
    throw new Error('BITMAP_UNSUPPORTED')
  }
  return createImageBitmap(fileOrBlob, getBitmapOptions(options))
}

/** Canvas con píxeles ya orientados (ancho/alto finales). */
export async function rasterizeFileToCanvas(fileOrBlob, options = {}) {
  const bitmap = await createOrientedBitmap(fileOrBlob, options)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('CANVAS_UNAVAILABLE')
    ctx.drawImage(bitmap, 0, 0)
    return canvas
  } finally {
    bitmap.close?.()
  }
}
