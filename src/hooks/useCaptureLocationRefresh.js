import { useEffect, useRef } from 'react'
import { CAPTURE_FRESH_FIX_POLL_MS } from '../config/captureLocation'

/**
 * Captura: fuerza getCurrentPosition al abrir y repregunta en intervalo fijo.
 * Solo /capture — no altera filtros globales del mapa.
 */
export function useCaptureLocationRefresh({
  enabled = false,
  requestCaptureFreshFix,
}) {
  const requestRef = useRef(requestCaptureFreshFix)
  requestRef.current = requestCaptureFreshFix

  useEffect(() => {
    if (!enabled) return undefined

    requestRef.current?.()

    const timer = window.setInterval(() => {
      requestRef.current?.()
    }, CAPTURE_FRESH_FIX_POLL_MS)

    return () => window.clearInterval(timer)
  }, [enabled])
}
