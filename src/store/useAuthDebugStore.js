import { create } from 'zustand'

export const useAuthDebugStore = create((set) => ({
  snapshot: null,
  setSnapshot: (snapshot) => set({ snapshot }),
  clearSnapshot: () => set({ snapshot: null }),
}))
