import type { PushSubscriptionRow } from './push.ts'

export type WebPushErrorInfo = {
  statusCode?: number
  body?: string
  message?: string
}

export type PushDeliveryRecord = {
  subscription_id: string
  endpoint_tail: string
  platform: string | null
  last_seen_at: string | null
  updated_at: string | null
  status: 'sent' | 'failed'
  http_status: number | null
  error: string | null
  deactivated: boolean
}

export function redactEndpoint(endpoint: string): string {
  if (!endpoint) return '—'
  if (endpoint.length <= 48) return endpoint
  return `…${endpoint.slice(-40)}`
}

export function parseWebPushError(error: unknown): WebPushErrorInfo {
  if (error && typeof error === 'object') {
    const candidate = error as WebPushErrorInfo
    const body =
      typeof candidate.body === 'string'
        ? candidate.body.slice(0, 300)
        : undefined
    return {
      statusCode: candidate.statusCode,
      body,
      message: candidate.message ?? (error instanceof Error ? error.message : undefined),
    }
  }
  return { message: String(error) }
}

/** FCM/Apple devuelven 404/410 cuando la suscripción expiró. */
export function shouldDeactivatePushSubscription(statusCode?: number): boolean {
  return statusCode === 404 || statusCode === 410
}

type WebPushClient = {
  sendNotification: (
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string,
    options?: { TTL?: number },
  ) => Promise<unknown>
}

export async function deliverPushNotification(
  webpushLib: WebPushClient,
  row: PushSubscriptionRow,
  payload: string,
  logPrefix: string,
): Promise<PushDeliveryRecord> {
  const base = {
    subscription_id: row.id,
    endpoint_tail: redactEndpoint(row.endpoint),
    platform: row.platform ?? null,
    last_seen_at: row.last_seen_at ?? null,
    updated_at: row.updated_at ?? null,
  }

  try {
    await webpushLib.sendNotification(
      {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      },
      payload,
      { TTL: 86400 },
    )

    console.log(`[${logPrefix}] webpush OK`, {
      subscription_id: base.subscription_id,
      endpoint_tail: base.endpoint_tail,
      http_status: 201,
    })

    return {
      ...base,
      status: 'sent',
      http_status: 201,
      error: null,
      deactivated: false,
    }
  } catch (error) {
    const parsed = parseWebPushError(error)
    const deactivated = shouldDeactivatePushSubscription(parsed.statusCode)

    console.error(`[${logPrefix}] webpush FAILED`, {
      subscription_id: base.subscription_id,
      endpoint_tail: base.endpoint_tail,
      http_status: parsed.statusCode ?? null,
      error: parsed.body ?? parsed.message ?? 'unknown',
      deactivated,
    })

    return {
      ...base,
      status: 'failed',
      http_status: parsed.statusCode ?? null,
      error: parsed.body ?? parsed.message ?? 'unknown',
      deactivated,
    }
  }
}

export async function deliverPushBatch(
  webpushLib: WebPushClient,
  rows: PushSubscriptionRow[],
  payload: string,
  logPrefix: string,
  batchSize = 20,
) {
  const deliveries: PushDeliveryRecord[] = []
  const inactiveEndpoints: string[] = []

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map((row) => deliverPushNotification(webpushLib, row, payload, logPrefix)),
    )
    deliveries.push(...batchResults)

    for (const result of batchResults) {
      if (result.deactivated) {
        const row = batch.find((item) => item.id === result.subscription_id)
        if (row) inactiveEndpoints.push(row.endpoint)
      }
    }
  }

  const successCount = deliveries.filter((item) => item.status === 'sent').length
  const failureCount = deliveries.filter((item) => item.status === 'failed').length

  return {
    deliveries,
    inactiveEndpoints,
    successCount,
    failureCount,
  }
}
