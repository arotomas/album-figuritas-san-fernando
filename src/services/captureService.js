/**
 * Servicio de captura — preparado para subida futura al backend WordPress.
 * Por ahora solo valida y formatea datos locales.
 */

export function buildCapturePayload(figure, compressedPhoto) {
  return {
    figureId: figure.id,
    figureSlug: figure.slug,
    capturedAt: Date.now(),
    location: {
      lat: figure.lat,
      lng: figure.lng,
    },
    photo: {
      dataUrl: compressedPhoto.dataUrl,
      sizeBytes: compressedPhoto.sizeBytes,
      width: compressedPhoto.width,
      height: compressedPhoto.height,
    },
  }
}

/** Placeholder para futura subida remota */
export async function uploadCapture() {
  throw new Error('Upload no implementado — backend pendiente.')
}
