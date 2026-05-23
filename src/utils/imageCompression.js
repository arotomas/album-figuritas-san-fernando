const DEFAULT_OPTIONS = {
  maxWidth: 960,
  maxHeight: 960,
  quality: 0.68,
  mimeType: 'image/jpeg',
}

function loadImageFromSource(source) {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => {
      if (!image.width || !image.height) {
        reject(new Error('IMAGE_EMPTY'))
        return
      }
      resolve(image)
    }
    image.onerror = () => reject(new Error('IMAGE_LOAD_FAILED'))

    try {
      if (source instanceof HTMLCanvasElement) {
        if (!source.width || !source.height) {
          reject(new Error('CANVAS_EMPTY'))
          return
        }
        image.src = source.toDataURL('image/jpeg', 0.92)
        return
      }

      if (source instanceof Blob) {
        image.src = URL.createObjectURL(source)
        image.onload = () => {
          URL.revokeObjectURL(image.src)
          if (!image.width || !image.height) {
            reject(new Error('IMAGE_EMPTY'))
            return
          }
          resolve(image)
        }
        return
      }

      image.src = source
    } catch (error) {
      reject(error)
    }
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
  const dataUrl = canvas.toDataURL(mimeType, quality)
  if (!dataUrl || dataUrl === 'data:,') {
    throw new Error('COMPRESSION_TO_DATA_URL_FAILED')
  }
  return dataUrl
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

/**
 * Comprime una imagen vía canvas. Devuelve solo la versión comprimida.
 */
export async function compressImage(source, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options }

  try {
    const image = await loadImageFromSource(source)

    const { width, height } = calculateDimensions(
      image.width,
      image.height,
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

    context.drawImage(image, 0, 0, width, height)

    const dataUrl = canvasToDataUrl(canvas, config.quality, config.mimeType)
    const blob = dataUrlToBlob(dataUrl)

    if (!blob.size) {
      throw new Error('COMPRESSION_EMPTY_OUTPUT')
    }

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
