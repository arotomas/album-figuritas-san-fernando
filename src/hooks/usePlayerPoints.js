import { useCallback, useEffect } from 'react'
import { usePlayerPointsStore } from '../store/usePlayerPointsStore'
import { useAppStore } from '../store/useAppStore'

export function usePlayerPoints({ autoFetch = true } = {}) {
  const supabaseReady = useAppStore((state) => state.supabaseReady)
  const totalPoints = usePlayerPointsStore((state) => state.totalPoints)
  const loading = usePlayerPointsStore((state) => state.loading)
  const error = usePlayerPointsStore((state) => state.error)
  const refreshPlayerPoints = usePlayerPointsStore((state) => state.refreshPlayerPoints)

  const refresh = useCallback(() => refreshPlayerPoints(), [refreshPlayerPoints])

  useEffect(() => {
    if (!autoFetch || !supabaseReady) return
    void refreshPlayerPoints()
  }, [autoFetch, refreshPlayerPoints, supabaseReady])

  return {
    totalPoints,
    loading,
    error,
    refresh,
    visible: supabaseReady && totalPoints != null,
  }
}
