/**
 * Logs temporales DEV/QA — mapa vs availability vs GPS.
 * Activación: DEV, ?qa=1, ?debugUniverse=1 (vía qaCore).
 */
import { isUniverseDiagnosticsEnabled } from '../qa/qaCore'
import { getCollectionList } from './collectionRegistry'
import { buildAvailabilityContext, resolveCollectionAvailability } from './collectionAvailability'
import { getEventList } from './eventRegistry'
import { resolveEventLifecycle } from './eventLifecycle'
import {
  getMainAlbumCollectionGroups,
  getLiveEventCollectionGroups,
  getArchivedEventCollectionGroups,
  getBonusCollectionGroups,
} from './collectionModel'
import { getPlayerMapFigures, getRevealedNormalFigures } from './figureGameRules'

function emit(label, payload) {
  if (!isUniverseDiagnosticsEnabled()) return
  console.info(`[universe-diag] ${label}`, payload)
}

/** Mapa — pipeline independiente de availability. */
export function logMapFigurePipeline({
  figures,
  visiblePlayerFigures,
  mapFigures,
  proximityFigures,
  discoveredBonusIds,
}) {
  if (!isUniverseDiagnosticsEnabled()) return

  const stored = Array.isArray(figures) ? figures : []
  const playerVisible = getPlayerMapFigures(stored, discoveredBonusIds ?? new Set())
  const revealedNormal = getRevealedNormalFigures(stored)

  emit('map-pipeline', {
    storedTotal: stored.length,
    storedActive: stored.filter((f) => f.active !== false).length,
    revealedNormalCount: revealedNormal.length,
    playerMapRulesCount: playerVisible.length,
    visiblePlayerFiguresCount: visiblePlayerFigures?.length ?? 0,
    mapFiguresCount: mapFigures?.length ?? 0,
    proximityFiguresCount: proximityFigures?.length ?? 0,
    note: 'MapScreen NO usa collectionAvailability — solo figureGameRules',
    sampleIds: {
      stored: stored.slice(0, 5).map((f) => f.id),
      onMap: (mapFigures ?? []).slice(0, 5).map((f) => f.id),
    },
  })
}

/** Álbum — availability + discovery. */
export function logAlbumAvailabilitySnapshot(figures, availabilityOptions = {}) {
  if (!isUniverseDiagnosticsEnabled()) return

  const context = buildAvailabilityContext(availabilityOptions)
  const collections = getCollectionList()

  const collectionReport = collections.map((collection) => {
    const availability = resolveCollectionAvailability(collection, context)
    return {
      id: collection.id,
      track: collection.track,
      eventId: collection.eventId ?? null,
      visible: availability.visible,
      reason: availability.reason,
      lifecycle: availability.lifecycle ?? availability.timeWindow?.lifecycle ?? null,
      unlockCondition: collection.unlockCondition ?? null,
    }
  })

  const mainGroups = getMainAlbumCollectionGroups(figures, availabilityOptions)
  const bonusGroups = getBonusCollectionGroups(figures, availabilityOptions)
  const liveEvents = getLiveEventCollectionGroups(figures, availabilityOptions)
  const archivedEvents = getArchivedEventCollectionGroups(figures, availabilityOptions)

  emit('album-availability', {
    figuresTotal: (figures ?? []).length,
    collectionsInRegistry: collections.length,
    visibleCollections: collectionReport.filter((c) => c.visible).length,
    hiddenCollections: collectionReport.filter((c) => !c.visible).length,
    mainGroupsRendered: mainGroups.length,
    bonusGroupsRendered: bonusGroups.length,
    liveEventGroups: liveEvents.length,
    archivedEventGroups: archivedEvents.length,
    discoveredCollectionIds: context.discoveredCollectionIds,
    activeEventIds: context.activeEventIds,
    debugReveal: context.debugReveal,
    collections: collectionReport,
  })
}

/** Bootstrap — collections + events fetch. */
export function logUniverseBootstrap({ collectionsMeta, eventsMeta } = {}) {
  if (!isUniverseDiagnosticsEnabled()) return

  const events = getEventList()
  emit('bootstrap', {
    collectionsMeta,
    eventsMeta,
    eventsLoaded: events.length,
    eventLifecycles: events.map((event) => ({
      id: event.id,
      lifecycle: resolveEventLifecycle(event),
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      active: event.active,
    })),
  })
}

/** GPS snapshot — complementa gpsLog existente. */
export function logGpsSnapshot(payload) {
  if (!isUniverseDiagnosticsEnabled()) return

  emit('gps-state', {
    ...payload,
    note: '"Buscando ubicación" viene de useGeolocation/gps.js — NO de availability',
  })
}

/** Eventos — resumen rápido para launcher QA. */
export function logUniverseEventsSnapshot() {
  if (!isUniverseDiagnosticsEnabled()) return

  const events = getEventList()
  emit('events', {
    count: events.length,
    events: events.map((event) => ({
      id: event.id,
      label: event.label ?? event.title ?? event.id,
      lifecycle: resolveEventLifecycle(event),
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      active: event.active,
    })),
  })
}
