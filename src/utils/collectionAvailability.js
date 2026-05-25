import { COLLECTION_VISIBILITY } from '../config/albumCollections'

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

export function evaluateUnlockCondition(condition, now = new Date()) {
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
  return true
}

export function buildUnlockContext(now = new Date()) {
  return {
    always: true,
    [UNLOCK_CONDITION.ALWAYS]: true,
    [UNLOCK_CONDITION.NIGHT_ONLY]: evaluateUnlockCondition(UNLOCK_CONDITION.NIGHT_ONLY, now),
    [UNLOCK_CONDITION.WEEKEND_ONLY]: evaluateUnlockCondition(
      UNLOCK_CONDITION.WEEKEND_ONLY,
      now,
    ),
  }
}

export function buildAvailabilityContext({
  discoveredCollectionIds = [],
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
    ...buildUnlockContext(nowDate),
  }
}

export function resolveCollectionAvailability(collection, context = buildAvailabilityContext()) {
  if (!collection) {
    return { visible: false, reason: COLLECTION_AVAILABILITY_REASON.HIDDEN, collection: null }
  }

  if (context.debugReveal) {
    return {
      visible: true,
      reason: COLLECTION_AVAILABILITY_REASON.DEBUG,
      collection,
    }
  }

  if (collection.active === false) {
    return {
      visible: false,
      reason: COLLECTION_AVAILABILITY_REASON.INACTIVE,
      collection,
    }
  }

  if (collection.availableFrom && context.now < Date.parse(collection.availableFrom)) {
    return {
      visible: false,
      reason: COLLECTION_AVAILABILITY_REASON.BEFORE_WINDOW,
      collection,
      startsAt: collection.availableFrom,
    }
  }

  if (collection.availableUntil && context.now > Date.parse(collection.availableUntil)) {
    return {
      visible: false,
      reason: COLLECTION_AVAILABILITY_REASON.AFTER_WINDOW,
      collection,
      endsAt: collection.availableUntil,
    }
  }

  const unlockCondition = collection.unlockCondition ?? UNLOCK_CONDITION.ALWAYS
  if (
    unlockCondition &&
    unlockCondition !== UNLOCK_CONDITION.ALWAYS &&
    !context[unlockCondition]
  ) {
    return {
      visible: false,
      reason: COLLECTION_AVAILABILITY_REASON.UNLOCK_BLOCKED,
      collection,
      unlockCondition,
    }
  }

  const collectionId = String(collection.id)

  if (isStrictHiddenCollection(collection)) {
    return {
      visible: false,
      reason: COLLECTION_AVAILABILITY_REASON.HIDDEN,
      collection,
    }
  }

  if (requiresCollectionDiscovery(collection)) {
    const discovered = context.discoveredSet?.has(collectionId) ?? false
    if (discovered) {
      return {
        visible: true,
        reason: COLLECTION_AVAILABILITY_REASON.DISCOVERED,
        collection,
      }
    }
    return {
      visible: false,
      reason: COLLECTION_AVAILABILITY_REASON.NOT_DISCOVERED,
      collection,
    }
  }

  return {
    visible: true,
    reason: COLLECTION_AVAILABILITY_REASON.PUBLIC,
    collection,
  }
}

export function isCollectionVisible(collection, context) {
  return resolveCollectionAvailability(collection, context).visible
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
