import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import webpush from 'npm:web-push@3.6.7'
import {
  buildWebPushPayload,
  corsHeaders,
  jsonResponse,
  type PushSubscriptionRow,
  validatePushPayload,
} from '../_shared/push.ts'

const BATCH_SIZE = 20

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
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || profile?.role !== 'super_admin') {
    throw new Error('FORBIDDEN')
  }

  return { user, adminClient }
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
    const { user, adminClient } = await assertSuperAdmin(req)
    const body = await req.json()
    const validated = validatePushPayload(body)

    const { data: subscriptions, error: subError } = await adminClient
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (subError) {
      throw subError
    }

    const rows = (subscriptions ?? []) as PushSubscriptionRow[]
    if (rows.length === 0) {
      return jsonResponse(
        {
          error: 'NO_DEVICES',
          message: 'No tenés dispositivos suscritos activos. Activá notificaciones en la app.',
          device_count: 0,
        },
        400,
        origin,
      )
    }

    configureWebPush()
    const payload = buildWebPushPayload(validated)

    let successCount = 0
    let failureCount = 0
    const inactiveEndpoints: string[] = []

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)
      await Promise.all(
        batch.map(async (row) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: row.endpoint,
                keys: { p256dh: row.p256dh, auth: row.auth },
              },
              payload,
              { TTL: 86400 },
            )
            successCount += 1
          } catch (error) {
            failureCount += 1
            const statusCode = (error as { statusCode?: number })?.statusCode
            if (statusCode === 404 || statusCode === 410) {
              inactiveEndpoints.push(row.endpoint)
            }
          }
        }),
      )
    }

    if (inactiveEndpoints.length > 0) {
      await adminClient
        .from('push_subscriptions')
        .update({ is_active: false })
        .in('endpoint', inactiveEndpoints)
    }

    return jsonResponse(
      {
        device_count: rows.length,
        success_count: successCount,
        failure_count: failureCount,
        ok: successCount > 0,
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
