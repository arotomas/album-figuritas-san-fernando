import { usePushForegroundStore } from '../../store/pushForegroundStore.js'
import { hintPushDiagScenario, readPushDiagClientSnapshot, readPushDiagRecord, writePushDiagClientSnapshot } from './pushDiag.js'
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

async function persistClientDiagnostic({ toastSource, context, notifications }) {
  const previousClient = await readPushDiagClientSnapshot()
  await writePushDiagClientSnapshot({
    toastSource: toastSource ?? previousClient?.toastSource ?? null,
    getNotificationsCount: notifications.length,
    getNotificationsTitles: notifications.map((item) => item.title || '—'),
    context,
  })
}

async function logPushDiagnosticSnapshot(context) {
  if (!isPushSupported()) return

  try {
    const swRecord = await readPushDiagRecord()
    const registration = await navigator.serviceWorker.ready
    const notifications = await registration.getNotifications()

    await persistClientDiagnostic({ context, notifications })

    console.log('[PUSH_DIAG] snapshot', {
      context,
      swRecord,
      scenarioHint: hintPushDiagScenario(swRecord),
      getNotificationsCount: notifications.length,
      getNotificationsTitles: notifications.map((item) => item.title),
    })
  } catch (error) {
    console.warn('[PUSH_DIAG] snapshot failed', { context, error })
  }
}

async function syncFromServiceWorkerNotifications(context = 'boot') {
  if (!isPushSupported()) return

  try {
    const registration = await navigator.serviceWorker.ready
    const notifications = await registration.getNotifications()
    console.log('[PUSH_DIAG] getNotifications', {
      context,
      count: notifications.length,
      titles: notifications.map((item) => item.title),
    })
    if (notifications.length === 0) return

    const latest = notifications[notifications.length - 1]
    console.log('[PUSH_DIAG] toast_source=getNotifications', {
      context,
      title: latest.title,
      tag: latest.tag,
    })
    await persistClientDiagnostic({
      toastSource: 'getNotifications',
      context,
      notifications,
    })
    usePushForegroundStore.getState().show({
      title: latest.title,
      body: latest.body,
      data: latest.data,
    })
  } catch (error) {
    console.warn('[PUSH_DIAG] getNotifications failed', { context, error })
  }
}

/** Escucha push del SW y sincroniza al volver a primer plano. */
export function initPushForegroundListener() {
  if (typeof window === 'undefined' || !isPushSupported()) return

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type !== PUSH_MESSAGE_TYPE) return
    const payload = normalizePayload(event.data.payload)
    if (!payload) return
    console.log('[PUSH_DIAG] toast_source=postMessage', { title: payload.title })
    console.log('[PUSH_CLIENT] foreground push received', payload.title)
    void navigator.serviceWorker.ready
      .then((registration) => registration.getNotifications())
      .then((notifications) =>
        persistClientDiagnostic({
          toastSource: 'postMessage',
          context: 'postMessage',
          notifications,
        }),
      )
      .catch(() => {})
    usePushForegroundStore.getState().show(payload)
  })

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void logPushDiagnosticSnapshot('visibility_visible')
      void syncFromServiceWorkerNotifications('visibility_visible')
    }
  })

  void logPushDiagnosticSnapshot('boot')
  void syncFromServiceWorkerNotifications('boot')
}
