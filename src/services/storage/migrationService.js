import { STORAGE_VERSION } from '../../config/persistence'
import { mockFigures, TOTAL_FIGURES } from '../../data/mockFigures'
import { computeAlbumStatus } from '../../store/albumUtils'
import { persistLog } from '../../utils/persistLog'

/**
 * Fusiona figuritas persistidas con el template mock (coords, rareza, etc.).
 * Permite agregar figuritas nuevas sin romper datos guardados.
 */
export function mergeFiguresWithTemplate(storedFigures = []) {
  const storedById = new Map(storedFigures.map((figure) => [figure.id, figure]))

  return mockFigures.map((template) => {
    const stored = storedById.get(template.id)
    if (!stored) return { ...template }

    return {
      ...template,
      obtenida: Boolean(stored.obtenida),
      foto: stored.foto ?? null,
      fotoSizeBytes: stored.fotoSizeBytes ?? null,
      obtenidaEn: stored.obtenidaEn ?? null,
    }
  })
}

export function stripOversizedPhotos(figures) {
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
    let state = { ...(raw.state ?? raw) }

    if (version < 1) {
      state = {
        ...state,
        figures: mergeFiguresWithTemplate(state.figures),
      }
    }

    const figures = stripOversizedPhotos(
      mergeFiguresWithTemplate(state.figures ?? []),
    )

    const obtenidas = figures.filter((f) => f.obtenida).length

    return {
      version: STORAGE_VERSION,
      state: {
        ...state,
        figures,
        albumStatus:
          state.albumStatus ??
          computeAlbumStatus(figures, state.lastViewedFigureId),
        lastObtenidaFigureId: state.lastObtenidaFigureId ?? null,
        lastViewedFigureId: state.lastViewedFigureId ?? null,
        lastSavedAt: state.lastSavedAt ?? null,
        progressSnapshot: obtenidas,
        totalFigures: TOTAL_FIGURES,
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
