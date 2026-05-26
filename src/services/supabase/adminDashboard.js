import { supabase } from '../../lib/supabase'
import { adminLog } from '../../utils/adminLog'
import {
  FIGURE_ADMIN_SELECT,
  FIGURE_CORE_COLUMNS,
  FIGURE_SCHEMA_FALLBACK_PATTERN,
  FIGURE_UNIVERSE_DEFAULTS,
} from '../../config/figureSchema'

const FIGURE_COLUMNS = FIGURE_ADMIN_SELECT

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
  let { data, error } = await supabase
    .from('figures')
    .select(FIGURE_COLUMNS)
    .order('created_at', { ascending: true })

  if (error && FIGURE_SCHEMA_FALLBACK_PATTERN.test(error.message ?? '')) {
    const fallback = await supabase
      .from('figures')
      .select(FIGURE_CORE_COLUMNS)
      .order('created_at', { ascending: true })

    data = fallback.data?.map((figure) => ({
      ...figure,
      capture_radius: 250,
      is_bonus: false,
      is_hidden: false,
      unlock_order: null,
      reveal_after_count: 0,
      bonus_type: null,
      reveal_radius: 200,
      marker_icon_url: null,
      marker_icon_size: 48,
      challenge_title: null,
      challenge_description: null,
      challenge_type: null,
      challenge_example_image_url: null,
      ...FIGURE_UNIVERSE_DEFAULTS,
    }))
    error = fallback.error
  }

  if (error) handleAdminError('figures', error)
  console.log('[SUPABASE-CHECK]', {
    url: import.meta.env.VITE_SUPABASE_URL ?? '(missing)',
    project: import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] ?? '(unknown)',
    source: 'getFiguresAdmin',
    pathname: typeof window !== 'undefined' ? window.location.pathname : '(ssr)',
    figureCount: data?.length ?? 0,
    hadError: Boolean(error),
    usedSchemaFallback: Boolean(error && FIGURE_SCHEMA_FALLBACK_PATTERN.test(error?.message ?? '')),
  })
  adminLog.info('figures loaded', { count: data?.length ?? 0 })
  return data ?? []
}

function logFigureCrud(level, message, detail) {
  const tag = '[admin-figures]'
  if (level === 'error') console.error(tag, message, detail)
  else console.info(tag, message, detail)
}

function toIsoOrNull(value) {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null
}

function normalizeFigurePayload(figure) {
  return {
    title: figure.title.trim(),
    description: figure.description?.trim() || null,
    rarity: figure.rarity,
    image_url: figure.image_url?.trim() || null,
    lat: Number(figure.lat),
    lng: Number(figure.lng),
    capture_radius: Number(figure.capture_radius) || 250,
    is_bonus: Boolean(figure.is_bonus),
    is_hidden: Boolean(figure.is_hidden),
    unlock_order: figure.unlock_order === '' || figure.unlock_order == null ? null : Number(figure.unlock_order),
    reveal_after_count: Number(figure.reveal_after_count) || 0,
    bonus_type: figure.is_bonus && figure.bonus_type ? figure.bonus_type : null,
    reveal_radius: Number(figure.reveal_radius) || 200,
    marker_icon_url: figure.marker_icon_url?.trim() || null,
    marker_icon_size: Number(figure.marker_icon_size) || 48,
    challenge_title: figure.challenge_title?.trim() || null,
    challenge_description: figure.challenge_description?.trim() || null,
    challenge_type: figure.challenge_type?.trim() || null,
    challenge_example_image_url: figure.challenge_example_image_url?.trim() || null,
    collection_id: figure.collection_id?.trim() || null,
    category: figure.category?.trim() || null,
    page: figure.page === '' || figure.page == null ? null : Number(figure.page),
    event_id: figure.event_id?.trim() || null,
    event_starts_at: toIsoOrNull(figure.event_starts_at),
    event_ends_at: toIsoOrNull(figure.event_ends_at),
    active: Boolean(figure.active),
  }
}

export function buildFigureId(title) {
  const slug = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42)

  const suffix =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Date.now().toString(36)

  return `${slug || 'figurita'}-${suffix}`
}

export async function createFigureAdmin(figure) {
  const payload = {
    id: figure.id || buildFigureId(figure.title),
    ...normalizeFigurePayload(figure),
  }

  logFigureCrud('info', 'create start', { id: payload.id, title: payload.title })

  const { data, error } = await supabase
    .from('figures')
    .insert(payload)
    .select(FIGURE_COLUMNS)
    .single()

  if (error) {
    logFigureCrud('error', 'create error', { message: error.message, code: error.code })
    handleAdminError('create figure', error)
  }

  logFigureCrud('info', 'create success', { id: data.id })
  return data
}

export async function updateFigureAdmin(id, figure) {
  const payload = normalizeFigurePayload(figure)

  logFigureCrud('info', 'update start', { id })

  const { data, error } = await supabase
    .from('figures')
    .update(payload)
    .eq('id', id)
    .select(FIGURE_COLUMNS)
    .single()

  if (error) {
    logFigureCrud('error', 'update error', { id, message: error.message, code: error.code })
    handleAdminError('update figure', error)
  }

  logFigureCrud('info', 'update success', { id: data.id })
  return data
}

export async function deleteFigureAdmin(id) {
  logFigureCrud('info', 'delete start', { id })

  const { error } = await supabase.from('figures').delete().eq('id', id)

  if (error) {
    logFigureCrud('error', 'delete error', { id, message: error.message, code: error.code })
    handleAdminError('delete figure', error)
  }

  logFigureCrud('info', 'delete success', { id })
  return { id }
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
