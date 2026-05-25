import {
  COLLECTION_STATUS,
  COLLECTION_TRACK,
  FIGURE_COLLECTION_OVERRIDES,
} from '../config/albumCollections'
import {
  getCollectionById,
  getCollectionList,
  isKnownCollectionId,
} from './collectionRegistry'
import {
  buildAvailabilityContext,
  isCollectionVisible,
  isCollectionVisibleInArchivedEvents,
  isCollectionVisibleInLiveEvents,
  requiresCollectionDiscovery,
  resolveCollectionAvailability,
} from './collectionAvailability'
import { getEventById } from './eventRegistry'
import { getEventCountdownLabel, resolveEventLifecycle } from './eventLifecycle'
import { getBonusFigures, getMainProgressState, getRevealedNormalFigures, isBonusFigure } from './figureGameRules'

export function resolveFigureCollectionId(figure) {
  if (!figure) return 'otros'

  const explicit = figure.collection_id ?? figure.collectionId
  if (explicit && isKnownCollectionId(explicit)) return explicit

  if (!explicit) {
    const slug = String(figure.slug ?? figure.id ?? '').trim().toLowerCase()
    if (slug && FIGURE_COLLECTION_OVERRIDES[slug]) {
      return FIGURE_COLLECTION_OVERRIDES[slug]
    }
  }

  if (isBonusFigure(figure)) return 'secretos'

  return 'otros'
}

export function inferDiscoveredCollectionIds(figures, existingIds = []) {
  const discovered = new Set((Array.isArray(existingIds) ? existingIds : []).map(String))
  const list = Array.isArray(figures) ? figures : []

  for (const figure of list) {
    if (!figure?.obtenida) continue
    const collectionId = String(resolveFigureCollectionId(figure))
    const collection = getCollectionById(collectionId)
    if (requiresCollectionDiscovery(collection)) {
      discovered.add(collectionId)
    }
  }

  return [...discovered]
}

export function enrichFigureWithCollection(figure) {
  if (!figure) return figure

  const collectionId = resolveFigureCollectionId(figure)
  const collection = getCollectionById(collectionId)

  return {
    ...figure,
    collection_id: collectionId,
    collection,
    category: figure.category ?? null,
    page: figure.page ?? collection.page ?? null,
    event_id: figure.event_id ?? figure.eventId ?? null,
  }
}

export function enrichFiguresWithCollections(figures) {
  return (Array.isArray(figures) ? figures : []).map(enrichFigureWithCollection)
}

function getCollectionStatus(obtained, total) {
  if (total <= 0) return COLLECTION_STATUS.INCOMPLETE
  if (obtained >= total) return COLLECTION_STATUS.COMPLETED
  if (obtained >= total - 1 || obtained / total >= 0.7) {
    return COLLECTION_STATUS.ALMOST_COMPLETE
  }
  if (obtained >= 2 || obtained / total >= 0.4) {
    return COLLECTION_STATUS.ADVANCED
  }
  return COLLECTION_STATUS.INCOMPLETE
}

export function getCollectionProgressState(figures, collectionId) {
  const collection = getCollectionById(collectionId)
  const scoped = (Array.isArray(figures) ? figures : []).filter(
    (figure) => resolveFigureCollectionId(figure) === collectionId,
  )
  const obtained = scoped.filter((figure) => figure.obtenida).length
  const total = scoped.length
  const ratio = total > 0 ? obtained / total : 0

  return {
    collection,
    collectionId,
    figures: scoped,
    obtained,
    total,
    ratio,
    percent: Math.round(ratio * 100),
    status: getCollectionStatus(obtained, total),
    completed: obtained >= total && total > 0,
  }
}

function resolveAvailabilityContext(availabilityOptions = {}) {
  if (availabilityOptions.context) return availabilityOptions.context
  return buildAvailabilityContext(availabilityOptions)
}

export function groupFiguresByCollection(figures, { track = COLLECTION_TRACK.MAIN } = {}) {
  const enriched = enrichFiguresWithCollections(figures)
  const trackCollections = getCollectionList({ track })

  return trackCollections
    .map((collection) => {
      const items = enriched.filter(
        (figure) => resolveFigureCollectionId(figure) === collection.id,
      )
      if (items.length === 0) return null

      return {
        collection,
        figures: items,
        progress: getCollectionProgressState(enriched, collection.id),
      }
    })
    .filter(Boolean)
}

export function getVisibleCollectionGroups(figures, availabilityOptions = {}) {
  const context = resolveAvailabilityContext(availabilityOptions)
  const { track = COLLECTION_TRACK.MAIN } = availabilityOptions

  return groupFiguresByCollection(figures, { track }).filter(({ collection }) =>
    isCollectionVisible(collection, context),
  )
}

export function getMainAlbumCollectionGroups(figures, availabilityOptions = {}) {
  const revealed = getRevealedNormalFigures(figures)
  return getVisibleCollectionGroups(revealed, {
    ...availabilityOptions,
    track: COLLECTION_TRACK.MAIN,
  })
}

export function getBonusCollectionGroups(figures, availabilityOptions = {}) {
  const bonus = getBonusFigures(figures)
  return getVisibleCollectionGroups(bonus, {
    ...availabilityOptions,
    track: COLLECTION_TRACK.BONUS,
  })
}

export function getEventCollectionGroups(figures, availabilityOptions = {}) {
  return getVisibleCollectionGroups(figures, {
    ...availabilityOptions,
    track: COLLECTION_TRACK.EVENT,
  })
}

function enrichEventGroup(group, context) {
  const event = group.collection?.eventId ? getEventById(group.collection.eventId) : null
  const availability = resolveCollectionAvailability(group.collection, context)
  const lifecycle =
    availability.lifecycle ??
    availability.timeWindow?.lifecycle ??
    (event ? resolveEventLifecycle(event, context.now) : null)

  return {
    ...group,
    event,
    availability,
    lifecycle,
    countdownLabel: getEventCountdownLabel(event, { now: context.now }),
  }
}

export function getLiveEventCollectionGroups(figures, availabilityOptions = {}) {
  const context = resolveAvailabilityContext(availabilityOptions)
  const enriched = enrichFiguresWithCollections(figures)

  return getCollectionList({ track: COLLECTION_TRACK.EVENT })
    .map((collection) => {
      if (!isCollectionVisibleInLiveEvents(collection, context)) return null

      const items = enriched.filter(
        (figure) => resolveFigureCollectionId(figure) === collection.id,
      )
      if (items.length === 0) return null

      const group = {
        collection,
        figures: items,
        progress: getCollectionProgressState(enriched, collection.id),
      }
      return enrichEventGroup(group, context)
    })
    .filter(Boolean)
}

export function getArchivedEventCollectionGroups(figures, availabilityOptions = {}) {
  const context = resolveAvailabilityContext(availabilityOptions)
  const enriched = enrichFiguresWithCollections(figures)

  return getCollectionList({ track: COLLECTION_TRACK.EVENT })
    .map((collection) => {
      if (!isCollectionVisibleInArchivedEvents(collection, context)) return null

      const items = enriched.filter(
        (figure) => resolveFigureCollectionId(figure) === collection.id,
      )
      if (items.length === 0) return null

      const group = {
        collection,
        figures: items,
        progress: getCollectionProgressState(enriched, collection.id),
      }
      return enrichEventGroup(group, context)
    })
    .filter(Boolean)
}

export function getAllCollectionProgress(
  figures,
  { track = COLLECTION_TRACK.MAIN, ...availabilityOptions } = {},
) {
  const context = resolveAvailabilityContext(availabilityOptions)
  const trackCollections = getCollectionList({ track })

  return trackCollections
    .map((collection) => getCollectionProgressState(figures, collection.id))
    .filter(
      (progress) =>
        progress.total > 0 && isCollectionVisible(progress.collection, context),
    )
}

export function isFigureInActiveEvent(figure, now = Date.now()) {
  if (!figure?.event_id) return true
  const starts = figure.event_starts_at ? Date.parse(figure.event_starts_at) : null
  const ends = figure.event_ends_at ? Date.parse(figure.event_ends_at) : null
  if (starts && now < starts) return false
  if (ends && now > ends) return false
  return true
}

/** @deprecated Usar resolveCollectionAvailability + isCollectionVisible. */
export function isFigureCollectionHidden(figure, availabilityOptions = {}) {
  const collection = getCollectionById(resolveFigureCollectionId(figure))
  const context = resolveAvailabilityContext(availabilityOptions)
  return !isCollectionVisible(collection, context)
}

export function getAlbumGlobalProgress(figures, availabilityOptions = {}) {
  const mainProgress = getMainProgressState(figures)
  const collectionProgress = getAllCollectionProgress(figures, {
    ...availabilityOptions,
    track: COLLECTION_TRACK.MAIN,
  })
  const completedCollections = collectionProgress.filter((progress) => progress.completed)
  const activeCollections = collectionProgress.filter(
    (progress) => !progress.completed && progress.total > 0,
  )

  const mostAdvanced =
    [...activeCollections]
      .filter((progress) => progress.obtained > 0)
      .sort((a, b) => b.ratio - a.ratio || b.obtained - a.obtained)[0] ?? null

  const nextToComplete =
    [...activeCollections]
      .sort((a, b) => {
        const score = (progress) =>
          progress.ratio +
          (progress.status === COLLECTION_STATUS.ALMOST_COMPLETE ? 0.35 : 0) +
          (progress.status === COLLECTION_STATUS.ADVANCED ? 0.1 : 0) -
          progress.obtained / Math.max(progress.total, 1) * 0.05
        return score(b) - score(a)
      })[0] ?? null

  const percentComplete =
    mainProgress.total > 0
      ? Math.round((mainProgress.obtained / mainProgress.total) * 100)
      : 0

  return {
    percentComplete,
    obtained: mainProgress.obtained,
    total: mainProgress.total,
    completedCollectionCount: completedCollections.length,
    totalCollectionCount: collectionProgress.length,
    mostAdvanced,
    nextToComplete,
    collectionProgress,
  }
}

export function detectCollectionCompletionTransition(figures, figureId) {
  if (!figureId) return null

  const figure = (Array.isArray(figures) ? figures : []).find(
    (item) => String(item.id) === String(figureId),
  )
  if (!figure?.obtenida) return null

  const collectionId = resolveFigureCollectionId(figure)
  const after = getCollectionProgressState(figures, collectionId)
  if (!after.completed) return null

  const beforeFigures = figures.map((item) =>
    String(item.id) === String(figureId) ? { ...item, obtenida: false } : item,
  )
  const before = getCollectionProgressState(beforeFigures, collectionId)
  if (before.completed) return null

  return after
}

export function detectCollectionDiscoveryTransition(figures, figureId, discoveredCollectionIds = []) {
  if (!figureId) return null

  const figure = (Array.isArray(figures) ? figures : []).find(
    (item) => String(item.id) === String(figureId),
  )
  if (!figure?.obtenida) return null

  const collectionId = String(resolveFigureCollectionId(figure))
  const collection = getCollectionById(collectionId)
  if (!requiresCollectionDiscovery(collection)) return null
  if (!(discoveredCollectionIds ?? []).map(String).includes(collectionId)) return null

  const progress = getCollectionProgressState(figures, collectionId)
  if (progress.obtained !== 1) return null

  return { collection, collectionId, progress }
}

/** @deprecated Usar resolveCollectionAvailability / isCollectionVisible. */
export function isCollectionAvailable(collection, options = {}) {
  const context = resolveAvailabilityContext(options)
  return isCollectionVisible(collection, context)
}
