import { COLLECTION_VISIBILITY } from '../config/albumCollections'
import { getEventById } from './eventRegistry'
import {
  EVENT_LIFECYCLE,
  isEventLifecycleCurrent,
  isEventLifecyclePast,
  resolveEventLifecycle,
} from './eventLifecycle'

export const COLLECTION_AVAILABILITY_REASON = {
  PUBLIC: 'public',
  DISCOVERED: 'discovered',
  HIDDEN: 'hidden',
  NOT_DISCOVERED: 'not-discovered',
  INACTIVE: 'inactive',
  BEFORE_WINDOW: 'before-window',
  AFTER_WINDOW: 'after-window',
  UNLOCK_BLOCKED: 'unlock-blocked',
  DEBUG: 'debug',
}

export const UNLOCK_CONDITION = {
  ALWAYS: 'always',
  NIGHT_ONLY: 'night_only',
  WEEKEND_ONLY: 'weekend_only',
  EVENT_ACTIVE: 'event_active',
}

/** conditional + hidden_until_discovered → “descubierta al revelar”. */
export function requiresCollectionDiscovery(collection) {
  if (!collection) return false
  if (collection.visibility === COLLECTION_VISIBILITY.CONDITIONAL) return true
  return Boolean(collection.hiddenUntilDiscovered)
}

/** hidden estricta — nunca visible salvo debug/admin. */
export function isStrictHiddenCollection(collection) {
  if (!collection) return true
  return (
    collection.visibility === COLLECTION_VISIBILITY.HIDDEN &&
    !collection.hiddenUntilDiscovered
  )
}

export function collectionHasExplicitTimeOverride(collection) {
  return Boolean(collection?.availableFrom || collection?.availableUntil)
}

/** Evento = source of truth temporal salvo override explícito en colección. */
export function resolveCollectionTimeWindow(collection, context = buildAvailabilityContext()) {
  const linkedEvent = collection?.eventId ? getEventById(collection.eventId) : null
  const hasOverride = collectionHasExplicitTimeOverride(collection)

  if (linkedEvent && !hasOverride) {
    return {
      source: 'event',
      event: linkedEvent,
      lifecycle: resolveEventLifecycle(linkedEvent, context.now),
      startsAt: linkedEvent.startsAt ?? null,
      endsAt: linkedEvent.endsAt ?? null,
      active: linkedEvent.active !== false,
    }
  }

  return {
    source: hasOverride ? 'collection-override' : linkedEvent ? 'collection' : 'none',
    event: linkedEvent,
    lifecycle: linkedEvent ? resolveEventLifecycle(linkedEvent, context.now) : null,
    startsAt: collection?.availableFrom ?? null,
    endsAt: collection?.availableUntil ?? null,
    active: collection?.active !== false,
  }
}

export function evaluateUnlockCondition(condition, now = new Date(), context = {}) {
  const key = String(condition ?? UNLOCK_CONDITION.ALWAYS).trim()
  if (!key || key === UNLOCK_CONDITION.ALWAYS) return true
  if (key === UNLOCK_CONDITION.NIGHT_ONLY) {
    const hour = now.getHours()
    return hour >= 20 || hour < 6
  }
  if (key === UNLOCK_CONDITION.WEEKEND_ONLY) {
    const day = now.getDay()
    return day === 0 || day === 6
  }
  if (key === UNLOCK_CONDITION.EVENT_ACTIVE) {
    const eventId = context.eventId ?? context.collectionEventId
    if (!eventId) return Boolean(context.activeEventSet?.size)
    return context.activeEventSet?.has(String(eventId)) ?? false
  }
  return Boolean(context[key])
}

export function buildUnlockContext(now = new Date(), activeEventIds = []) {
  const activeEventSet = new Set(activeEventIds.map(String))
  return {
    always: true,
    [UNLOCK_CONDITION.ALWAYS]: true,
    [UNLOCK_CONDITION.NIGHT_ONLY]: evaluateUnlockCondition(UNLOCK_CONDITION.NIGHT_ONLY, now),
    [UNLOCK_CONDITION.WEEKEND_ONLY]: evaluateUnlockCondition(
      UNLOCK_CONDITION.WEEKEND_ONLY,
      now,
    ),
    activeEventIds: [...activeEventSet],
    activeEventSet,
  }
}

export function buildAvailabilityContext({
  discoveredCollectionIds = [],
  activeEventIds = [],
  debugReveal = false,
  now = Date.now(),
} = {}) {
  const ids = discoveredCollectionIds.map(String)
  const nowDate = new Date(now)

  return {
    discoveredCollectionIds: ids,
    discoveredSet: new Set(ids),
    debugReveal: Boolean(debugReveal),
    now,
    nowDate,
    ...buildUnlockContext(nowDate, activeEventIds),
  }
}

export function resolveCollectionAvailability(collection, context = buildAvailabilityContext()) {
  if (!collection) {
    return { visible: false, reason: COLLECTION_AVAILABILITY_REASON.HIDDEN, collection: null }
  }

  const timeWindow = resolveCollectionTimeWindow(collection, context)
  const lifecycle = timeWindow.lifecycle

  if (context.debugReveal) {
    return {
      visible: true,
      reason: COLLECTION_AVAILABILITY_REASON.DEBUG,
      collection,
      timeWindow,
      lifecycle,
    }
  }

  if (timeWindow.active === false) {
    return {
      visible: false,
      reason: COLLECTION_AVAILABILITY_REASON.INACTIVE,
      collection,
      timeWindow,
      lifecycle,
      showArchived: Boolean(lifecycle && isEventLifecyclePast(lifecycle)),
    }
  }

  if (timeWindow.startsAt && context.now < Date.parse(timeWindow.startsAt)) {
    return {
      visible: false,
      reason: COLLECTION_AVAILABILITY_REASON.BEFORE_WINDOW,
      collection,
      timeWindow,
      lifecycle,
      startsAt: timeWindow.startsAt,
      showUpcoming: lifecycle === EVENT_LIFECYCLE.UPCOMING,
    }
  }

  if (timeWindow.endsAt && context.now > Date.parse(timeWindow.endsAt)) {
    return {
      visible: false,
      reason: COLLECTION_AVAILABILITY_REASON.AFTER_WINDOW,
      collection,
      timeWindow,
      lifecycle,
      endsAt: timeWindow.endsAt,
      showArchived: true,
    }
  }

  const unlockCondition = collection.unlockCondition ?? UNLOCK_CONDITION.ALWAYS
  if (
    unlockCondition &&
    unlockCondition !== UNLOCK_CONDITION.ALWAYS &&
    !evaluateUnlockCondition(unlockCondition, context.nowDate, {
      ...context,
      eventId: collection.eventId,
      collectionEventId: collection.eventId,
    })
  ) {
    return {
      visible: false,
      reason: COLLECTION_AVAILABILITY_REASON.UNLOCK_BLOCKED,
      collection,
      timeWindow,
      lifecycle,
      unlockCondition,
    }
  }

  const collectionId = String(collection.id)

  if (isStrictHiddenCollection(collection)) {
    return {
      visible: false,
      reason: COLLECTION_AVAILABILITY_REASON.HIDDEN,
      collection,
      timeWindow,
      lifecycle,
    }
  }

  if (requiresCollectionDiscovery(collection)) {
    const discovered = context.discoveredSet?.has(collectionId) ?? false
    if (discovered) {
      return {
        visible: true,
        reason: COLLECTION_AVAILABILITY_REASON.DISCOVERED,
        collection,
        timeWindow,
        lifecycle,
      }
    }
    return {
      visible: false,
      reason: COLLECTION_AVAILABILITY_REASON.NOT_DISCOVERED,
      collection,
      timeWindow,
      lifecycle,
    }
  }

  return {
    visible: true,
    reason: COLLECTION_AVAILABILITY_REASON.PUBLIC,
    collection,
    timeWindow,
    lifecycle,
  }
}

export function isCollectionVisible(collection, context) {
  return resolveCollectionAvailability(collection, context).visible
}

/** Visible en sección activa/próxima de eventos. */
export function isCollectionVisibleInLiveEvents(collection, context) {
  const availability = resolveCollectionAvailability(collection, context)
  if (availability.visible) return true
  if (availability.showUpcoming && availability.lifecycle === EVENT_LIFECYCLE.UPCOMING) {
    return true
  }
  return false
}

/** Visible en sección archivada de eventos. */
export function isCollectionVisibleInArchivedEvents(collection, context) {
  const availability = resolveCollectionAvailability(collection, context)
  if (!availability.showArchived) return false
  const lifecycle = availability.lifecycle ?? availability.timeWindow?.lifecycle
  return isEventLifecyclePast(lifecycle) || availability.reason === COLLECTION_AVAILABILITY_REASON.AFTER_WINDOW
}

export function isCollectionVisibleInCurrentEvents(collection, context) {
  const availability = resolveCollectionAvailability(collection, context)
  const lifecycle = availability.lifecycle ?? availability.timeWindow?.lifecycle
  return isEventLifecycleCurrent(lifecycle) || availability.visible
}

export function getCollectionAvailabilityLabel(availability) {
  switch (availability?.reason) {
    case COLLECTION_AVAILABILITY_REASON.PUBLIC:
      return 'Visible'
    case COLLECTION_AVAILABILITY_REASON.DISCOVERED:
      return 'Descubierta'
    case COLLECTION_AVAILABILITY_REASON.DEBUG:
      return 'Debug'
    case COLLECTION_AVAILABILITY_REASON.HIDDEN:
      return 'Oculta'
    case COLLECTION_AVAILABILITY_REASON.NOT_DISCOVERED:
      return 'Sin descubrir'
    case COLLECTION_AVAILABILITY_REASON.INACTIVE:
      return 'Inactiva'
    case COLLECTION_AVAILABILITY_REASON.BEFORE_WINDOW:
      return 'Próximamente'
    case COLLECTION_AVAILABILITY_REASON.AFTER_WINDOW:
      return 'Finalizada'
    case COLLECTION_AVAILABILITY_REASON.UNLOCK_BLOCKED:
      return 'Condición pendiente'
    default:
      return '—'
  }
}

export function getCollectionAvailabilityBadgeClass(availability) {
  switch (availability?.reason) {
    case COLLECTION_AVAILABILITY_REASON.PUBLIC:
    case COLLECTION_AVAILABILITY_REASON.DISCOVERED:
    case COLLECTION_AVAILABILITY_REASON.DEBUG:
      return 'bg-progress/15 text-progress'
    case COLLECTION_AVAILABILITY_REASON.NOT_DISCOVERED:
    case COLLECTION_AVAILABILITY_REASON.HIDDEN:
      return 'bg-slate-100 text-slate-600'
    case COLLECTION_AVAILABILITY_REASON.INACTIVE:
    case COLLECTION_AVAILABILITY_REASON.AFTER_WINDOW:
      return 'bg-slate-200 text-slate-700'
    case COLLECTION_AVAILABILITY_REASON.BEFORE_WINDOW:
      return 'bg-amber-100 text-amber-800'
    case COLLECTION_AVAILABILITY_REASON.UNLOCK_BLOCKED:
      return 'bg-violet-100 text-violet-800'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}
