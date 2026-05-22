import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { mockFigures, TOTAL_FIGURES } from '../data/mockFigures'
import {
  ALBUM_STATUS,
  STORAGE_KEY,
  STORAGE_VERSION,
} from '../config/persistence'
import { createZustandStorage, storageService } from '../services/storage/storageService'
import {
  mergeFiguresWithTemplate,
  migratePersistedState,
} from '../services/storage/migrationService'
import { computeAlbumStatus } from './albumUtils'

const createInitialFigures = () =>
  mockFigures.map((figure) => ({
    ...figure,
    obtenida: false,
    foto: null,
    fotoSizeBytes: null,
    obtenidaEn: null,
  }))

function buildPersistedSnapshot(state) {
  return {
    figures: state.figures.map(
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
  const figures = state.figures.map((figure) =>
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
        if (foto && !storageService.isPhotoWithinLimit(fotoSizeBytes)) {
          console.warn('[album] Foto demasiado grande, no se persiste.')
          return set((state) =>
            applyFigureUpdate(state, figureId, {
              obtenida: true,
              obtenidaEn,
            }),
          )
        }

        return set((state) =>
          applyFigureUpdate(state, figureId, {
            obtenida: true,
            foto,
            fotoSizeBytes,
            obtenidaEn,
          }),
        )
      },

      setNearFigure: (figure) => set({ nearFigure: figure }),

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
        })
      },

      /** Snapshot serializable para debug / futura sync */
      getPersistedSnapshot: () => buildPersistedSnapshot(get()),
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => createZustandStorage()),
      partialize: (state) => buildPersistedSnapshot(state),
      migrate: (persistedState, version) => {
        const migrated = migratePersistedState({
          version,
          state: persistedState,
        })
        return migrated?.state ?? persistedState
      },
      merge: (persistedState, currentState) => {
        if (!persistedState) return currentState

        const figures = mergeFiguresWithTemplate(persistedState.figures)

        return {
          ...currentState,
          ...persistedState,
          figures,
          albumStatus:
            persistedState.albumStatus ??
            computeAlbumStatus(figures, persistedState.lastViewedFigureId),
          _hasHydrated: true,
        }
      },
      onRehydrateStorage: () => () => {
        useAppStore.getState().setHasHydrated(true)
      },
    },
  ),
)

export const selectProgress = (state) =>
  state.figures.filter((figure) => figure.obtenida).length

export const selectObtenidasFigures = (state) =>
  state.figures.filter((figure) => figure.obtenida)

export const selectPendientesFigures = (state) =>
  state.figures.filter((figure) => !figure.obtenida)

export { TOTAL_FIGURES, ALBUM_STATUS }
