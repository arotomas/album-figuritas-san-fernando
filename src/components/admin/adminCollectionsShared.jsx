import {
  COLLECTION_TRACK,
  COLLECTION_VISIBILITY,
  COLLECTION_EDITION,
} from '../../config/albumCollections'
import {
  buildAvailabilityContext,
  getCollectionAvailabilityBadgeClass,
  getCollectionAvailabilityLabel,
  resolveCollectionAvailability,
  UNLOCK_CONDITION,
} from '../../utils/collectionAvailability'

export const UNLOCK_CONDITION_OPTIONS = [
  { value: UNLOCK_CONDITION.ALWAYS, label: 'Siempre' },
  { value: UNLOCK_CONDITION.NIGHT_ONLY, label: 'Solo de noche' },
  { value: UNLOCK_CONDITION.WEEKEND_ONLY, label: 'Solo fin de semana' },
]

export const COLLECTION_TRACK_OPTIONS = [
  { value: COLLECTION_TRACK.MAIN, label: 'Principal' },
  { value: COLLECTION_TRACK.BONUS, label: 'Bonus' },
  { value: COLLECTION_TRACK.EVENT, label: 'Evento' },
]

export const COLLECTION_VISIBILITY_OPTIONS = [
  { value: COLLECTION_VISIBILITY.PUBLIC, label: 'Pública' },
  { value: COLLECTION_VISIBILITY.HIDDEN, label: 'Oculta (estricta)' },
  { value: COLLECTION_VISIBILITY.CONDITIONAL, label: 'Descubierta al revelar' },
]

export const COLLECTION_EDITION_OPTIONS = [
  { value: COLLECTION_EDITION.STANDARD, label: 'Estándar' },
  { value: COLLECTION_EDITION.LIMITED, label: 'Limitada' },
  { value: COLLECTION_EDITION.SEASONAL, label: 'Estacional' },
  { value: COLLECTION_EDITION.EVENT, label: 'Evento' },
]

export const DEFAULT_COLLECTION_FORM = {
  id: '',
  slug: '',
  label: '',
  description: '',
  icon: '📍',
  cover_image: '',
  page: '',
  sort_order: 100,
  track: COLLECTION_TRACK.MAIN,
  visibility: COLLECTION_VISIBILITY.PUBLIC,
  edition: COLLECTION_EDITION.STANDARD,
  event_id: '',
  available_from: '',
  available_until: '',
  hidden_until_discovered: false,
  unlock_condition: '',
  active: true,
}

function toDatetimeLocalValue(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function toCollectionForm(collection) {
  if (!collection) return DEFAULT_COLLECTION_FORM

  return {
    id: collection.id ?? '',
    slug: collection.slug ?? collection.id ?? '',
    label: collection.label ?? '',
    description: collection.description ?? '',
    icon: collection.icon ?? '📍',
    cover_image: collection.coverImage ?? collection.cover_image ?? '',
    page: collection.page ?? '',
    sort_order: collection.sortOrder ?? collection.sort_order ?? 100,
    track: collection.track ?? COLLECTION_TRACK.MAIN,
    visibility: collection.visibility ?? COLLECTION_VISIBILITY.PUBLIC,
    edition: collection.edition ?? COLLECTION_EDITION.STANDARD,
    event_id: collection.eventId ?? collection.event_id ?? '',
    available_from: toDatetimeLocalValue(collection.availableFrom ?? collection.available_from),
    available_until: toDatetimeLocalValue(collection.availableUntil ?? collection.available_until),
    hidden_until_discovered: Boolean(collection.hiddenUntilDiscovered ?? collection.hidden_until_discovered),
    unlock_condition: collection.unlockCondition ?? collection.unlock_condition ?? '',
    active: collection.active !== false,
  }
}

export function validateCollectionForm(form, { isEdit = false } = {}) {
  if (!form.label.trim()) return 'El nombre es obligatorio.'
  if (!isEdit && !form.id.trim()) return 'El ID es obligatorio.'
  if (!form.slug.trim()) return 'El slug es obligatorio.'
  if (!/^[a-z0-9-]+$/.test(form.slug.trim())) {
    return 'El slug solo puede contener minúsculas, números y guiones.'
  }
  if (form.page !== '' && form.page != null) {
    const page = Number(form.page)
    if (!Number.isFinite(page) || page < 1) return 'La página no es válida.'
  }
  if (form.available_from && form.available_until) {
    const starts = Date.parse(form.available_from)
    const ends = Date.parse(form.available_until)
    if (Number.isFinite(starts) && Number.isFinite(ends) && ends < starts) {
      return 'La fecha de fin no puede ser anterior al inicio.'
    }
  }
  return null
}

export function buildCollectionId(label) {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42) || 'coleccion'
}

export function getCollectionAdminPreview(collection, { assumeDiscovered = false } = {}) {
  const context = buildAvailabilityContext({
    discoveredCollectionIds: assumeDiscovered ? [collection.id] : [],
    debugReveal: false,
  })
  const availability = resolveCollectionAvailability(collection, context)
  return {
    availability,
    label: getCollectionAvailabilityLabel(availability),
    badgeClass: getCollectionAvailabilityBadgeClass(availability),
  }
}

export function getCollectionVisibilityBadgeClass(collection) {
  if (collection.visibility === COLLECTION_VISIBILITY.HIDDEN) {
    return collection.hiddenUntilDiscovered
      ? 'bg-amber-100 text-amber-800'
      : 'bg-slate-200 text-slate-700'
  }
  if (collection.visibility === COLLECTION_VISIBILITY.CONDITIONAL) {
    return 'bg-violet-100 text-violet-800'
  }
  if (collection.track === COLLECTION_TRACK.EVENT || collection.edition === COLLECTION_EDITION.EVENT) {
    return 'bg-sky-100 text-sky-800'
  }
  return 'bg-slate-100 text-slate-600'
}
