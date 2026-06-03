import { supabase } from '../../lib/supabase'

export async function fetchMyPoints() {
  const { data, error } = await supabase.rpc('get_my_points')

  if (error) {
    if (/not_authenticated/i.test(error.message ?? '')) {
      throw new Error('UNAUTHENTICATED')
    }
    throw error
  }

  const totalPoints = Number(data?.total_points ?? 0)

  return {
    totalPoints: Number.isFinite(totalPoints) ? Math.max(0, totalPoints) : 0,
  }
}
