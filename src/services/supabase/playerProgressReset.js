import { supabase } from '../../lib/supabase'

function normalizeResetSummary(data) {
  const payload = data && typeof data === 'object' ? data : {}

  return {
    ok: payload.ok === true,
    deletedUserFigures: Number(payload.deleted_user_figures) || 0,
    deletedCaptures: Number(payload.deleted_captures) || 0,
    deletedLedgerRows: Number(payload.deleted_ledger_rows) || 0,
    totalPointsAfter: Number(payload.total_points_after) || 0,
  }
}

/** Reset atómico en DB: ledger + captures + user_figures del usuario autenticado. */
export async function resetMyProgressRemote() {
  const { data, error } = await supabase.rpc('reset_my_progress')

  if (error) {
    if (/not_authenticated/i.test(error.message ?? '')) {
      throw new Error('UNAUTHENTICATED')
    }
    throw error
  }

  const summary = normalizeResetSummary(data)

  if (!summary.ok) {
    throw new Error('RESET_RPC_FAILED')
  }

  if (summary.totalPointsAfter !== 0) {
    throw new Error('RESET_LEDGER_NOT_EMPTY')
  }

  return summary
}
