import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { mockFigures } from '../data/mockFigures'
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
import { syncUnlockToSupabase, syncReplaceFigurePhoto, syncDeleteFigurePhoto } from '../services/supabase/sync'
import { QA_TEST_FIGURE_ID_PREFIX } from '../config/qaConstants'
import { canUseTestFigure } from '../qa/qaCore'
import { myFiguresLog } from '../utils/myFiguresLog'
import { sessionDebug, inspectSupabaseAuthStorage } from '../utils/sessionDebug'
import { getSupabaseProjectRef } from '../utils/authDebug'
import { isProfileComplete } from '../utils/profileValidation'
import { getMainProgressState } from '../utils/figureGameRules'
import {
  inferDiscoveredCollectionIds,
  resolveFigureCollectionId,
} from '../utils/collectionModel'
import { getCollectionById } from '../utils/collectionRegistry'
import { requiresCollectionDiscovery } from '../utils/collectionAvailability'

export { QA_TEST_FIGURE_ID_PREFIX }

const zustandStorage = createJSONStorage(() => createZustandStorage())

const createInitialFigures = () =>
  mockFigures.map((figure, index) => ({
    ...figure,
    id: String(figure.id),
    source: 'local-fallback',
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
    obtenida: false,
    foto: null,
    fotoSizeBytes: null,
    obtenidaEn: null,
  }))

function mergeCatalogWithProgress(catalogFigures, currentFigures) {
  const catalog = Array.isArray(catalogFigures) ? catalogFigures : []
  const current = Array.isArray(currentFigures) ? currentFigures : []
  const progressById = new Map(
    current
      .filter((figure) => figure?.id != null)
      .map((figure) => [String(figure.id), figure]),
  )

  return catalog.map((figure) => {
    const stored = progressById.get(String(figure.id))
    return {
      ...figure,
      id: String(figure.id),
      obtenida: Boolean(stored?.obtenida),
      foto: stored?.foto ?? null,
      fotoSizeBytes: stored?.fotoSizeBytes ?? null,
      obtenidaEn: stored?.obtenidaEn ?? null,
      captureMeta: stored?.captureMeta ?? null,
    }
  })
}

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
    celebratedCollectionIds: [],
    discoveredCollectionIds: [],
    acknowledgedDiscoveryCollectionIds: [],
    isAuthenticated: false,
    user: null,
    nearFigure: null,
    qaTestFigure: null,
    captureSession: null,
    _hasHydrated: true,
    supabaseUserId: null,
    supabaseReady: false,
    isSupabaseAdmin: false,
    isSupabaseModerator: false,
    supabaseUsername: null,
    supabaseProfileId: null,
    supabaseProfileAddress: null,
    supabaseProfileLocalidad: null,
    profileCompleted: false,
    supabaseProfile: null,
    authBootstrapped: false,
    lastSupabaseSyncWarning: null,
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
    celebratedCollectionIds: Array.isArray(state.celebratedCollectionIds)
      ? state.celebratedCollectionIds
      : [],
    discoveredCollectionIds: Array.isArray(state.discoveredCollectionIds)
      ? state.discoveredCollectionIds
      : [],
    acknowledgedDiscoveryCollectionIds: Array.isArray(state.acknowledgedDiscoveryCollectionIds)
      ? state.acknowledgedDiscoveryCollectionIds
      : [],
  }
}

function sameFigureId(a, b) {
  return String(a) === String(b)
}

function discoverCollectionsPatch(state, figureId, patch) {
  const figure = (Array.isArray(state.figures) ? state.figures : []).find((item) =>
    sameFigureId(item.id, figureId),
  )
  if (!figure) return {}

  const updated = { ...figure, ...patch }
  if (!updated.obtenida) return {}

  const collectionId = String(resolveFigureCollectionId(updated))
  const collection = getCollectionById(collectionId)
  if (!requiresCollectionDiscovery(collection)) return {}

  const current = Array.isArray(state.discoveredCollectionIds)
    ? state.discoveredCollectionIds.map(String)
    : []
  if (current.includes(collectionId)) return {}

  return {
    discoveredCollectionIds: [...current, collectionId],
  }
}

function applyFigureUpdate(state, figureId, patch) {
  const figures = (Array.isArray(state.figures) ? state.figures : []).map((figure) =>
    sameFigureId(figure.id, figureId) ? { ...figure, ...patch } : figure,
  )

  return {
    figures,
    lastObtenidaFigureId: figureId,
    lastViewedFigureId: figureId,
    lastSavedAt: Date.now(),
    albumStatus: computeAlbumStatus(figures, figureId),
    ...discoverCollectionsPatch(state, figureId, patch),
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
      authBootstrapped: false,
      albumStatus: ALBUM_STATUS.EN_PROGRESO,
      lastObtenidaFigureId: null,
      lastViewedFigureId: null,
      lastSavedAt: null,
      celebratedCollectionIds: [],
    discoveredCollectionIds: [],
    acknowledgedDiscoveryCollectionIds: [],
      supabaseUserId: null,
      supabaseReady: false,
      isSupabaseAdmin: false,
      isSupabaseModerator: false,
      supabaseUsername: null,
      supabaseProfileId: null,
      supabaseProfileAddress: null,
      supabaseProfileLocalidad: null,
      profileCompleted: false,
      supabaseProfile: null,
      lastSupabaseSyncWarning: null,

      setHasHydrated: (value) => set({ _hasHydrated: value }),

      setAuthBootstrapped: (value) => set({ authBootstrapped: value }),

      clearAuthState: () =>
        set({
          isAuthenticated: false,
          profileCompleted: false,
          user: null,
          supabaseUserId: null,
          supabaseReady: false,
          isSupabaseAdmin: false,
          isSupabaseModerator: false,
          supabaseUsername: null,
          supabaseProfileId: null,
          supabaseProfileAddress: null,
          supabaseProfileLocalidad: null,
          supabaseProfile: null,
        }),

      setSupabaseAuth: ({
        userId,
        isAdmin = false,
        isModeratorOrAdmin = false,
        profile = null,
      }) =>
        set({
          supabaseUserId: userId,
          supabaseReady: Boolean(userId),
          isSupabaseAdmin: isAdmin,
          isSupabaseModerator: isModeratorOrAdmin,
          supabaseUsername: profile?.username ?? null,
          supabaseProfileId: profile?.id ?? null,
          supabaseProfileAddress: profile?.direccion_texto ?? null,
          supabaseProfileLocalidad: profile?.localidad ?? null,
          profileCompleted: isProfileComplete(profile),
          supabaseProfile: profile ?? null,
        }),

      setSupabaseSyncWarning: (warning) =>
        set({ lastSupabaseSyncWarning: warning, lastSavedAt: Date.now() }),

      replaceCatalogFromRemote: (remoteFigures) =>
        set((state) => {
          if (!Array.isArray(remoteFigures) || remoteFigures.length === 0) {
          console.warn('[figures-fallback]', 'remote catalog empty — keeping current catalog', JSON.stringify({
              currentCount: state.figures.length,
              fallback: true,
            }))
            return state
          }

          const figures = mergeCatalogWithProgress(remoteFigures, state.figures)
          const ids = figures.map((figure) => String(figure.id))
          const validIds = new Set(ids)
          const lastViewedFigureId = validIds.has(String(state.lastViewedFigureId))
            ? state.lastViewedFigureId
            : null
          const lastObtenidaFigureId = validIds.has(String(state.lastObtenidaFigureId))
            ? state.lastObtenidaFigureId
            : null

          console.info('[figures-bootstrap]', 'catalog applied', JSON.stringify({
            count: figures.length,
            ids,
            fallback: false,
          }))

          return {
            figures,
            lastViewedFigureId,
            lastObtenidaFigureId,
            albumStatus: computeAlbumStatus(figures, lastViewedFigureId),
            lastSavedAt: Date.now(),
          }
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

            const remoteKey = String(row.figure_id)
            if (!catalogIds.has(remoteKey)) {
              myFiguresLog.warn('remote figure not in catalog — ignored', {
                figureId: row.figure_id,
                hasPhotoUrl: Boolean(row.photo_url),
              })
              continue
            }

            remoteById.set(String(row.figure_id), row)
          }

          if (remoteById.size === 0) return state

          let changed = false
          const figures = state.figures.map((figure) => {
            const remote =
              remoteById.get(String(figure.id))
            if (!remote) return figure

            const remoteTime = remote.captured_at
              ? new Date(remote.captured_at).getTime()
              : 0
            const localTime = figure.obtenidaEn ?? 0

            if (
              figure.obtenida &&
              localTime >= remoteTime &&
              figure.foto &&
              (!remote.photo_url || figure.foto === remote.photo_url)
            ) {
              return figure
            }

            changed = true
            myFiguresLog.info('photo source', {
              figureId: figure.id,
              source: remote.photo_url ? 'supabase-photo_url' : figure.foto ? 'local-existing' : 'none',
              hasRemotePhoto: Boolean(remote.photo_url),
            })
            return {
              ...figure,
              obtenida: true,
              obtenidaEn: remoteTime || figure.obtenidaEn || Date.now(),
              foto: remote.photo_url ?? figure.foto,
            }
          })

          if (!changed) return state

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
            albumStatus: computeAlbumStatus(figures, lastViewedFigureId),
            lastSavedAt: Date.now(),
            discoveredCollectionIds: inferDiscoveredCollectionIds(
              figures,
              state.discoveredCollectionIds,
            ),
          }
        }),

      login: ({ username, profileCompleted = false }) => {
        const trimmed = username?.trim() || 'explorador'
        return set({
          isAuthenticated: true,
          profileCompleted,
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
          profileCompleted: false,
          user: null,
          supabaseUserId: null,
          supabaseReady: false,
          isSupabaseAdmin: false,
          isSupabaseModerator: false,
          supabaseUsername: null,
          supabaseProfileId: null,
          supabaseProfileAddress: null,
          supabaseProfileLocalidad: null,
          supabaseProfile: null,
          lastSavedAt: Date.now(),
        }),

      obtainFigure: (figureId) =>
        set((state) =>
          applyFigureUpdate(state, figureId, { obtenida: true }),
        ),

      obtainFigureWithPhoto: (
        figureId,
        { foto, fotoSizeBytes, obtenidaEn, captureRecord, photoSource = null },
      ) => {
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
              figureKey.replace(/^(qa-|dev-)/, '')
          }

          const existing = state.figures.find((f) => sameFigureId(f.id, realFigureId))
          if (existing?.obtenida) {
            persistLog.persist('obtain skipped — already obtained', realFigureId)
            saved = true
            const qaTargetFigureId = isQaFigure
              ? state.qaTestFigure?.targetFigureId ?? figureKey.replace(/^(qa-|dev-)/, '')
              : null

            void syncUnlockToSupabase({
              figureId,
              foto,
              fotoSizeBytes,
              photoSource,
              obtenidaEn,
              captureRecord,
              source: isQaFigure ? 'qa' : 'capture',
              qaTargetFigureId,
            }).then((result) => {
              if (result.ok && result.remotePhotoUrl) {
                useAppStore.setState((current) => ({
                  figures: current.figures.map((f) =>
                    sameFigureId(f.id, realFigureId) && f.obtenida
                      ? { ...f, foto: result.remotePhotoUrl ?? f.foto }
                      : f,
                  ),
                  lastSupabaseSyncWarning: null,
                }))
              } else if (result.uploadError || !result.ok) {
                useAppStore.getState().setSupabaseSyncWarning(
                  result.uploadError?.reason ?? result.reason ?? 'No se pudo subir la foto a Supabase.',
                )
              }
            })
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
            ? state.qaTestFigure?.targetFigureId ?? figureKey.replace(/^(qa-|dev-)/, '')
            : null

          void syncUnlockToSupabase({
            figureId,
            foto,
            fotoSizeBytes,
            photoSource,
            obtenidaEn,
            captureRecord,
            source: isQaFigure ? 'qa' : 'capture',
            qaTargetFigureId,
          }).then((result) => {
            if (result.ok && result.remotePhotoUrl) {
              useAppStore.setState((current) => ({
                  figures: current.figures.map((f) =>
                    sameFigureId(f.id, realFigureId) && f.obtenida
                    ? { ...f, foto: result.remotePhotoUrl ?? f.foto }
                    : f,
                ),
                lastSupabaseSyncWarning: null,
              }))
            } else if (result.uploadError || !result.ok) {
              useAppStore.getState().setSupabaseSyncWarning(
                result.uploadError?.reason ?? result.reason ?? 'No se pudo subir la foto a Supabase.',
              )
            }
          })

          return applyFigureUpdate(state, realFigureId, patch)
        })

        return saved
      },

      obtainFigureWithPhotoSynced: async (
        figureId,
        { foto, fotoSizeBytes, obtenidaEn, captureRecord, photoSource = null },
      ) => {
        const figureKey = String(figureId)
        const isQaFigure =
          figureKey.startsWith(QA_TEST_FIGURE_ID_PREFIX) || figureKey.startsWith('dev-')
        const state = get()
        const withinLimit = isQaFigure || storageService.isPhotoWithinLimit(fotoSizeBytes)

        if (!foto || !withinLimit) {
          persistLog.persist('synced obtain blocked — photo required or too large', figureId)
          return false
        }

        let realFigureId = figureId
        if (isQaFigure) {
          realFigureId =
            state.qaTestFigure?.targetFigureId ??
            figureKey.replace(/^(qa-|dev-)/, '')
        }

        const qaTargetFigureId = isQaFigure
          ? state.qaTestFigure?.targetFigureId ?? figureKey.replace(/^(qa-|dev-)/, '')
          : null

        const result = await syncUnlockToSupabase({
          figureId,
          foto,
          fotoSizeBytes,
          photoSource,
          obtenidaEn,
          captureRecord,
          source: isQaFigure ? 'qa' : 'capture',
          qaTargetFigureId,
        })

        if (!result.ok || !result.remotePhotoUrl) {
          const warning =
            result.uploadError?.reason ??
            result.reason ??
            'No se pudo subir la foto a Supabase.'
          get().setSupabaseSyncWarning(warning)
          return false
        }

        const patch = {
          obtenida: true,
          obtenidaEn,
          foto: result.remotePhotoUrl,
          fotoSizeBytes,
          ...(captureRecord
            ? { captureMeta: { ...captureRecord, photoUrl: result.remotePhotoUrl } }
            : {}),
        }

        set((current) => {
          const existing = current.figures.find((f) => sameFigureId(f.id, realFigureId))
          const figures = current.figures.map((figure) =>
            sameFigureId(figure.id, realFigureId) ? { ...figure, ...patch } : figure,
          )

          return {
            ...(existing?.obtenida
              ? {
                  figures,
                  lastViewedFigureId: realFigureId,
                  lastSavedAt: Date.now(),
                  albumStatus: computeAlbumStatus(figures, realFigureId),
                }
              : applyFigureUpdate(current, realFigureId, patch)),
            lastSupabaseSyncWarning: null,
          }
        })

        console.info('[capture-sync]', 'local store updated with photo_url', {
          figureId: realFigureId,
          publicUrl: result.remotePhotoUrl,
        })

        return true
      },

      replaceFigurePhotoSynced: async (
        figureId,
        { foto, fotoSizeBytes, captureRecord, photoSource = null },
      ) => {
        const figureKey = String(figureId)
        const state = get()
        const withinLimit = storageService.isPhotoWithinLimit(fotoSizeBytes)

        if (!foto || !withinLimit) {
          persistLog.persist('photo replace blocked — photo required or too large', figureId)
          return false
        }

        const existing = state.figures.find((f) => sameFigureId(f.id, figureId))
        if (!existing?.obtenida) {
          persistLog.persist('photo replace blocked — figure not obtained', figureId)
          return false
        }

        const result = await syncReplaceFigurePhoto({
          figureId,
          foto,
          fotoSizeBytes,
          photoSource,
          captureRecord,
          source: 'retake',
        })

        if (!result.ok || !result.remotePhotoUrl) {
          get().setSupabaseSyncWarning(
            result.uploadError?.reason ??
              result.reason ??
              'No se pudo actualizar la foto en Supabase.',
          )
          return false
        }

        set((current) => ({
          figures: current.figures.map((figure) =>
            sameFigureId(figure.id, figureId)
              ? {
                  ...figure,
                  foto: result.remotePhotoUrl,
                  fotoSizeBytes,
                  fotoUpdatedAt: Date.now(),
                  ...(captureRecord
                    ? { captureMeta: { ...captureRecord, photoUrl: result.remotePhotoUrl } }
                    : {}),
                }
              : figure,
          ),
          lastSupabaseSyncWarning: null,
        }))

        console.info('[photo-replace]', 'local store updated with photo_url', {
          figureId,
          publicUrl: result.remotePhotoUrl,
        })

        return true
      },

      deleteFigurePhotoSynced: async (figureId) => {
        const state = get()
        const existing = state.figures.find((f) => sameFigureId(f.id, figureId))
        if (!existing?.obtenida || !existing?.foto) {
          persistLog.persist('photo delete blocked — no photo to delete', figureId)
          return false
        }

        const result = await syncDeleteFigurePhoto({ figureId })
        if (!result.ok) {
          get().setSupabaseSyncWarning(
            result.reason ?? 'No se pudo eliminar la foto en Supabase.',
          )
          return false
        }

        set((current) => ({
          figures: current.figures.map((figure) =>
            sameFigureId(figure.id, figureId)
              ? {
                  ...figure,
                  foto: null,
                  fotoSizeBytes: null,
                  fotoUpdatedAt: null,
                }
              : figure,
          ),
          lastSupabaseSyncWarning: null,
        }))

        console.info('[photo-delete]', 'local store cleared photo', { figureId })
        return true
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
            mode: 'unlock',
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

      startRetakeSession: (figure) => {
        if (!figure?.obtenida) return

        set({
          nearFigure: { ...figure },
          captureSession: {
            mode: 'retake',
            figure: { ...figure },
            locationSnapshot: null,
            position: null,
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

      acknowledgeCollectionCelebration: (collectionId) =>
        set((state) => {
          const id = String(collectionId)
          const current = Array.isArray(state.celebratedCollectionIds)
            ? state.celebratedCollectionIds
            : []
          if (current.includes(id)) {
            return { lastSavedAt: Date.now() }
          }
          return {
            celebratedCollectionIds: [...current, id],
            lastSavedAt: Date.now(),
          }
        }),

      acknowledgeCollectionDiscovery: (collectionId) =>
        set((state) => {
          const id = String(collectionId)
          const current = Array.isArray(state.acknowledgedDiscoveryCollectionIds)
            ? state.acknowledgedDiscoveryCollectionIds
            : []
          if (current.includes(id)) {
            return { lastSavedAt: Date.now() }
          }
          return {
            acknowledgedDiscoveryCollectionIds: [...current, id],
            lastSavedAt: Date.now(),
          }
        }),

      setLastViewedFigure: (figureId) =>
        set((state) => {
          const figures = state.figures
          const mainProgress = getMainProgressState(figures)

          return {
            lastViewedFigureId: figureId,
            lastSavedAt: Date.now(),
            albumStatus: mainProgress.completed
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
          celebratedCollectionIds: [],
          discoveredCollectionIds: [],
          acknowledgedDiscoveryCollectionIds: [],
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
          const mainProgress = getMainProgressState(figures)

          return {
            figures,
            albumStatus: mainProgress.completed ? ALBUM_STATUS.COMPLETADO : computeAlbumStatus(figures),
            lastObtenidaFigureId: figures[figures.length - 1]?.id ?? null,
            lastSavedAt: Date.now(),
            discoveredCollectionIds: inferDiscoveredCollectionIds(figures, state.discoveredCollectionIds),
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
          nearFigure: null,
          qaTestFigure: null,
          supabaseUserId: null,
          supabaseReady: false,
          isSupabaseAdmin: false,
          isSupabaseModerator: false,
          supabaseUsername: null,
          supabaseProfileId: null,
          supabaseProfileAddress: null,
          supabaseProfileLocalidad: null,
          profileCompleted: false,
          supabaseProfile: null,
          lastSupabaseSyncWarning: null,
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
          const discoveredCollectionIds = inferDiscoveredCollectionIds(
            figures,
            persistedFields.discoveredCollectionIds ?? [],
          )

          return {
            ...currentState,
            ...persistedFields,
            figures,
            discoveredCollectionIds,
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
        return (state, error) => {
          if (error) {
            persistLog.hydrationWarn('rehydrate error — clearing corrupt storage', error)
            sessionDebug.error('hydration rehydrate error — clearing album storage only', {
              error: error?.message ?? String(error),
              authStorage: inspectSupabaseAuthStorage(getSupabaseProjectRef()),
            })
            try {
              storageService.clearAll()
              setTimeout(() => resetStoreToDefaults(), 0)
            } catch {
              state?.setHasHydrated?.(true)
            }
          } else {
            persistLog.hydration('rehydrate complete')
            sessionDebug.info('hydration rehydrate complete', {
              authStorage: inspectSupabaseAuthStorage(getSupabaseProjectRef()),
            })
            state?.setHasHydrated?.(true)
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

export { ALBUM_STATUS }
