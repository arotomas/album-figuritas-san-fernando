import { create } from 'zustand'

const emptyRuntime = {
  mapFlyControllerOn: false,
  autoFollowDisabled: false,
  missionFollowResumeOn: false,
  missionFollowResumePending: false,
  activeTargetFigureId: null,
  userControlled: false,
  followPaused: false,
  explorationActive: false,
}

function formatEntry(origen, detail = {}) {
  const latlng = detail.latlng ?? null
  return {
    origen: String(origen ?? 'unknown'),
    method: detail.method != null ? String(detail.method) : '—',
    timestamp: detail.timestamp ?? Date.now(),
    latlng:
      latlng && latlng.lat != null && latlng.lng != null
        ? `${Number(latlng.lat).toFixed(5)}, ${Number(latlng.lng).toFixed(5)}`
        : '—',
    stack: detail.stack ? String(detail.stack).slice(0, 120) : '',
  }
}

export const useMapCameraDebugStore = create((set) => ({
  lastMove: null,
  history: [],
  runtime: { ...emptyRuntime },

  pushCameraMove: (origen, detail = {}) => {
    const entry = formatEntry(origen, detail)
    set((state) => ({
      lastMove: entry,
      history: [entry, ...state.history].slice(0, 10),
    }))
    return entry
  },

  setRuntime: (patch) =>
    set((state) => ({
      runtime: { ...state.runtime, ...patch },
    })),

  reset: () =>
    set({
      lastMove: null,
      history: [],
      runtime: { ...emptyRuntime },
    }),
}))
