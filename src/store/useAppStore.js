import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { mockFigures, TOTAL_FIGURES } from '../data/mockFigures'
import {
  ALBUM_STATUS,
  PERSISTED_FIELDS,
  STORAGE_KEY,
  STORAGE_VERSION,
} from '../config/persistence'
import { createZustandStorage, storageService } from '../services/storage/storageService'
import {
  mergeFiguresWithTemplate,
  migratePersistedState,
  sanitizePersistedState,
} from '../services/storage/migrationService'
import { computeAlbumStatus } from './albumUtils'
import { persistLog } from '../utils/persistLog'
import { offsetCoordinates } from '../utils/geoOffset'
import { isDevMode } from '../utils/devMode'

const zustandStorage = createJSONStorage(() => createZustandStorage())

const createInitialFigures = () =>
  mockFigures.map((figure) => ({
    ...figure,
    obtenida: false,
    foto: null,
    fotoSizeBytes: null,
    obtenidaEn: null,
  }))

function pickPersistedFields(source) {
  const picked = {}
  for (const key of PERSISTED_FIELDS) {
    if (source && Object.prototype.hasOwnProperty.call(source, key)) {
      picked[key] = source[key]
    }
  }
  return picked
}

function resetStoreToDefaults() {
  useAppStore.setState({
    figures: createInitialFigures(),
    albumStatus: ALBUM_STATUS.EN_PROGRESO,
    lastObtenidaFigureId: null,
    lastViewedFigureId: null,
    lastSavedAt: null,
    isAuthenticated: false,
    user: null,
    hasSeenSplash: false,
    nearFigure: null,
    devTestFigure: null,
    _hasHydrated: true,
  })
}

function buildPersistedSnapshot(state) {
  const figures = Array.isArray(state.figures) ? state.figures : createInitialFigures()

  return {
    figures: figures.map(
      ({ id, obtenida, foto, fotoSizeBytes, obtenidaEn, slug }) => ({
        id,
        slug,
        obtenida,
        foto,
        fotoSizeBytes,
        obtenidaEn,
      }),
    ),
    albumStatus: state.albumStatus,
    lastObtenidaFigureId: state.lastObtenidaFigureId,
    lastViewedFigureId: state.lastViewedFigureId,
    lastSavedAt: state.lastSavedAt,
    isAuthenticated: state.isAuthenticated,
    user: state.user,
    hasSeenSplash: state.hasSeenSplash,
  }
}

function applyFigureUpdate(state, figureId, patch) {
  const figures = (Array.isArray(state.figures) ? state.figures : []).map((figure) =>
    figure.id === figureId ? { ...figure, ...patch } : figure,
  )

  return {
    figures,
    lastObtenidaFigureId: figureId,
    lastSavedAt: Date.now(),
    albumStatus: computeAlbumStatus(figures, state.lastViewedFigureId),
  }
}

export const useAppStore = create(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      isAuthenticated: false,
      user: null,
      figures: createInitialFigures(),
      nearFigure: null,
      devTestFigure: null,
      hasSeenSplash: false,
      albumStatus: ALBUM_STATUS.EN_PROGRESO,
      lastObtenidaFigureId: null,
      lastViewedFigureId: null,
      lastSavedAt: null,

      setHasHydrated: (value) => set({ _hasHydrated: value }),

      login: ({ username }) =>
        set({
          isAuthenticated: true,
          user: {
            username: username || 'explorador',
            displayName: username || 'Explorador',
          },
          lastSavedAt: Date.now(),
        }),

      logout: () =>
        set({
          isAuthenticated: false,
          user: null,
          lastSavedAt: Date.now(),
        }),

      completeSplash: () =>
        set({ hasSeenSplash: true, lastSavedAt: Date.now() }),

      obtainFigure: (figureId) =>
        set((state) =>
          applyFigureUpdate(state, figureId, { obtenida: true }),
        ),

      obtainFigureWithPhoto: (figureId, { foto, fotoSizeBytes, obtenidaEn }) => {
        return set((state) => {
          let realFigureId = figureId
          if (String(figureId).startsWith('dev-')) {
            realFigureId =
              state.devTestFigure?.targetFigureId ??
              Number(String(figureId).replace('dev-', ''))
          }

          const existing = state.figures.find((f) => f.id === realFigureId)
          if (existing?.obtenida) {
            persistLog.persist('obtain skipped — already obtained', realFigureId)
            return {
              ...state,
              devTestFigure: null,
              nearFigure: null,
            }
          }

          const patch = {
            obtenida: true,
            obtenidaEn,
            ...(foto && storageService.isPhotoWithinLimit(fotoSizeBytes)
              ? { foto, fotoSizeBytes }
              : {}),
          }

          if (foto && !storageService.isPhotoWithinLimit(fotoSizeBytes)) {
            console.warn('[ALBUM] Foto demasiado grande, no se persiste.')
          }

          persistLog.persist('figure obtained', realFigureId)
          return {
            ...applyFigureUpdate(state, realFigureId, patch),
            nearFigure: null,
            devTestFigure: null,
          }
        })
      },

      setNearFigure: (figure) => set({ nearFigure: figure }),

      setDevTestFigureNear: (userLat, userLng) => {
        if (!isDevMode()) return false

        const pending = get().figures.find((figure) => !figure.obtenida)
        if (!pending) return false

        const distance = 20 + Math.random() * 10
        const bearing = Math.random() * 360
        const coords = offsetCoordinates(userLat, userLng, distance, bearing)

        set({
          devTestFigure: {
            ...pending,
            targetFigureId: pending.id,
            id: `dev-${pending.id}`,
            lat: coords.lat,
            lng: coords.lng,
            isDevTest: true,
            nombre: `[Prueba] ${pending.nombre}`,
            emoji: pending.emoji ?? '🧪',
            description: 'Figurita temporal de prueba (solo dev).',
          },
        })

        return true
      },

      clearDevTestFigure: () => set({ devTestFigure: null }),

      setLastViewedFigure: (figureId) =>
        set((state) => {
          const figures = state.figures
          const obtenidas = figures.filter((f) => f.obtenida).length
          const isComplete = obtenidas >= TOTAL_FIGURES

          return {
            lastViewedFigureId: figureId,
            lastSavedAt: Date.now(),
            albumStatus: isComplete
              ? ALBUM_STATUS.EN_REVISION
              : computeAlbumStatus(figures, figureId),
          }
        }),

      resetProgress: () =>
        set({
          figures: createInitialFigures(),
          albumStatus: ALBUM_STATUS.EN_PROGRESO,
          lastObtenidaFigureId: null,
          lastViewedFigureId: null,
          lastSavedAt: Date.now(),
          nearFigure: null,
          devTestFigure: null,
        }),

      unlockAllFigures: () =>
        set((state) => {
          const figures = state.figures.map((figure) => ({
            ...figure,
            obtenida: true,
            obtenidaEn: figure.obtenidaEn ?? Date.now(),
          }))

          return {
            figures,
            albumStatus: ALBUM_STATUS.COMPLETADO,
            lastObtenidaFigureId: figures[figures.length - 1]?.id ?? null,
            lastSavedAt: Date.now(),
          }
        }),

      clearStorage: () => {
        storageService.clearAll()
        useAppStore.persist.clearStorage()
        set({
          figures: createInitialFigures(),
          albumStatus: ALBUM_STATUS.EN_PROGRESO,
          lastObtenidaFigureId: null,
          lastViewedFigureId: null,
          lastSavedAt: null,
          isAuthenticated: false,
          user: null,
          hasSeenSplash: false,
          nearFigure: null,
          devTestFigure: null,
        })
      },

      /** Snapshot serializable para debug / futura sync */
      getPersistedSnapshot: () => buildPersistedSnapshot(get()),
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: zustandStorage,
      partialize: (state) => buildPersistedSnapshot(state),
      migrate: (persistedState, version) => {
        try {
          persistLog.persist('migrate', { from: version })
          const migrated = migratePersistedState({
            version,
            state: persistedState,
          })
          return migrated?.state ?? persistedState
        } catch (error) {
          persistLog.persistWarn('migrate failed — keeping raw state', error)
          return persistedState
        }
      },
      merge: (persistedState, currentState) => {
        try {
          const sanitized = sanitizePersistedState(persistedState)
          if (!sanitized) {
            persistLog.hydration('empty or invalid storage — using defaults')
            return {
              ...currentState,
              nearFigure: null,
              devTestFigure: null,
              _hasHydrated: true,
            }
          }

          const figures = mergeFiguresWithTemplate(sanitized.figures)
          const persistedFields = pickPersistedFields(sanitized)

          return {
            ...currentState,
            ...persistedFields,
            figures,
            albumStatus:
              persistedFields.albumStatus ??
              computeAlbumStatus(figures, persistedFields.lastViewedFigureId),
            nearFigure: null,
            devTestFigure: null,
            _hasHydrated: true,
          }
        } catch (error) {
          persistLog.persistWarn('merge failed — using defaults', error)
          return {
            ...currentState,
            nearFigure: null,
            devTestFigure: null,
            _hasHydrated: true,
          }
        }
      },
      onRehydrateStorage: () => {
        persistLog.hydration('start')
        return (_state, error) => {
          if (error) {
            persistLog.hydrationWarn('rehydrate error — clearing corrupt storage', error)
            try {
              storageService.clearAll()
              useAppStore.persist.clearStorage()
              resetStoreToDefaults()
            } catch {
              useAppStore.getState().setHasHydrated(true)
            }
          } else {
            persistLog.hydration('rehydrate complete')
            useAppStore.getState().setHasHydrated(true)
          }
        }
      },
    },
  ),
)

// Suscribir antes del primer render de React (evita race con onFinishHydration)
if (typeof window !== 'undefined') {
  useAppStore.persist.onFinishHydration(() => {
    persistLog.hydration('onFinishHydration (module)')
    useAppStore.getState().setHasHydrated(true)
  })

  if (useAppStore.persist.hasHydrated()) {
    useAppStore.getState().setHasHydrated(true)
  }
}

export const selectProgress = (state) =>
  (Array.isArray(state.figures) ? state.figures : []).filter(
    (figure) => figure.obtenida,
  ).length

export const selectObtenidasFigures = (state) =>
  (Array.isArray(state.figures) ? state.figures : []).filter(
    (figure) => figure.obtenida,
  )

export const selectPendientesFigures = (state) =>
  (Array.isArray(state.figures) ? state.figures : []).filter(
    (figure) => !figure.obtenida,
  )

export { TOTAL_FIGURES, ALBUM_STATUS }
