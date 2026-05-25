import {
  COLLECTION_EDITION,
  COLLECTION_VISIBILITY,
} from '../../config/albumCollections'
import {
  buildAvailabilityContext,
  getCollectionAvailabilityBadgeClass,
  getCollectionAvailabilityLabel,
  resolveCollectionAvailability,
} from '../../utils/collectionAvailability'
import { getEventCountdownLabel, resolveEventLifecycle } from '../../utils/eventLifecycle'

export const EVENT_AMBIENCE_OPTIONS = [
  { value: '', label: 'Ninguna' },
  { value: 'night', label: 'Noche' },
  { value: 'weekend', label: 'Fin de semana' },
  { value: 'seasonal', label: 'Estacional' },
  { value: 'celebration', label: 'Celebración' },
]

export const EVENT_VISIBILITY_OPTIONS = [
  { value: COLLECTION_VISIBILITY.PUBLIC, label: 'Pública' },
  { value: COLLECTION_VISIBILITY.HIDDEN, label: 'Oculta' },
  { value: COLLECTION_VISIBILITY.CONDITIONAL, label: 'Condicional' },
]

export const EVENT_EDITION_OPTIONS = [
  { value: COLLECTION_EDITION.EVENT, label: 'Evento' },
  { value: COLLECTION_EDITION.SEASONAL, label: 'Estacional' },
  { value: COLLECTION_EDITION.LIMITED, label: 'Limitada' },
  { value: COLLECTION_EDITION.STANDARD, label: 'Estándar' },
]

export const DEFAULT_EVENT_FORM = {
  id: '',
  slug: '',
  label: '',
  description: '',
  cover_image: '',
  badge: '',
  ambience: '',
  starts_at: '',
  ends_at: '',
  active: true,
  edition: COLLECTION_EDITION.EVENT,
  visibility: COLLECTION_VISIBILITY.PUBLIC,
}

function toDatetimeLocalValue(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function toEventForm(event) {
  if (!event) return DEFAULT_EVENT_FORM

  return {
    id: event.id ?? '',
    slug: event.slug ?? event.id ?? '',
    label: event.label ?? '',
    description: event.description ?? '',
    cover_image: event.coverImage ?? event.cover_image ?? '',
    badge: event.badge ?? '',
    ambience: event.ambience ?? '',
    starts_at: toDatetimeLocalValue(event.startsAt ?? event.starts_at),
    ends_at: toDatetimeLocalValue(event.endsAt ?? event.ends_at),
    active: event.active !== false,
    edition: event.edition ?? COLLECTION_EDITION.EVENT,
    visibility: event.visibility ?? COLLECTION_VISIBILITY.PUBLIC,
  }
}

export function validateEventForm(form, { isEdit = false } = {}) {
  if (!form.label.trim()) return 'El nombre es obligatorio.'
  if (!isEdit && !form.id.trim()) return 'El ID es obligatorio.'
  if (!form.slug.trim()) return 'El slug es obligatorio.'
  if (!/^[a-z0-9-]+$/.test(form.slug.trim())) {
    return 'El slug solo puede contener minúsculas, números y guiones.'
  }
  if (form.starts_at && form.ends_at) {
    const starts = Date.parse(form.starts_at)
    const ends = Date.parse(form.ends_at)
    if (Number.isFinite(starts) && Number.isFinite(ends) && ends < starts) {
      return 'La fecha de fin no puede ser anterior al inicio.'
    }
  }
  return null
}

export function buildEventId(label) {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42) || 'evento'
}

export function getEventAdminPreview(event) {
  const lifecycle = resolveEventLifecycle(event)
  const countdownLabel = getEventCountdownLabel(event)
  const context = buildAvailabilityContext({ activeEventIds: [] })

  return {
    lifecycle,
    countdownLabel,
    lifecycleLabel:
      lifecycle === 'active'
        ? 'Activo'
        : lifecycle === 'upcoming'
          ? 'Próximo'
          : lifecycle === 'ended'
            ? 'Finalizado'
            : lifecycle === 'archived'
              ? 'Archivado'
              : '—',
    badgeClass:
      lifecycle === 'active'
        ? 'bg-progress/15 text-progress'
        : lifecycle === 'upcoming'
          ? 'bg-amber-100 text-amber-800'
          : 'bg-slate-200 text-slate-700',
    availability: resolveCollectionAvailability(
      {
        id: 'preview',
        eventId: event.id,
        active: event.active !== false,
        visibility: COLLECTION_VISIBILITY.PUBLIC,
      },
      context,
    ),
    playerLabel: getCollectionAvailabilityLabel(
      resolveCollectionAvailability(
        {
          id: 'preview',
          eventId: event.id,
          active: event.active !== false,
          visibility: COLLECTION_VISIBILITY.PUBLIC,
        },
        context,
      ),
    ),
    playerBadgeClass: getCollectionAvailabilityBadgeClass(
      resolveCollectionAvailability(
        {
          id: 'preview',
          eventId: event.id,
          active: event.active !== false,
          visibility: COLLECTION_VISIBILITY.PUBLIC,
        },
        context,
      ),
    ),
  }
}

export function getEventSelectOptions(events) {
  return (Array.isArray(events) ? events : []).map((event) => ({
    value: event.id,
    label: `${event.label} (${event.id})`,
  }))
}
