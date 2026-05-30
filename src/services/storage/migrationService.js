import { STORAGE_VERSION } from '../../config/persistence'
import { computeAlbumStatus } from '../../store/albumUtils'
import { inferDiscoveredCollectionIds } from '../../utils/collectionModel'
import { persistLog } from '../../utils/persistLog'

/**
 * Normaliza el envelope de Zustand persist ({ state, version }) o estado plano.
 */
export function extractPersistedState(raw) {
  if (!raw || typeof raw !== 'object') return null
  if (raw.state && typeof raw.state === 'object' && !Array.isArray(raw.state)) {
    return raw.state
  }
  return raw
}

/**
 * Toma solo campos persistidos conocidos con defaults seguros.
 */
export function sanitizePersistedState(raw) {
  const source = extractPersistedState(raw)
  if (!source || typeof source !== 'object') return null

  const figures = Array.isArray(source.figures)
    ? source.figures.filter((figure) => figure && typeof figure === 'object')
    : []

  return {
    figures,
    albumStatus: typeof source.albumStatus === 'string' ? source.albumStatus : null,
    lastObtenidaFigureId:
      source.lastObtenidaFigureId != null ? source.lastObtenidaFigureId : null,
    lastViewedFigureId:
      source.lastViewedFigureId != null ? source.lastViewedFigureId : null,
    lastSavedAt: typeof source.lastSavedAt === 'number' ? source.lastSavedAt : null,
    celebratedCollectionIds: Array.isArray(source.celebratedCollectionIds)
      ? source.celebratedCollectionIds.filter((id) => typeof id === 'string')
      : [],
    discoveredCollectionIds: Array.isArray(source.discoveredCollectionIds)
      ? source.discoveredCollectionIds.filter((id) => typeof id === 'string')
      : [],
    acknowledgedDiscoveryCollectionIds: Array.isArray(source.acknowledgedDiscoveryCollectionIds)
      ? source.acknowledgedDiscoveryCollectionIds.filter((id) => typeof id === 'string')
      : [],
    activeTargetFigureId:
      source.activeTargetFigureId != null ? source.activeTargetFigureId : null,
    soundsEnabled:
      typeof source.soundsEnabled === 'boolean' ? source.soundsEnabled : null,
    musicEnabled:
      typeof source.musicEnabled === 'boolean' ? source.musicEnabled : null,
  }
}

/**
 * Extrae solo progreso por figurita desde storage — nunca reconstruye catálogo mock.
 */
export function extractPersistedFigureProgress(storedFigures) {
  return (Array.isArray(storedFigures) ? storedFigures : [])
    .filter((figure) => figure?.id != null)
    .map(({ id, slug, obtenida, foto, fotoSizeBytes, obtenidaEn, captureMeta }) => ({
      id: String(id),
      slug: slug ?? null,
      obtenida: Boolean(obtenida),
      foto: foto ?? null,
      fotoSizeBytes: fotoSizeBytes ?? null,
      obtenidaEn: obtenidaEn ?? null,
      captureMeta: captureMeta ?? null,
    }))
}

/** @deprecated Usar extractPersistedFigureProgress — ya no inyecta mockFigures. */
export function mergeFiguresWithTemplate(storedFigures) {
  return extractPersistedFigureProgress(storedFigures)
}

export function stripOversizedPhotos(figures) {
  if (!Array.isArray(figures)) return []
  return figures.map((figure) => {
    if (!figure.foto) return figure

    const sizeBytes =
      figure.fotoSizeBytes ??
      Math.round((figure.foto.length * 3) / 4)

    if (sizeBytes > 350_000) {
      return {
        ...figure,
        foto: null,
        fotoSizeBytes: null,
      }
    }

    return figure
  })
}

/**
 * Migra datos entre versiones del esquema local.
 * v2: el catálogo vive solo en Supabase; persist guarda progreso por id.
 */
export function migratePersistedState(raw) {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  try {
    const version = raw.version ?? 0
    const sanitized = sanitizePersistedState(raw)
    if (!sanitized) return null

    const progressRecords = stripOversizedPhotos(
      extractPersistedFigureProgress(sanitized.figures ?? []),
    )

    if (version < 2) {
      console.info('[CATALOG-PERSIST-CLEARED]', {
        reason: 'migrate-v2',
        fromVersion: version,
        droppedCatalogEntries: sanitized.figures?.length ?? 0,
        progressKept: progressRecords.length,
      })
    }

    const discoveredCollectionIds = inferDiscoveredCollectionIds(
      progressRecords,
      sanitized.discoveredCollectionIds ?? [],
    )
    const acknowledgedDiscoveryCollectionIds =
      Array.isArray(sanitized.acknowledgedDiscoveryCollectionIds) &&
      sanitized.acknowledgedDiscoveryCollectionIds.length > 0
        ? sanitized.acknowledgedDiscoveryCollectionIds
        : discoveredCollectionIds

    return {
      version: STORAGE_VERSION,
      state: {
        figures: progressRecords,
        albumStatus:
          sanitized.albumStatus ??
          computeAlbumStatus([], sanitized.lastViewedFigureId),
        lastObtenidaFigureId: sanitized.lastObtenidaFigureId ?? null,
        lastViewedFigureId: sanitized.lastViewedFigureId ?? null,
        lastSavedAt: sanitized.lastSavedAt ?? null,
        celebratedCollectionIds: sanitized.celebratedCollectionIds ?? [],
        discoveredCollectionIds,
        acknowledgedDiscoveryCollectionIds,
      },
    }
  } catch (error) {
    persistLog.persistWarn('migratePersistedState failed', error)
    return null
  }
}

export function serializeForBackend(localState) {
  return {
    schemaVersion: STORAGE_VERSION,
    albumStatus: localState.albumStatus,
    lastSavedAt: localState.lastSavedAt,
    figures: localState.figures.map(({ id, slug, obtenida, obtenidaEn }) => ({
      id,
      slug,
      obtenida,
      obtenidaEn,
    })),
  }
}
