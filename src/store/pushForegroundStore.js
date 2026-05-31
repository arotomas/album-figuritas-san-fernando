import { create } from 'zustand'

/** Aviso in-app cuando llega push con la app abierta. */
export const usePushForegroundStore = create((set) => ({
  current: null,
  show: (notification) =>
    set({
      current: {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: notification.title || 'Album Figuritas SF',
        body: notification.body || '',
        url: notification.data?.url || notification.url || '/map',
      },
    }),
  dismiss: () => set({ current: null }),
}))
