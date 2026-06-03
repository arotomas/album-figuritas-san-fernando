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
