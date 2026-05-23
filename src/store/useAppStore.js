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
import { getDistanceMeters } from '../utils/geo'
import { syncUnlockToSupabase } from '../services/supabase/sync'
import { QA_TEST_FIGURE_ID_PREFIX } from '../config/qaConstants'
import { canUseTestFigure } from '../utils/qaMode'
import { myFiguresLog } from '../utils/myFiguresLog'
import { sessionDebug, inspectSupabaseAuthStorage } from '../utils/sessionDebug'
import { getSupabaseProjectRef } from '../utils/authDebug'

export { QA_TEST_FIGURE_ID_PREFIX }

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
    qaTestFigure: null,
    captureSession: null,
    _hasHydrated: true,
  })
}

function buildPersistedSnapshot(state) {
  const figures = Array.isArray(state.figures) ? state.figures : createInitialFigures()

  return {
    figures: figures.map(
      ({ id, obtenida, foto, fotoSizeBytes, obtenidaEn, slug, captureMeta }) => ({
        id,
        slug,
        obtenida,
        foto,
        fotoSizeBytes,
        obtenidaEn,
        captureMeta,
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
    lastViewedFigureId: figureId,
    lastSavedAt: Date.now(),
    albumStatus: computeAlbumStatus(figures, figureId),
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
    qaTestFigure: null,
    captureSession: null,
    hasSeenSplash: false,
      albumStatus: ALBUM_STATUS.EN_PROGRESO,
      lastObtenidaFigureId: null,
      lastViewedFigureId: null,
      lastSavedAt: null,
      supabaseUserId: null,
      supabaseReady: false,
      isSupabaseAdmin: false,

      setHasHydrated: (value) => set({ _hasHydrated: value }),

      setSupabaseAuth: ({ userId, isAdmin = false }) =>
        set({
          supabaseUserId: userId,
          supabaseReady: Boolean(userId),
          isSupabaseAdmin: isAdmin,
        }),

      mergeRemoteUserFigures: (remoteRows) =>
        set((state) => {
          if (!Array.isArray(remoteRows) || remoteRows.length === 0) return state

          const catalogIds = new Set(
            state.figures.map((figure) => String(figure.id)),
          )

          const remoteById = new Map()
          for (const row of remoteRows) {
            if (!row?.figure_id) {
              myFiguresLog.warn('remote row missing figure_id — ignored', row)
              continue
            }

            const remoteKey = String(Number(row.figure_id) || row.figure_id)
            if (!catalogIds.has(remoteKey)) {
              myFiguresLog.warn('remote figure not in catalog — ignored', {
                figureId: row.figure_id,
                hasPhotoUrl: Boolean(row.photo_url),
              })
              continue
            }

            remoteById.set(Number(row.figure_id) || row.figure_id, row)
          }

          if (remoteById.size === 0) return state

          let changed = false
          const figures = state.figures.map((figure) => {
            const remote =
              remoteById.get(figure.id) ?? remoteById.get(String(figure.id))
            if (!remote) return figure

            const remoteTime = remote.captured_at
              ? new Date(remote.captured_at).getTime()
              : 0
            const localTime = figure.obtenidaEn ?? 0

            if (figure.obtenida && localTime >= remoteTime && figure.foto) {
              return figure
            }

            changed = true
            return {
              ...figure,
              obtenida: true,
              obtenidaEn: remoteTime || figure.obtenidaEn || Date.now(),
              foto: remote.photo_url ?? figure.foto,
            }
          })

          if (!changed) return state

          const obtenidas = figures.filter((f) => f.obtenida).length
          const validFigureIds = new Set(figures.map((figure) => figure.id))
          const lastObtenidaFigureId = validFigureIds.has(state.lastObtenidaFigureId)
            ? state.lastObtenidaFigureId
            : null
          const lastViewedFigureId = validFigureIds.has(state.lastViewedFigureId)
            ? state.lastViewedFigureId
            : lastObtenidaFigureId

          if (
            state.lastObtenidaFigureId != null &&
            lastObtenidaFigureId !== state.lastObtenidaFigureId
          ) {
            myFiguresLog.warn('render guard — cleared invalid lastObtenidaFigureId', {
              previous: state.lastObtenidaFigureId,
            })
          }

          return {
            figures,
            lastObtenidaFigureId,
            lastViewedFigureId,
            albumStatus:
              obtenidas >= TOTAL_FIGURES
                ? ALBUM_STATUS.COMPLETADO
                : computeAlbumStatus(figures, lastViewedFigureId),
            lastSavedAt: Date.now(),
          }
        }),

      login: ({ username }) => {
        const trimmed = username?.trim() || 'explorador'
        return set({
          isAuthenticated: true,
          user: {
            username: trimmed,
            displayName: trimmed,
          },
          lastSavedAt: Date.now(),
        })
      },

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

      obtainFigureWithPhoto: (figureId, { foto, fotoSizeBytes, obtenidaEn, captureRecord }) => {
        let saved = false
        const figureKey = String(figureId)
        const isQaFigure =
          figureKey.startsWith(QA_TEST_FIGURE_ID_PREFIX) || figureKey.startsWith('dev-')

        set((state) => {
          const withinLimit =
            isQaFigure || storageService.isPhotoWithinLimit(fotoSizeBytes)

          if (!foto || !withinLimit) {
            persistLog.persist('obtain blocked — photo required or too large', figureId)
            return state
          }

          let realFigureId = figureId
          if (isQaFigure) {
            realFigureId =
              state.qaTestFigure?.targetFigureId ??
              Number(figureKey.replace(/^(qa-|dev-)/, ''))
          }

          const existing = state.figures.find((f) => f.id === realFigureId)
          if (existing?.obtenida) {
            persistLog.persist('obtain skipped — already obtained', realFigureId)
            saved = true
            return state
          }

          const patch = {
            obtenida: true,
            obtenidaEn,
            foto,
            fotoSizeBytes,
            ...(captureRecord ? { captureMeta: captureRecord } : {}),
          }

          persistLog.persist('figure obtained', realFigureId)
          saved = true

          const qaTargetFigureId = isQaFigure
            ? state.qaTestFigure?.targetFigureId ?? Number(figureKey.replace(/^(qa-|dev-)/, ''))
            : null

          void syncUnlockToSupabase({
            figureId,
            foto,
            fotoSizeBytes,
            obtenidaEn,
            captureRecord,
            source: isQaFigure ? 'qa' : 'capture',
            qaTargetFigureId,
          }).then((result) => {
            if (result.ok && result.remotePhotoUrl) {
              useAppStore.setState((current) => ({
                figures: current.figures.map((f) =>
                  f.id === realFigureId && f.obtenida
                    ? { ...f, foto: result.remotePhotoUrl ?? f.foto }
                    : f,
                ),
              }))
            }
          })

          return applyFigureUpdate(state, realFigureId, patch)
        })

        return saved
      },

      setNearFigure: (figure) => set({ nearFigure: figure }),

      startCaptureSession: ({ figure, position = null, distanceToFigure = null }) => {
        if (!figure) return

        let locationSnapshot = null

        if (figure.isQaTest && !position) {
          locationSnapshot = {
            lat: figure.lat,
            lng: figure.lng,
            accuracy: null,
            distanceToFigure: distanceToFigure ?? 0,
          }
        } else if (position) {
          const dist =
            distanceToFigure ??
            getDistanceMeters(position.lat, position.lng, figure.lat, figure.lng)
          locationSnapshot = {
            lat: position.lat,
            lng: position.lng,
            accuracy: position.accuracy ?? null,
            distanceToFigure: dist,
          }
        }

        set({
          captureSession: {
            figure: { ...figure },
            locationSnapshot,
            position: locationSnapshot
              ? {
                  lat: locationSnapshot.lat,
                  lng: locationSnapshot.lng,
                  accuracy: locationSnapshot.accuracy,
                }
              : null,
            lockedAt: Date.now(),
          },
        })
      },

      clearCaptureSession: () => set({ captureSession: null }),

      setQaTestFigureNear: (userLat, userLng) => {
        if (!canUseTestFigure()) return false

        const pending = get().figures.find((figure) => !figure.obtenida)
        if (!pending) return false

        const distance = 5 + Math.random() * 5
        const bearing = Math.random() * 360
        const coords = offsetCoordinates(userLat, userLng, distance, bearing)

        set({
          qaTestFigure: {
            targetFigureId: pending.id,
            id: `${QA_TEST_FIGURE_ID_PREFIX}${pending.id}`,
            lat: coords.lat,
            lng: coords.lng,
            isQaTest: true,
            rareza: 'común',
            nombre: '[QA] Figurita de prueba',
            emoji: '📍',
            slug: 'qa-test',
            description: 'Figurita temporal QA — solo memoria, no backend.',
          },
        })

        return true
      },

      clearQaTestFigure: () => set({ qaTestFigure: null }),

      /** @deprecated alias */
      setDevTestFigureNear: (userLat, userLng) =>
        get().setQaTestFigureNear(userLat, userLng),

      /** @deprecated alias */
      clearDevTestFigure: () => get().clearQaTestFigure(),

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
          qaTestFigure: null,
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
          qaTestFigure: null,
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
              qaTestFigure: null,
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
            qaTestFigure: null,
            _hasHydrated: true,
          }
        } catch (error) {
          persistLog.persistWarn('merge failed — using defaults', error)
          return {
            ...currentState,
            nearFigure: null,
            qaTestFigure: null,
            _hasHydrated: true,
          }
        }
      },
      onRehydrateStorage: () => {
        persistLog.hydration('start')
        return (_state, error) => {
          if (error) {
            persistLog.hydrationWarn('rehydrate error — clearing corrupt storage', error)
            sessionDebug.error('hydration rehydrate error — clearing album storage only', {
              error: error?.message ?? String(error),
              authStorage: inspectSupabaseAuthStorage(getSupabaseProjectRef()),
            })
            try {
              storageService.clearAll()
              useAppStore.persist.clearStorage()
              resetStoreToDefaults()
            } catch {
              useAppStore.getState().setHasHydrated(true)
            }
          } else {
            persistLog.hydration('rehydrate complete')
            sessionDebug.info('hydration rehydrate complete', {
              authStorage: inspectSupabaseAuthStorage(getSupabaseProjectRef()),
            })
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
