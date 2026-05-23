import { STORAGE_VERSION } from '../../config/persistence'
import { mockFigures } from '../../data/mockFigures'
import { computeAlbumStatus } from '../../store/albumUtils'
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

  const user =
    source.user && typeof source.user === 'object' ? source.user : null

  return {
    figures,
    albumStatus: typeof source.albumStatus === 'string' ? source.albumStatus : null,
    lastObtenidaFigureId:
      source.lastObtenidaFigureId != null ? source.lastObtenidaFigureId : null,
    lastViewedFigureId:
      source.lastViewedFigureId != null ? source.lastViewedFigureId : null,
    lastSavedAt: typeof source.lastSavedAt === 'number' ? source.lastSavedAt : null,
    isAuthenticated: Boolean(source.isAuthenticated),
    user,
    hasSeenSplash: Boolean(source.hasSeenSplash),
  }
}

/**
 * Fusiona figuritas persistidas con el template mock (coords, rareza, etc.).
 * Permite agregar figuritas nuevas sin romper datos guardados.
 */
export function mergeFiguresWithTemplate(storedFigures) {
  const list = Array.isArray(storedFigures) ? storedFigures : []
  const storedById = new Map(
    list
      .filter((figure) => figure && figure.id != null)
      .map((figure) => [String(figure.id), figure]),
  )

  return mockFigures.map((template, index) => {
    const stored = storedById.get(String(template.id))
    const defaults = {
      id: String(template.id),
      capture_radius: 250,
      is_bonus: false,
      is_hidden: false,
      unlock_order: index + 1,
      reveal_after_count: Math.max(0, index + 1 - 5),
      bonus_type: null,
      reveal_radius: 200,
      marker_icon_url: null,
      marker_icon_size: 48,
      challenge_title: null,
      challenge_description: null,
      challenge_type: null,
      challenge_example_image_url: null,
    }
    if (!stored) return { ...template, ...defaults }

    return {
      ...template,
      ...defaults,
      obtenida: Boolean(stored.obtenida),
      foto: stored.foto ?? null,
      fotoSizeBytes: stored.fotoSizeBytes ?? null,
      obtenidaEn: stored.obtenidaEn ?? null,
      captureMeta: stored.captureMeta ?? null,
    }
  })
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
 * Preparado para futura sync con WordPress Headless.
 */
export function migratePersistedState(raw) {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  try {
    const version = raw.version ?? 0
    const sanitized = sanitizePersistedState(raw)
    if (!sanitized) return null

    let state = { ...sanitized }

    if (version < 1) {
      state = {
        ...state,
        figures: mergeFiguresWithTemplate(state.figures),
      }
    }

    const figures = stripOversizedPhotos(
      mergeFiguresWithTemplate(state.figures ?? []),
    )

    const obtenidas = figures.filter((f) => f.obtenida && !f.is_bonus).length

    return {
      version: STORAGE_VERSION,
      state: {
        figures,
        albumStatus:
          state.albumStatus ??
          computeAlbumStatus(figures, state.lastViewedFigureId),
        lastObtenidaFigureId: state.lastObtenidaFigureId ?? null,
        lastViewedFigureId: state.lastViewedFigureId ?? null,
        lastSavedAt: state.lastSavedAt ?? null,
        isAuthenticated: state.isAuthenticated ?? false,
        user: state.user ?? null,
        hasSeenSplash: state.hasSeenSplash ?? false,
        progressSnapshot: obtenidas,
        totalFigures: figures.filter((f) => !f.is_bonus).length,
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
      // foto se subirá por separado al backend en el futuro
    })),
  }
}
