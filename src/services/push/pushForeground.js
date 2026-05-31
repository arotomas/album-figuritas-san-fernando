import { usePushForegroundStore } from '../../store/pushForegroundStore.js'
import { isPushSupported } from './pushSubscription.js'

const PUSH_MESSAGE_TYPE = 'PUSH_RECEIVED'

function normalizePayload(raw) {
  if (!raw || typeof raw !== 'object') return null
  return {
    title: raw.title || 'Album Figuritas SF',
    body: raw.body || '',
    data: raw.data || { url: raw.url || '/map' },
  }
}

async function syncFromServiceWorkerNotifications() {
  if (!isPushSupported()) return

  try {
    const registration = await navigator.serviceWorker.ready
    const notifications = await registration.getNotifications()
    if (notifications.length === 0) return

    const latest = notifications[notifications.length - 1]
    usePushForegroundStore.getState().show({
      title: latest.title,
      body: latest.body,
      data: latest.data,
    })
  } catch {
    // ignore
  }
}

/** Escucha push del SW y sincroniza al volver a primer plano. */
export function initPushForegroundListener() {
  if (typeof window === 'undefined' || !isPushSupported()) return

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type !== PUSH_MESSAGE_TYPE) return
    const payload = normalizePayload(event.data.payload)
    if (!payload) return
    console.log('[PUSH_CLIENT] foreground push received', payload.title)
    usePushForegroundStore.getState().show(payload)
  })

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void syncFromServiceWorkerNotifications()
    }
  })

  void syncFromServiceWorkerNotifications()
}
