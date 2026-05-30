import { create } from 'zustand'

export const useNavigationStore = create((set) => ({
  transportProfile: 'walking',
  setTransportProfile: (transportProfile) => set({ transportProfile }),
  resetNavigation: () => set({ transportProfile: 'walking' }),
}))
