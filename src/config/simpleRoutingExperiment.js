/**
 * Experimento: línea directa usuario → figurita al pulsar "Ir al punto".
 * Sin routing externo ni APIs. Rama: test/simple-routing.
 */
export const SIMPLE_ROUTING_EXPERIMENT = {
  enabled: true,
  /** Sin flyTo/fitBounds al iniciar exploración — solo la línea. */
  skipExplorationCamera: true,
  /** Sin marcador extra de destino — la figurita ya está en el mapa. */
  skipTargetMarker: true,
  line: {
    color: '#38bdf8',
    weight: 5,
    opacity: 0.88,
    dashArray: null,
  },
}
