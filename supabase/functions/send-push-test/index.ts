import webpush from 'npm:web-push@3.6.7'
import { deliverPushBatch } from '../_shared/pushDelivery.ts'
import {
  buildWebPushPayload,
  corsHeaders,
  jsonResponse,
  type PushSubscriptionRow,
  validatePushPayload,
} from '../_shared/push.ts'
import { lookupPushTestRecipient } from '../_shared/phone.ts'
import { assertSuperAdmin } from '../_shared/superAdmin.ts'

function configureWebPush() {
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@album-figuritas-sf.local'

  if (!publicKey || !privateKey) {
    throw new Error('VAPID_KEYS_NOT_CONFIGURED')
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405, origin)
  }

  try {
    const { userClient, adminClient } = await assertSuperAdmin(req)
    const body = await req.json()
    const validated = validatePushPayload(body)
    const localPhone = String(body.local_phone ?? body.phone ?? '').trim()

    if (!localPhone) {
      return jsonResponse({ error: 'INVALID_PHONE', message: 'Ingresá un número válido.' }, 400, origin)
    }

    const lookup = await lookupPushTestRecipient(userClient, localPhone)

    if (!lookup.ok && lookup.error === 'INVALID_PHONE') {
      return jsonResponse({ error: 'INVALID_PHONE', message: 'Número inválido.' }, 400, origin)
    }

    if (!lookup.ok && lookup.error === 'USER_NOT_FOUND') {
      return jsonResponse(
        {
          error: 'USER_NOT_FOUND',
          message: 'No existe un usuario registrado con ese número.',
        },
        404,
        origin,
      )
    }

    if (!lookup.ok || !lookup.user_id) {
      return jsonResponse({ error: 'INTERNAL_ERROR' }, 500, origin)
    }

    const activeDevices = Number(lookup.active_devices ?? 0)
    if (activeDevices === 0) {
      return jsonResponse(
        {
          error: 'NO_DEVICES',
          message: 'El usuario existe pero no tiene dispositivos suscritos.',
          device_count: 0,
        },
        400,
        origin,
      )
    }

    const { data: subscriptions, error: subError } = await adminClient
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth, platform, last_seen_at, updated_at')
      .eq('user_id', lookup.user_id)
      .eq('is_active', true)
      .order('last_seen_at', { ascending: false })

    if (subError) {
      throw subError
    }

    const rows = (subscriptions ?? []) as PushSubscriptionRow[]
    if (rows.length === 0) {
      return jsonResponse(
        {
          error: 'NO_DEVICES',
          message: 'El usuario existe pero no tiene dispositivos suscritos.',
          device_count: 0,
        },
        400,
        origin,
      )
    }

    configureWebPush()
    const payload = buildWebPushPayload(validated)

    console.log('[send-push-test] sending', {
      user_id: lookup.user_id,
      device_count: rows.length,
      endpoints: rows.map((row) => row.endpoint.slice(-40)),
    })

    const { deliveries, inactiveEndpoints, successCount, failureCount } = await deliverPushBatch(
      webpush,
      rows,
      payload,
      'send-push-test',
    )

    if (inactiveEndpoints.length > 0) {
      const { error: deactivateError } = await adminClient
        .from('push_subscriptions')
        .update({ is_active: false })
        .in('endpoint', inactiveEndpoints)

      if (deactivateError) {
        console.error('[send-push-test] deactivate failed', deactivateError)
      } else {
        console.log('[send-push-test] deactivated expired subscriptions', {
          count: inactiveEndpoints.length,
          endpoints: inactiveEndpoints.map((endpoint) => endpoint.slice(-40)),
        })
      }
    }

    const allFailed = successCount === 0 && failureCount > 0

    return jsonResponse(
      {
        device_count: rows.length,
        success_count: successCount,
        failure_count: failureCount,
        deactivated_count: inactiveEndpoints.length,
        deliveries,
        ok: successCount > 0,
        message: allFailed
          ? 'Ningún envío llegó al push service (revisá deliveries).'
          : successCount > 0 && failureCount > 0
            ? 'Prueba parcial: algunos dispositivos fallaron (revisá deliveries).'
            : 'Prueba enviada correctamente.',
      },
      200,
      origin,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message === 'UNAUTHORIZED') {
      return jsonResponse({ error: message }, 401, origin)
    }
    if (message === 'FORBIDDEN') {
      return jsonResponse({ error: message }, 403, origin)
    }
    if (message.startsWith('INVALID_') || message === 'VAPID_KEYS_NOT_CONFIGURED') {
      return jsonResponse({ error: message }, 400, origin)
    }
    console.error('[send-push-test]', error)
    return jsonResponse({ error: 'INTERNAL_ERROR' }, 500, origin)
  }
})
