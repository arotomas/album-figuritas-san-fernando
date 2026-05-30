import { useEffect, useMemo, useState } from 'react'
import { usePersistedAlbum } from './usePersistedAlbum'
import { useSupabaseBootstrap } from './useSupabaseBootstrap'
import { useAppStore } from '../store/useAppStore'

const READY_HOLD_MS = 420

/**
 * Orquesta el boot unificado: hidratación álbum → restore sesión → hold breve → app.
 * @param {{ skipReadyHold?: boolean }} options — admin abre sin espera visual extra
 */
export function useAppBootGate({ skipReadyHold = false } = {}) {
  const { hasHydrated } = usePersistedAlbum()
  useSupabaseBootstrap(hasHydrated)

  const authBootstrapped = useAppStore((state) => state.authBootstrapped)
  const [readyHoldComplete, setReadyHoldComplete] = useState(false)

  const coreBootComplete = hasHydrated && authBootstrapped

  useEffect(() => {
    if (!coreBootComplete) {
      setReadyHoldComplete(false)
      return undefined
    }

    if (skipReadyHold) {
      setReadyHoldComplete(true)
      return undefined
    }

    const timer = window.setTimeout(() => setReadyHoldComplete(true), READY_HOLD_MS)
    return () => window.clearTimeout(timer)
  }, [coreBootComplete, skipReadyHold])

  const phase = useMemo(() => {
    if (!hasHydrated) return 'album'
    if (!authBootstrapped) return 'session'
    if (!readyHoldComplete) return 'ready'
    return null
  }, [authBootstrapped, hasHydrated, readyHoldComplete])

  return {
    isBooting: phase != null,
    bootPhase: phase,
  }
}
