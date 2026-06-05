import { albumTraceWarn } from './capturePipelineTrace'
import {
  getAlbumGlobalProgress,
  getArchivedEventCollectionGroups,
  getBonusCollectionGroups,
  getLiveEventCollectionGroups,
  getMainAlbumCollectionGroups,
} from './collectionModel'
import { getMainProgressState, getRevealedNormalFigures } from './figureGameRules'

const EMPTY_VIEW = {
  mainCollectionGroups: [],
  bonusCollectionGroups: [],
  liveEventCollectionGroups: [],
  archivedEventCollectionGroups: [],
  globalProgress: null,
  mainProgress: { obtained: 0, total: 0, visibleTotal: 0, normalFigures: [] },
  mainFigures: [],
  flatAlbumFigures: [],
}

function sortAlbumFiguresForDisplay(figures) {
  return [...(Array.isArray(figures) ? figures : [])].sort((a, b) => {
    const sortA = Number(a.album_sort_order)
    const sortB = Number(b.album_sort_order)
    const hasSortA = Number.isFinite(sortA)
    const hasSortB = Number.isFinite(sortB)
    if (hasSortA && hasSortB && sortA !== sortB) return sortA - sortB
    if (hasSortA !== hasSortB) return hasSortA ? -1 : 1

    const slotA = Number(a.album_slot_number)
    const slotB = Number(b.album_slot_number)
    const hasSlotA = Number.isFinite(slotA)
    const hasSlotB = Number.isFinite(slotB)
    if (hasSlotA && hasSlotB && slotA !== slotB) return slotA - slotB
    if (hasSlotA !== hasSlotB) return hasSlotA ? -1 : 1

    const orderA = Number(a.unlock_order) || Number.MAX_SAFE_INTEGER
    const orderB = Number(b.unlock_order) || Number.MAX_SAFE_INTEGER
    if (orderA !== orderB) return orderA - orderB
    return String(a.id).localeCompare(String(b.id), 'es')
  })
}

function dedupeFiguresById(figures) {
  const seen = new Set()
  return (Array.isArray(figures) ? figures : []).filter((figure) => {
    if (figure?.id == null) return false
    const key = String(figure.id)
    if (seen.has(key)) {
      albumTraceWarn('duplicate figure id in slot grid', { figureId: key })
      return false
    }
    seen.add(key)
    return true
  })
}

function sanitizeGroups(groups) {
  return (Array.isArray(groups) ? groups : [])
    .map((group) => {
      if (!group?.collection?.id || !group?.progress?.collection) return null
      return {
        ...group,
        figures: dedupeFiguresById(group.figures),
      }
    })
    .filter((group) => group && group.figures.length > 0)
}

/**
 * Construye el view-model del álbum con fail-safe ante datos/registry inconsistentes post-unlock.
 */
export function buildAlbumViewModel(sanitizedFigures, availabilityOptions) {
  try {
    const mainProgress = getMainProgressState(sanitizedFigures)
    const mainFigures = getRevealedNormalFigures(sanitizedFigures)

    const revealedFigures = getRevealedNormalFigures(sanitizedFigures)

    return {
      mainProgress,
      mainFigures,
      flatAlbumFigures: dedupeFiguresById(sortAlbumFiguresForDisplay(revealedFigures)),
      mainCollectionGroups: sanitizeGroups(
        getMainAlbumCollectionGroups(sanitizedFigures, availabilityOptions),
      ),
      bonusCollectionGroups: sanitizeGroups(
        getBonusCollectionGroups(sanitizedFigures, availabilityOptions),
      ),
      liveEventCollectionGroups: sanitizeGroups(
        getLiveEventCollectionGroups(sanitizedFigures, availabilityOptions),
      ),
      archivedEventCollectionGroups: sanitizeGroups(
        getArchivedEventCollectionGroups(sanitizedFigures, availabilityOptions),
      ),
      globalProgress: getAlbumGlobalProgress(sanitizedFigures, availabilityOptions),
    }
  } catch (error) {
    albumTraceWarn('album selectors failed — empty fallback', {
      message: error?.message,
      stack: error?.stack,
    })
    return { ...EMPTY_VIEW }
  }
}
