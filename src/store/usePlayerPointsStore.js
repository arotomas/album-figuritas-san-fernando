import { create } from 'zustand'
import { isSupabaseConfigured } from '../services/supabase/auth'
import { fetchMyPoints } from '../services/supabase/playerPoints'

let refreshInFlight = null

export const usePlayerPointsStore = create((set, get) => ({
  totalPoints: null,
  loading: false,
  error: null,
  lastFetchedAt: 0,

  refreshPlayerPoints: async () => {
    if (!isSupabaseConfigured()) {
      set({ totalPoints: null, loading: false, error: null })
      return { ok: false, reason: 'not_configured' }
    }

    if (refreshInFlight) return refreshInFlight

    refreshInFlight = (async () => {
      set({ loading: true, error: null })

      try {
        const { totalPoints } = await fetchMyPoints()
        set({
          totalPoints,
          loading: false,
          error: null,
          lastFetchedAt: Date.now(),
        })
        return { ok: true, totalPoints }
      } catch (error) {
        const message =
          error?.message === 'UNAUTHENTICATED'
            ? 'UNAUTHENTICATED'
            : 'FETCH_FAILED'

        set({
          loading: false,
          error: message,
        })

        return { ok: false, reason: message }
      } finally {
        refreshInFlight = null
      }
    })()

    return refreshInFlight
  },

  bumpOptimistic: (delta) => {
    const amount = Number(delta)
    if (!Number.isFinite(amount) || amount <= 0) return

    const current = get().totalPoints
    if (current == null) return

    set({ totalPoints: current + amount })
  },

  resetPlayerPoints: () => {
    set({ totalPoints: 0, error: null, lastFetchedAt: Date.now() })
  },
}))
