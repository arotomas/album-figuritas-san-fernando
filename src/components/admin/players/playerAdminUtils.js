import { normalizeText } from '../adminShared'
import { getFullName } from '../../../utils/profileValidation'

export const QUICK_TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'active', label: 'Activos' },
  { id: 'blocked', label: 'Bloqueados' },
  { id: 'admins', label: 'Admins' },
  { id: 'new', label: 'Nuevos' },
  { id: 'suspicious', label: 'Sospechosos' },
]

const MS_DAY = 24 * 60 * 60 * 1000

export function getPlayerInitials(player) {
  const source = player?.username ?? getFullName(player) ?? player?.email ?? '?'
  const parts = String(source).trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return String(source).slice(0, 2).toUpperCase()
}

export function isAdminRole(role) {
  return role === 'admin' || role === 'super_admin' || role === 'moderator'
}

export function isActivePlayer(player, days = 30) {
  const marker = player?.last_login_at ?? player?.lastActivity
  if (!marker) return false
  return Date.now() - new Date(marker).getTime() <= days * MS_DAY
}

export function isNewPlayer(player, days = 7) {
  if (!player?.created_at) return false
  return Date.now() - new Date(player.created_at).getTime() <= days * MS_DAY
}

export function isBlockedPlayer(player) {
  return (player?.album_status ?? 'pending') === 'rejected'
}

export function isSuspiciousPlayer(player) {
  if (isBlockedPlayer(player)) return true
  return player.totalCaptures >= 3 && player.mainProgress?.obtained === 0
}

export function matchesQuickTab(player, tabId) {
  switch (tabId) {
    case 'active':
      return isActivePlayer(player)
    case 'blocked':
      return isBlockedPlayer(player)
    case 'admins':
      return isAdminRole(player?.role ?? 'user')
    case 'new':
      return isNewPlayer(player)
    case 'suspicious':
      return isSuspiciousPlayer(player)
    default:
      return true
  }
}

export function formatRelativeTime(value) {
  if (!value) return 'Sin actividad'
  const diff = Date.now() - new Date(value).getTime()
  if (diff < 0) return 'ahora'
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `hace ${Math.max(sec, 1)} seg`
  const min = Math.floor(sec / 60)
  if (min < 60) return `hace ${min} min`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `hace ${hrs} hs`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'ayer'
  if (days < 30) return `hace ${days} días`
  const months = Math.floor(days / 30)
  if (months < 12) return `hace ${months} mes${months === 1 ? '' : 'es'}`
  return new Date(value).toLocaleDateString('es-AR')
}

export function getPlayerOperationalTone(player) {
  if (isBlockedPlayer(player)) return 'blocked'
  if (isSuspiciousPlayer(player)) return 'suspicious'
  if (isAdminRole(player?.role ?? 'user')) return 'admin'
  if (isNewPlayer(player)) return 'new'
  if (isActivePlayer(player)) return 'active'
  return 'neutral'
}

export const OPERATIONAL_TONE_STYLES = {
  blocked: {
    row: 'border-l-4 border-l-red-400 hover:bg-red-50/40',
    selected: 'bg-red-50/50',
    pill: 'bg-red-100 text-red-800 ring-1 ring-red-200',
    tab: 'data-[active=true]:bg-red-600',
  },
  suspicious: {
    row: 'border-l-4 border-l-orange-400 hover:bg-orange-50/40',
    selected: 'bg-orange-50/50',
    pill: 'bg-orange-100 text-orange-900 ring-1 ring-orange-200',
    tab: 'data-[active=true]:bg-orange-600',
  },
  admin: {
    row: 'border-l-4 border-l-violet-400 hover:bg-violet-50/30',
    selected: 'bg-violet-50/40',
    pill: 'bg-violet-100 text-violet-900 ring-1 ring-violet-200',
    tab: 'data-[active=true]:bg-violet-600',
  },
  new: {
    row: 'border-l-4 border-l-blue-400 hover:bg-blue-50/30',
    selected: 'bg-blue-50/40',
    pill: 'bg-blue-100 text-blue-900 ring-1 ring-blue-200',
    tab: 'data-[active=true]:bg-blue-600',
  },
  active: {
    row: 'border-l-4 border-l-emerald-400 hover:bg-emerald-50/25',
    selected: 'bg-emerald-50/35',
    pill: 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200',
    tab: 'data-[active=true]:bg-emerald-600',
  },
  neutral: {
    row: 'border-l-4 border-l-transparent hover:bg-slate-50/80',
    selected: 'bg-slate-50',
    pill: 'bg-slate-100 text-slate-700 ring-1 ring-border',
    tab: 'data-[active=true]:bg-slate-900',
  },
}

export function getOperationalToneLabel(tone) {
  const labels = {
    blocked: 'Bloqueado',
    suspicious: 'Sospechoso',
    admin: 'Admin',
    new: 'Nuevo',
    active: 'Activo',
    neutral: '',
  }
  return labels[tone] ?? ''
}

export const PAGE_SIZE_OPTIONS = [15, 25, 50]

export function getDefaultPageSize() {
  if (typeof window === 'undefined') return 25
  return window.matchMedia('(max-width: 1023px)').matches ? 15 : 25
}

export const DEFAULT_PLAYER_FILTERS = {
  query: '',
  username: '',
  localidad: '',
  dni: '',
  email: '',
  albumStatus: 'all',
  role: 'all',
  progress: 'all',
}

export function hasActivePlayerFilters(filters) {
  const f = filters ?? {}
  return (
    Boolean(f.query?.trim()) ||
    Boolean(f.username?.trim()) ||
    Boolean(f.localidad?.trim()) ||
    Boolean(f.dni?.trim()) ||
    Boolean(f.email?.trim()) ||
    (f.albumStatus ?? 'all') !== 'all' ||
    (f.role ?? 'all') !== 'all' ||
    (f.progress ?? 'all') !== 'all'
  )
}

const EMPTY_STATE_COPY = {
  all: {
    title: 'No hay jugadores',
    description: 'Todavía no hay inscriptos que coincidan con esta vista.',
  },
  active: {
    title: 'Sin jugadores activos',
    description: 'Ningún jugador tuvo actividad en los últimos 30 días.',
  },
  blocked: {
    title: 'Sin jugadores bloqueados',
    description: 'No hay cuentas con álbum rechazado en este momento.',
  },
  admins: {
    title: 'Sin admins',
    description: 'No hay moderadores ni administradores registrados.',
  },
  new: {
    title: 'Sin jugadores nuevos',
    description: 'Nadie se registró en los últimos 7 días.',
  },
  suspicious: {
    title: 'Sin casos sospechosos',
    description: 'No hay jugadores marcados como sospechosos.',
  },
  search: {
    title: 'Sin resultados',
    description: 'Ningún jugador coincide con tu búsqueda o filtros.',
  },
}

export function getEmptyStateForContext({ quickTab, filters }) {
  if (hasActivePlayerFilters(filters)) {
    return EMPTY_STATE_COPY.search
  }
  return EMPTY_STATE_COPY[quickTab] ?? EMPTY_STATE_COPY.all
}

export function countRarities(albumFigures) {
  const counts = { común: 0, rara: 0, épica: 0, legendaria: 0 }
  for (const figure of albumFigures ?? []) {
    if (!figure.obtenida) continue
    const key = normalizeText(figure.rareza ?? figure.rarity)
    if (key.includes('legend')) counts.legendaria += 1
    else if (key.includes('epic') || key.includes('épica')) counts.épica += 1
    else if (key.includes('rar')) counts.rara += 1
    else counts.común += 1
  }
  return counts
}
