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
import { getBonusFigures, getMainProgressState, getRevealedNormalFigures, isBonusFigure } from './figureGameRules'

export function resolveFigureCollectionId(figure) {
  if (!figure) return 'otros'

  const explicit = figure.collection_id ?? figure.collectionId
  if (explicit && isKnownCollectionId(explicit)) return explicit

  // Legacy slug overrides — solo si la figurita no tiene collection_id en DB
  if (!explicit) {
    const slug = String(figure.slug ?? figure.id ?? '').trim().toLowerCase()
    if (slug && FIGURE_COLLECTION_OVERRIDES[slug]) {
      return FIGURE_COLLECTION_OVERRIDES[slug]
    }
  }

  if (isBonusFigure(figure)) return 'secretos'

  return 'otros'
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

export function groupFiguresByCollection(figures, { track = COLLECTION_TRACK.MAIN } = {}) {
  const enriched = enrichFiguresWithCollections(figures)
  const trackCollections = getCollectionList({ track })

  const groups = trackCollections
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

  return groups
}

export function getMainAlbumCollectionGroups(figures) {
  const revealed = getRevealedNormalFigures(figures)
  return groupFiguresByCollection(revealed, { track: COLLECTION_TRACK.MAIN })
}

export function getBonusCollectionGroups(figures) {
  const bonus = getBonusFigures(figures)
  return groupFiguresByCollection(bonus, { track: COLLECTION_TRACK.BONUS })
}

export function getAllCollectionProgress(figures, { track = COLLECTION_TRACK.MAIN } = {}) {
  const trackCollections = getCollectionList({ track })
  return trackCollections
    .map((collection) => getCollectionProgressState(figures, collection.id))
    .filter((progress) => progress.total > 0)
}

/** Prep futura: eventos temporales activos (sin lógica de unlock aún). */
export function isFigureInActiveEvent(figure, now = Date.now()) {
  if (!figure?.event_id) return true
  const starts = figure.event_starts_at ? Date.parse(figure.event_starts_at) : null
  const ends = figure.event_ends_at ? Date.parse(figure.event_ends_at) : null
  if (starts && now < starts) return false
  if (ends && now > ends) return false
  return true
}

export function isFigureCollectionHidden(figure) {
  const collection = getCollectionById(resolveFigureCollectionId(figure))
  return Boolean(collection.hiddenUntilDiscovered && figure.is_hidden && !figure.obtenida)
}

export function getAlbumGlobalProgress(figures) {
  const mainProgress = getMainProgressState(figures)
  const collectionProgress = getAllCollectionProgress(figures, { track: COLLECTION_TRACK.MAIN })
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

/** Prep futura — disponibilidad de colección (sin gameplay activo). */
export function isCollectionAvailable(collection, { now = Date.now(), context = {} } = {}) {
  if (!collection) return false
  if (collection.visibility === 'hidden') return Boolean(context.discovered)
  if (collection.availableFrom && now < Date.parse(collection.availableFrom)) return false
  if (collection.availableUntil && now > Date.parse(collection.availableUntil)) return false
  if (collection.unlockCondition && !context[collection.unlockCondition]) return false
  return true
}

export function getVisibleCollectionGroups(figures, options = {}) {
  return groupFiguresByCollection(figures, options).filter(({ collection }) =>
    isCollectionAvailable(collection, options),
  )
}
