import { supabase } from '../../lib/supabase.js'
import { isSuperAdminProfile } from '../../utils/roles.js'

async function assertSuperAdminClient() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('UNAUTHENTICATED')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, username')
    .eq('id', session.user.id)
    .maybeSingle()

  if (!isSuperAdminProfile(profile)) {
    throw new Error('FORBIDDEN')
  }

  return session
}

export async function fetchPushAdminStats() {
  const { data, error } = await supabase.rpc('get_push_admin_stats')
  if (error) {
    if (/forbidden/i.test(error.message ?? '')) throw new Error('FORBIDDEN')
    throw error
  }
  return {
    registeredUsers: Number(data?.registered_users ?? 0),
    subscribedUsers: Number(data?.subscribed_users ?? 0),
    subscribedDevices: Number(data?.subscribed_devices ?? 0),
  }
}

export async function fetchPushNotificationHistory({ limit = 50 } = {}) {
  const { data, error } = await supabase
    .from('push_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

export async function sendPushBroadcast(payload) {
  await assertSuperAdminClient()

  const { data, error } = await supabase.functions.invoke('send-push-broadcast', {
    body: payload,
  })

  if (error) throw error
  if (data?.error) {
    const err = new Error(data.error)
    err.details = data
    throw err
  }
  return data
}

export async function sendPushTest(payload) {
  await assertSuperAdminClient()

  const { data, error } = await supabase.functions.invoke('send-push-test', {
    body: payload,
  })

  if (error) throw error
  if (data?.error && data.error !== 'NO_DEVICES') {
    const err = new Error(data.message ?? data.error)
    err.code = data.error
    throw err
  }
  if (data?.error === 'NO_DEVICES') {
    const err = new Error(data.message ?? 'No tenés dispositivos suscritos activos.')
    err.code = 'NO_DEVICES'
    throw err
  }
  return data
}
