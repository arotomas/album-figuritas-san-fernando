import { useCallback, useEffect, useState } from 'react'
import { fetchPlayerRanking } from '../services/supabase/ranking'
import { PLAYER_PROGRESS_RESET_EVENT } from '../utils/playerProgressReset'
import { VISUAL_PREVIEW_ENABLED, VISUAL_PREVIEW_RANKING } from '../dev/visualPreview'

function getErrorMessage(error) {
  if (error?.message === 'UNAUTHENTICATED') {
    return 'Iniciá sesión para ver el ranking.'
  }
  return 'No pudimos cargar el ranking. Probá de nuevo.'
}

export function usePlayerRanking(limit = 20) {
  const [leaderboard, setLeaderboard] = useState([])
  const [me, setMe] = useState({ rank: null, username: null, totalPoints: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await fetchPlayerRanking(limit)
      setLeaderboard(data.leaderboard)
      setMe(data.me)
    } catch (loadError) {
      setLeaderboard([])
      setMe({ rank: null, username: null, totalPoints: 0 })
      setError(getErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    if (VISUAL_PREVIEW_ENABLED) {
      setLeaderboard(VISUAL_PREVIEW_RANKING.leaderboard.slice(0, limit))
      setMe(VISUAL_PREVIEW_RANKING.me)
      setLoading(false)
      setError(null)
      return undefined
    }

    void reload()
  }, [reload, limit])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const handleProgressReset = () => {
      void reload()
    }

    window.addEventListener(PLAYER_PROGRESS_RESET_EVENT, handleProgressReset)
    return () => {
      window.removeEventListener(PLAYER_PROGRESS_RESET_EVENT, handleProgressReset)
    }
  }, [reload])

  return {
    leaderboard,
    me,
    loading,
    error,
    reload,
  }
}
