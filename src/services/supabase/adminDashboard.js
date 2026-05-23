import { supabase } from '../../lib/supabase'
import { adminLog } from '../../utils/adminLog'

function isPermissionError(error) {
  return (
    error?.code === '42501' ||
    /permission|policy|rls|row-level/i.test(error?.message ?? '')
  )
}

function handleAdminError(label, error) {
  if (isPermissionError(error)) {
    adminLog.warn('permission denied', { label, message: error.message, code: error.code })
  } else {
    adminLog.error(`${label} failed`, {
      message: error?.message ?? String(error),
      code: error?.code,
      details: error?.details,
    })
  }
  throw error
}

async function countRows(table) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })

  if (error) handleAdminError(`${table} count`, error)
  return count ?? 0
}

export async function getAdminStats() {
  const [totalUsers, totalCaptures, totalUnlockedFigures] = await Promise.all([
    countRows('profiles'),
    countRows('captures'),
    countRows('user_figures'),
  ])

  const stats = { totalUsers, totalCaptures, totalUnlockedFigures }
  adminLog.info('stats loaded', stats)
  return stats
}

export async function getRecentCaptures(limit = 25) {
  const baseColumns = 'id, user_id, figure_id, lat, lng, created_at, photo_url, device'
  const withValidation = `${baseColumns}, validation_status`
  let { data: captures, error } = await supabase
    .from('captures')
    .select(withValidation)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error && /validation_status/i.test(error.message ?? '')) {
    const fallback = await supabase
      .from('captures')
      .select(baseColumns)
      .order('created_at', { ascending: false })
      .limit(limit)

    captures = fallback.data
    error = fallback.error
  }

  if (error) handleAdminError('captures', error)

  const userIds = [...new Set((captures ?? []).map((row) => row.user_id).filter(Boolean))]
  const figureIds = [...new Set((captures ?? []).map((row) => row.figure_id).filter(Boolean))]

  const [{ data: profiles, error: profilesError }, { data: figures, error: figuresError }] =
    await Promise.all([
      userIds.length
        ? supabase.from('profiles').select('id, username').in('id', userIds)
        : Promise.resolve({ data: [], error: null }),
      figureIds.length
        ? supabase.from('figures').select('id, title').in('id', figureIds)
        : Promise.resolve({ data: [], error: null }),
    ])

  if (profilesError) handleAdminError('capture profiles', profilesError)
  if (figuresError) handleAdminError('capture figures', figuresError)

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  const figuresById = new Map((figures ?? []).map((figure) => [figure.id, figure]))

  const rows = (captures ?? []).map((capture) => ({
    ...capture,
    username: profilesById.get(capture.user_id)?.username ?? 'Sin usuario',
    figureTitle: figuresById.get(capture.figure_id)?.title ?? capture.figure_id,
  }))

  adminLog.info('captures loaded', { count: rows.length })
  return rows
}

export async function getFiguresAdmin() {
  const { data, error } = await supabase
    .from('figures')
    .select('id, title, description, rarity, lat, lng, image_url, active, created_at')
    .order('created_at', { ascending: true })

  if (error) handleAdminError('figures', error)
  adminLog.info('figures loaded', { count: data?.length ?? 0 })
  return data ?? []
}

export async function toggleFigureActive(id, nextActive) {
  const { data, error } = await supabase
    .from('figures')
    .update({ active: nextActive })
    .eq('id', id)
    .select('id, active')
    .single()

  if (error) handleAdminError('toggle figure active', error)

  adminLog.info('toggle figure active', { id, active: data.active })
  return data
}
