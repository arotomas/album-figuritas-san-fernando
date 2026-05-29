/**
 * Experimento: sensación heading-up sin tocar mapPane.
 * Rama: test/heading-up-safe — no mergear sin validación en preview.
 */
export const HEADING_UP_SAFE_EXPERIMENT = {
  enabled: true,
  /** Brújula fija en pantalla (anillo N/E/S/O). */
  compassWidget: true,
  /** Barra superior con flecha de rumbo. */
  bearingBar: true,
  /** Punto azul con cuña y anillo de dirección ampliados. */
  enhancedUserDot: true,
  /** Tick de “arriba” en figuritas cuando hay bearing activo. */
  markerHeadingCue: true,
}
