/**
 * Servicio de captura — metadata local + validación futura con IA.
 */

export const CAPTURE_VALIDATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}

export function buildCaptureRecord({
  figureId,
  lat,
  lng,
  accuracy,
  distanceToFigure,
  photoUrl,
  createdAt,
}) {
  return {
    figureId,
    lat,
    lng,
    accuracy: accuracy ?? null,
    distanceToFigure,
    photoUrl,
    createdAt: createdAt ?? Date.now(),
    validationStatus: CAPTURE_VALIDATION_STATUS.PENDING,
  }
}

/**
 * Placeholder para validación futura con IA.
 * Por ahora aprueba automáticamente.
 */
export async function validateCapturePhoto(_captureRecord) {
  return { validationStatus: CAPTURE_VALIDATION_STATUS.APPROVED }
}

export async function processCaptureForUnlock(captureRecord) {
  const { validationStatus } = await validateCapturePhoto(captureRecord)

  if (validationStatus === CAPTURE_VALIDATION_STATUS.REJECTED) {
    throw new Error('La foto no pasó la validación.')
  }

  return {
    ...captureRecord,
    validationStatus,
  }
}

/** @deprecated usar buildCaptureRecord */
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
