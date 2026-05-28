import { create } from 'zustand'

const initialState = {
  active: false,
  targetFigureId: null,
  targetCoordinates: null,
  targetName: null,
  distanceMeters: null,
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
      pendingCamera: true,
    })
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

  stopExploration() {
    set({ ...initialState })
  },
}))
