import { useEffect, useRef } from 'react'
import { playGameSound } from '../services/audio'

/** Una sola vez por carga de la app (sesión de pestaña). */
let gpsReadySoundPlayed = false

/**
 * Dispara GPS_ENCONTRADO al pasar de búsqueda a ubicación usable.
 * Requiere haber estado en searching antes — no suena si el GPS ya venía listo.
 */
export function useGpsReadySound(gpsPhase, hasPosition) {
  const sawSearchingRef = useRef(false)

  useEffect(() => {
    if (gpsReadySoundPlayed) return

    if (!hasPosition || gpsPhase === 'searching') {
      sawSearchingRef.current = true
      return
    }

    if (sawSearchingRef.current) {
      playGameSound('GPS_ENCONTRADO')
      gpsReadySoundPlayed = true
    }
  }, [gpsPhase, hasPosition])
}
