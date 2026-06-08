import { create } from 'zustand'

export const useLaunchDiscoveryStore = create((set) => ({
  toastOpen: false,
  pendingFigure: null,
  mapFocusFigureId: null,

  showToast: (figure) =>
    set({
      toastOpen: true,
      pendingFigure: figure ?? null,
    }),

  dismissToast: () =>
    set({
      toastOpen: false,
      pendingFigure: null,
    }),

  focusOnMap: (figureId) =>
    set({
      toastOpen: false,
      pendingFigure: null,
      mapFocusFigureId: figureId != null ? String(figureId) : null,
    }),

  clearMapFocus: () => set({ mapFocusFigureId: null }),
}))
