import {
  formatPushDiagFinalStatus,
  hintPushDiagScenario,
  readPushDiagClientSnapshot,
  readPushDiagRecord,
  writePushDiagClientSnapshot,
} from './pushDiag.js'
import { isPushSupported } from './pushSubscription.js'

async function readLiveNotifications() {
  if (!isPushSupported()) {
    return { count: 0, titles: [] }
  }

  const registration = await navigator.serviceWorker.ready
  const notifications = await registration.getNotifications()
  return {
    count: notifications.length,
    titles: notifications.map((item) => item.title || '—'),
  }
}

/** Lee SW + cliente y refresca conteo getNotifications (sin cambiar origen del toast). */
export async function refreshPushDiagnosticPanel({ toastSource, context = 'panel' } = {}) {
  const swRecord = await readPushDiagRecord()
  const previousClient = await readPushDiagClientSnapshot()
  const live = await readLiveNotifications()

  const clientRecord = await writePushDiagClientSnapshot({
    toastSource: toastSource ?? previousClient?.toastSource ?? null,
    getNotificationsCount: live.count,
    getNotificationsTitles: live.titles,
    context,
  })

  return buildPushDiagnosticPanelView(swRecord, clientRecord)
}

export async function loadPushDiagnosticPanel() {
  const swRecord = await readPushDiagRecord()
  const clientRecord = await readPushDiagClientSnapshot()
  return buildPushDiagnosticPanelView(swRecord, clientRecord)
}

function buildPushDiagnosticPanelView(swRecord, clientRecord) {
  return {
    swRecord,
    clientRecord,
    scenarioHint: hintPushDiagScenario(swRecord),
    receivedAt: swRecord?.recordedAt ?? null,
    stage: swRecord?.stage ?? null,
    title: swRecord?.title ?? null,
    finalStatus: formatPushDiagFinalStatus(swRecord?.stage),
    error: swRecord?.error ?? null,
    clientCount: swRecord?.clientCount ?? null,
    pendingNotificationCount: swRecord?.pendingNotificationCount ?? null,
    getNotificationsCount: clientRecord?.getNotificationsCount ?? null,
    lastReadAt: clientRecord?.readAt ?? null,
    toastSource: clientRecord?.toastSource ?? null,
    getNotificationsTitles: clientRecord?.getNotificationsTitles ?? [],
  }
}

export function formatPushDiagDateTime(iso) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function formatToastSource(source) {
  if (source === 'postMessage') return 'postMessage'
  if (source === 'getNotifications') return 'getNotifications'
  return '—'
}
