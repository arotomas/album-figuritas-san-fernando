import { isMapDebugLoggingEnabled } from '../config/mapDebug'

/**
 * Logs de diagnóstico del mapa — prefijo uniforme para filtrar en consola remota.
 * Categorías: invalidateSize | flyTo | panTo | setView | fitBounds | bearing |
 * autoFollow | viewport | rotation | gesture | resize
 */
export function mapDebugLog(category, message, detail = undefined) {
  if (!isMapDebugLoggingEnabled()) return

  const payload =
    detail === undefined
      ? ''
      : typeof detail === 'string'
        ? detail
        : JSON.stringify(detail)

  if (payload) {
    console.info(`[map-debug:${category}] ${message}`, detail)
  } else {
    console.info(`[map-debug:${category}] ${message}`)
  }
}
