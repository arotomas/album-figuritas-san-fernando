import { create } from 'zustand'

const initialState = {
  active: false,
  targetFigureId: null,
  targetCoordinates: null,
  targetName: null,
  distanceMeters: null,
  hasUserLocation: false,
  pendingCamera: false,
}

export const useExplorationStore = create((set) => ({
  ...initialState,

  startExploration(figure) {
    const lat = Number(figure?.lat)
    const lng = Number(figure?.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return false
    }

    set({
      active: true,
      targetFigureId: figure?.id != null ? String(figure.id) : null,
      targetCoordinates: { lat, lng },
      targetName: figure?.nombre ?? 'Destino',
      distanceMeters: null,
      hasUserLocation: false,
      pendingCamera: true,
    })
    console.info('[ROUTE_TARGET_SET]', {
      figureId: figure?.id != null ? String(figure.id) : null,
      targetName: figure?.nombre ?? 'Destino',
    })
    console.info('[ROUTE_TARGET_COORDS]', { lat, lng })
    return true
  },

  setDistanceMeters(distanceMeters) {
    set({
      distanceMeters:
        distanceMeters != null && Number.isFinite(distanceMeters)
          ? distanceMeters
          : null,
    })
  },

  clearPendingCamera() {
    set({ pendingCamera: false })
  },

  setHasUserLocation(hasUserLocation) {
    set({ hasUserLocation: Boolean(hasUserLocation) })
  },

  stopExploration() {
    set({ ...initialState })
  },
}))
