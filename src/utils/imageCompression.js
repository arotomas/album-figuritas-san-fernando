const DEFAULT_OPTIONS = {
  maxWidth: 960,
  maxHeight: 960,
  quality: 0.68,
  mimeType: 'image/jpeg',
}

function loadImageFromSource(source) {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = reject

    if (source instanceof HTMLCanvasElement) {
      image.src = source.toDataURL('image/jpeg', 0.92)
      return
    }

    if (source instanceof Blob) {
      image.src = URL.createObjectURL(source)
      image.onload = () => {
        URL.revokeObjectURL(image.src)
        resolve(image)
      }
      return
    }

    image.src = source
  })
}

function calculateDimensions(width, height, maxWidth, maxHeight) {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height }
  }

  const ratio = Math.min(maxWidth / width, maxHeight / height)

  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  }
}

function canvasToDataUrl(canvas, quality, mimeType) {
  return canvas.toDataURL(mimeType, quality)
}

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
  const binary = atob(base64)
  const array = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i += 1) {
    array[i] = binary.charCodeAt(i)
  }

  return new Blob([array], { type: mime })
}

/**
 * Comprime una imagen vía canvas. Devuelve solo la versión comprimida.
 * Preparado para enviar el Blob resultante al backend en el futuro.
 */
export async function compressImage(source, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options }
  const image = await loadImageFromSource(source)

  const { width, height } = calculateDimensions(
    image.width,
    image.height,
    config.maxWidth,
    config.maxHeight,
  )

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  context.drawImage(image, 0, 0, width, height)

  const dataUrl = canvasToDataUrl(canvas, config.quality, config.mimeType)
  const blob = dataUrlToBlob(dataUrl)

  return {
    dataUrl,
    blob,
    width,
    height,
    sizeBytes: blob.size,
  }
}
