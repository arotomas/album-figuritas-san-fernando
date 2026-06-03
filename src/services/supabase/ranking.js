import { supabase } from '../../lib/supabase'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

function clampLimit(limit) {
  const value = Number(limit)
  if (!Number.isFinite(value)) return DEFAULT_LIMIT
  return Math.max(1, Math.min(value, MAX_LIMIT))
}

function normalizeLeaderboardEntry(entry) {
  if (!entry || typeof entry !== 'object') return null

  const rank = Number(entry.rank)
  const totalPoints = Number(entry.total_points)
  const username = typeof entry.username === 'string' ? entry.username.trim() : ''

  if (!Number.isFinite(rank) || rank < 1 || !username) return null

  return {
    rank,
    username,
    totalPoints: Number.isFinite(totalPoints) ? totalPoints : 0,
  }
}

function normalizeMePayload(me) {
  if (!me || typeof me !== 'object') {
    return { rank: null, username: null, totalPoints: 0 }
  }

  const rank = me.rank == null ? null : Number(me.rank)
  const totalPoints = Number(me.total_points ?? 0)
  const username = typeof me.username === 'string' ? me.username.trim() : null

  return {
    rank: Number.isFinite(rank) && rank >= 1 ? rank : null,
    username: username || null,
    totalPoints: Number.isFinite(totalPoints) ? totalPoints : 0,
  }
}

export async function fetchPlayerRanking(limit = DEFAULT_LIMIT) {
  const { data, error } = await supabase.rpc('get_player_ranking', {
    p_limit: clampLimit(limit),
  })

  if (error) {
    if (/not_authenticated/i.test(error.message ?? '')) {
      throw new Error('UNAUTHENTICATED')
    }
    throw error
  }

  const leaderboard = Array.isArray(data?.leaderboard)
    ? data.leaderboard.map(normalizeLeaderboardEntry).filter(Boolean)
    : []

  return {
    leaderboard,
    me: normalizeMePayload(data?.me),
  }
}
