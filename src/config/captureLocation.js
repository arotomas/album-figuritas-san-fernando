/**
 * Modelo de ubicación en captura — coords = fuente de verdad.
 *
 * locationSnapshot (persistido al abrir sesión):
 * - lat, lng, accuracy: lectura GPS en el momento de startCaptureSession (persistidos).
 * - distanceToFigure: DERIVADO siempre con getDistanceMeters(snapshot, figurita).
 *   No se acepta desde proximidad del mapa (nearFigure.distanceMeters / nearestDistance).
 *
 * Validación (validateDistanceForOpen): solo coords del snapshot + getDistanceToFigure,
 * o trustedPosition/live en captura. No lee snapshot.distanceToFigure como criterio.
 *
 * Aro / isReady / UI: ringDistanceMeters desde livePosition o bootstrap coords;
 * sin cambios en esta capa.
 *
 * captureRecord.distanceToFigure: DERIVADO al desbloquear desde capturePosition + figurita.
 */

export const CAPTURE_LOCATION_MODEL = 'coords-source-of-truth'

/** Fix aceptado en captura más viejo que esto → pedir lectura nueva (ms). */
export const CAPTURE_FIX_STALE_MS = 5_000

/** Intervalo de repregunta mientras la cámara está abierta y el fix sigue viejo (ms). */
export const CAPTURE_FRESH_FIX_POLL_MS = 3_000
