import { create } from 'zustand'

export const useMobilePhotoDebugStore = create((set) => ({
  snapshot: null,
  setSnapshot: (snapshot) =>
    set({
      snapshot: {
        updatedAt: new Date().toISOString(),
        ...snapshot,
      },
    }),
  clearSnapshot: () => set({ snapshot: null }),
}))
