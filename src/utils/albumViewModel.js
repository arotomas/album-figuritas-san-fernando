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

    return {
      mainProgress,
      mainFigures,
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
