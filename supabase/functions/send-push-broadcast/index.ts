import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import webpush from 'npm:web-push@3.6.7'
import { deliverPushBatch } from '../_shared/pushDelivery.ts'
import {
  buildWebPushPayload,
  computeStatus,
  corsHeaders,
  jsonResponse,
  type PushSubscriptionRow,
  validatePushPayload,
} from '../_shared/push.ts'

const BATCH_SIZE = 100

function configureWebPush() {
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@album-figuritas-sf.local'

  if (!publicKey || !privateKey) {
    throw new Error('VAPID_KEYS_NOT_CONFIGURED')
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
}

async function assertSuperAdmin(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    throw new Error('UNAUTHORIZED')
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()

  if (userError || !user) {
    throw new Error('UNAUTHORIZED')
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('role, username')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || profile?.role !== 'super_admin') {
    throw new Error('FORBIDDEN')
  }

  return { user, username: profile.username ?? '', adminClient }
}

async function sendToSubscriptions(
  adminClient: ReturnType<typeof createClient>,
  subscriptions: PushSubscriptionRow[],
  payload: string,
) {
  configureWebPush()

  const { inactiveEndpoints, successCount, failureCount } = await deliverPushBatch(
    webpush,
    subscriptions,
    payload,
    'send-push-broadcast',
    BATCH_SIZE,
  )

  if (inactiveEndpoints.length > 0) {
    await adminClient
      .from('push_subscriptions')
      .update({ is_active: false })
      .in('endpoint', inactiveEndpoints)

    console.log('[send-push-broadcast] deactivated expired subscriptions', {
      count: inactiveEndpoints.length,
    })
  }

  return { successCount, failureCount }
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
    const { user, username, adminClient } = await assertSuperAdmin(req)
    const body = await req.json()
    const validated = validatePushPayload(body)

    const { data: subscriptions, error: subError } = await adminClient
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth')
      .eq('is_active', true)

    if (subError) {
      throw subError
    }

    const rows = (subscriptions ?? []) as PushSubscriptionRow[]
    const recipientCount = rows.length
    const payload = buildWebPushPayload(validated)

    const { data: notificationRow, error: insertError } = await adminClient
      .from('push_notifications')
      .insert({
        icon_key: validated.icon_key,
        title: validated.title,
        body: validated.body,
        destination: validated.destination,
        deep_link: validated.deep_link,
        sent_by: user.id,
        sent_by_username: username,
        recipient_count: recipientCount,
        success_count: 0,
        failure_count: 0,
        status: 'failed',
      })
      .select('*')
      .single()

    if (insertError) {
      throw insertError
    }

    if (recipientCount === 0) {
      await adminClient
        .from('push_notifications')
        .update({
          status: 'failed',
          error_summary: 'No hay dispositivos suscritos activos',
        })
        .eq('id', notificationRow.id)

      return jsonResponse(
        {
          id: notificationRow.id,
          recipient_count: 0,
          success_count: 0,
          failure_count: 0,
          status: 'failed',
        },
        200,
        origin,
      )
    }

    const { successCount, failureCount } = await sendToSubscriptions(
      adminClient,
      rows,
      payload,
    )

    const status = computeStatus(successCount, failureCount)

    await adminClient
      .from('push_notifications')
      .update({
        success_count: successCount,
        failure_count: failureCount,
        status,
        error_summary: status === 'failed' ? 'Ningún envío exitoso' : null,
      })
      .eq('id', notificationRow.id)

    return jsonResponse(
      {
        id: notificationRow.id,
        recipient_count: recipientCount,
        success_count: successCount,
        failure_count: failureCount,
        status,
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
    console.error('[send-push-broadcast]', error)
    return jsonResponse({ error: 'INTERNAL_ERROR' }, 500, origin)
  }
})
