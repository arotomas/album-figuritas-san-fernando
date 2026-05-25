/** Grace period before an ended event moves to archived (30 days). */
export const EVENT_ARCHIVED_GRACE_MS = 30 * 24 * 60 * 60 * 1000

export const EVENT_LIFECYCLE = {
  UPCOMING: 'upcoming',
  ACTIVE: 'active',
  ENDED: 'ended',
  ARCHIVED: 'archived',
}

export function resolveEventLifecycle(event, now = Date.now()) {
  if (!event) return null
  if (event.active === false) return EVENT_LIFECYCLE.ARCHIVED

  const starts = event.startsAt ? Date.parse(event.startsAt) : null
  const ends = event.endsAt ? Date.parse(event.endsAt) : null

  if (starts && now < starts) return EVENT_LIFECYCLE.UPCOMING
  if (ends && now > ends) {
    return now - ends <= EVENT_ARCHIVED_GRACE_MS
      ? EVENT_LIFECYCLE.ENDED
      : EVENT_LIFECYCLE.ARCHIVED
  }
  return EVENT_LIFECYCLE.ACTIVE
}

function isSameLocalDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isTonight(date, now = new Date()) {
  if (!date) return false
  const target = new Date(date)
  if (Number.isNaN(target.getTime())) return false
  if (isSameLocalDay(target, now)) return target.getHours() >= 18 || now.getHours() >= 18
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return isSameLocalDay(target, tomorrow) && target.getHours() <= 6
}

function isThisWeekend(date, now = new Date()) {
  if (!date) return false
  const target = new Date(date)
  if (Number.isNaN(target.getTime())) return false
  const day = now.getDay()
  const daysUntilSaturday = day === 6 ? 0 : day === 0 ? 0 : 6 - day
  const saturday = new Date(now)
  saturday.setDate(now.getDate() + daysUntilSaturday)
  saturday.setHours(0, 0, 0, 0)
  const sunday = new Date(saturday)
  sunday.setDate(saturday.getDate() + 1)
  sunday.setHours(23, 59, 59, 999)
  return target >= saturday && target <= sunday
}

function daysUntil(date, now = Date.now()) {
  if (!date) return null
  const target = Date.parse(date)
  if (!Number.isFinite(target)) return null
  return Math.ceil((target - now) / (24 * 60 * 60 * 1000))
}

export function getEventCountdownLabel(event, { now = Date.now() } = {}) {
  if (!event) return null

  const lifecycle = resolveEventLifecycle(event, now)
  const nowDate = new Date(now)
  const starts = event.startsAt ? new Date(event.startsAt) : null
  const ends = event.endsAt ? new Date(event.endsAt) : null

  if (lifecycle === EVENT_LIFECYCLE.ARCHIVED) {
    return 'Evento archivado'
  }

  if (lifecycle === EVENT_LIFECYCLE.ENDED) {
    return 'Finalizó recientemente'
  }

  if (lifecycle === EVENT_LIFECYCLE.UPCOMING) {
    if (starts && isTonight(starts, nowDate)) return 'Comienza esta noche'
    if (starts && isThisWeekend(starts, nowDate)) return 'Disponible este fin de semana'
    const days = daysUntil(event.startsAt, now)
    if (days != null && days <= 7 && days > 1) return `Comienza en ${days} días`
    if (days === 1) return 'Comienza mañana'
    return 'Próximamente'
  }

  if (lifecycle === EVENT_LIFECYCLE.ACTIVE) {
    if (ends && isSameLocalDay(ends, nowDate)) return 'Termina hoy'
    const days = daysUntil(event.endsAt, now)
    if (days != null && days <= 7 && days > 1) return `Termina en ${days} días`
    if (days === 1) return 'Termina mañana'
    return 'Evento activo'
  }

  return null
}

export function isEventLifecyclePast(lifecycle) {
  return lifecycle === EVENT_LIFECYCLE.ENDED || lifecycle === EVENT_LIFECYCLE.ARCHIVED
}

export function isEventLifecycleCurrent(lifecycle) {
  return lifecycle === EVENT_LIFECYCLE.UPCOMING || lifecycle === EVENT_LIFECYCLE.ACTIVE
}
