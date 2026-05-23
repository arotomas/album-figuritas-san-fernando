import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { storageService } from '../services/storage/storageService'
import { HYDRATION_TIMEOUT_MS, persistLog } from '../utils/persistLog'
import { sessionDebug, inspectSupabaseAuthStorage } from '../utils/sessionDebug'
import { getSupabaseProjectRef } from '../utils/authDebug'

function isPersistReady() {
  return (
    useAppStore.persist.hasHydrated() ||
    useAppStore.getState()._hasHydrated
  )
}

function markHydrated(reason) {
  persistLog.hydration('ready', reason)
  useAppStore.getState().setHasHydrated(true)
}

/**
 * Espera la rehidratación de Zustand persist.
 * Fallback a los 3s si hydrate falla o onFinishHydration ya disparó antes del mount.
 */
export function usePersistedAlbum() {
  const storeHydrated = useAppStore((state) => state._hasHydrated)
  const albumStatus = useAppStore((state) => state.albumStatus)
  const lastSavedAt = useAppStore((state) => state.lastSavedAt)
  const figures = useAppStore((state) => state.figures)

  const finishedRef = useRef(isPersistReady())
  const [ready, setReady] = useState(finishedRef.current)

  useEffect(() => {
    const finish = (reason) => {
      if (finishedRef.current) return
      finishedRef.current = true
      markHydrated(reason)
      setReady(true)
    }

    if (finishedRef.current || isPersistReady()) {
      finish('already-hydrated')
      return
    }

    persistLog.hydration('waiting')

    const unsubFinish = useAppStore.persist.onFinishHydration(() => {
      finish('onFinishHydration')
    })

    const unsubStore = useAppStore.subscribe((state, prev) => {
      if (state._hasHydrated && !prev._hasHydrated) {
        finish('store-flag')
      }
    })

    if (useAppStore.persist.hasHydrated()) {
      finish('hasHydrated-sync-check')
    }

    const timeout = setTimeout(() => {
      persistLog.hydrationWarn(
        `timeout ${HYDRATION_TIMEOUT_MS}ms — entering with defaults`,
      )
      sessionDebug.error('hydration timeout — clearing album storage only (not supabase auth)', {
        authStorage: inspectSupabaseAuthStorage(getSupabaseProjectRef()),
      })
      try {
        storageService.clearAll()
        useAppStore.persist.clearStorage()
      } catch {
        // ignore storage cleanup errors
      }
      finish('timeout-fallback')
    }, HYDRATION_TIMEOUT_MS)

    return () => {
      unsubFinish()
      unsubStore()
      clearTimeout(timeout)
    }
  }, [storeHydrated])

  return {
    hasHydrated: ready || storeHydrated,
    albumStatus,
    lastSavedAt,
    figureCount: figures.length,
  }
}
