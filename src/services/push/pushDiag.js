/** Diagnóstico push — registro persistido SW → cliente (Cache API, mismo origen). */

export const PUSH_DIAG_CACHE = 'album-push-diag-v1'
export const PUSH_DIAG_REQUEST = '/__push_diag__/last.json'
export const PUSH_DIAG_CLIENT_REQUEST = '/__push_diag__/client.json'

const FINAL_STATUS_LABELS = {
  push_event_received: 'Push recibido en Service Worker',
  notify_clients_done: 'Clientes foreground notificados',
  showNotification_ok: 'showNotification completado',
  showNotification_fail: 'showNotification falló',
}

export function formatPushDiagFinalStatus(stage) {
  if (!stage) return 'Sin evento registrado'
  return FINAL_STATUS_LABELS[stage] ?? stage
}

export async function writePushDiagRecord(record) {
  const payload = {
    ...record,
    recordedAt: new Date().toISOString(),
    recordedAtMs: Date.now(),
  }
  const cache = await caches.open(PUSH_DIAG_CACHE)
  await cache.put(
    PUSH_DIAG_REQUEST,
    new Response(JSON.stringify(payload), {
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  console.log('[PUSH_DIAG]', payload.stage, payload)
  return payload
}

export async function readPushDiagRecord() {
  try {
    const cache = await caches.open(PUSH_DIAG_CACHE)
    const response = await cache.match(PUSH_DIAG_REQUEST)
    if (!response) return null
    return await response.json()
  } catch (error) {
    console.warn('[PUSH_DIAG] read failed', error)
    return null
  }
}

export async function writePushDiagClientSnapshot(record) {
  const payload = {
    ...record,
    readAt: new Date().toISOString(),
    readAtMs: Date.now(),
  }
  const cache = await caches.open(PUSH_DIAG_CACHE)
  await cache.put(
    PUSH_DIAG_CLIENT_REQUEST,
    new Response(JSON.stringify(payload), {
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  return payload
}

export async function readPushDiagClientSnapshot() {
  try {
    const cache = await caches.open(PUSH_DIAG_CACHE)
    const response = await cache.match(PUSH_DIAG_CLIENT_REQUEST)
    if (!response) return null
    return await response.json()
  } catch (error) {
    console.warn('[PUSH_DIAG] client read failed', error)
    return null
  }
}

/** A=SW sin push | B=push sin showNotification OK | C=showNotification OK */
export function hintPushDiagScenario(record) {
  if (!record?.stage) return 'A'
  if (record.stage === 'showNotification_ok') return 'C'
  if (record.stage === 'showNotification_fail') return 'B'
  if (record.stage === 'push_event_received' || record.stage === 'notify_clients_done') {
    return 'B'
  }
  return 'unknown'
}
