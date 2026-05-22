import { useEffect, useRef } from 'react'
import { useAppLifecycle } from './useAppLifecycle'
import { GPS_RECOVERY_DELAY_MS } from '../config/ux'
import { stopVibration } from '../utils/vibration'
import { logDiagnostic } from '../utils/diagnostics'

/**
 * Pausa GPS en background y lo reactiva al volver — ahorra batería y evita estados colgados.
 */
export function useGpsRecovery({ stopWatching, requestPermission, enabled = true }) {
  const recoveringRef = useRef(false)
  const timerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  useAppLifecycle({
    enabled,
    onHidden: () => {
      logDiagnostic('gps', 'pause background')
      stopVibration()
      stopWatching?.()
    },
    onVisible: () => {
      if (recoveringRef.current) return
      recoveringRef.current = true

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        logDiagnostic('gps', 'resume foreground')
        requestPermission?.()
        recoveringRef.current = false
      }, GPS_RECOVERY_DELAY_MS)
    },
  })
}
