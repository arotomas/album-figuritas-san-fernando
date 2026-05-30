import { supabase } from '../../lib/supabase.js'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    Boolean(VAPID_PUBLIC_KEY)
  )
}

export function getPushPermissionState() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

function detectPlatform() {
  const ua = navigator.userAgent ?? ''
  const isIos = /iPad|iPhone|iPod/.test(ua)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true

  if (isIos && isStandalone) return 'ios_pwa'
  if (/Android/.test(ua) && isStandalone) return 'android_pwa'
  if (/Android/.test(ua)) return 'android_chrome'
  if (/Chrome|Edg/.test(ua)) return 'desktop_chrome'
  return 'other'
}

async function getServiceWorkerRegistration() {
  const existing = await navigator.serviceWorker.getRegistration('/')
  if (existing) return existing
  return navigator.serviceWorker.register('/sw.js', { scope: '/' })
}

function subscriptionToPayload(subscription) {
  const json = subscription.toJSON()
  return {
    endpoint: json.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
  }
}

export async function upsertPushSubscription(subscription) {
  const payload = subscriptionToPayload(subscription)
  if (!payload.endpoint || !payload.p256dh || !payload.auth) {
    throw new Error('INVALID_SUBSCRIPTION')
  }

  const { data, error } = await supabase.rpc('upsert_push_subscription', {
    p_endpoint: payload.endpoint,
    p_p256dh: payload.p256dh,
    p_auth: payload.auth,
    p_platform: detectPlatform(),
    p_user_agent: navigator.userAgent?.slice(0, 512) ?? null,
  })

  if (error) throw error
  return data
}

export async function subscribeToPushNotifications() {
  if (!isPushSupported()) {
    throw new Error('PUSH_NOT_SUPPORTED')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('PERMISSION_DENIED')
  }

  const registration = await getServiceWorkerRegistration()
  await navigator.serviceWorker.ready

  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  return upsertPushSubscription(subscription)
}

export async function deactivateCurrentPushSubscription() {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' }

  const registration = await navigator.serviceWorker.getRegistration('/')
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return { ok: true, reason: 'none' }

  const endpoint = subscription.endpoint
  await subscription.unsubscribe()

  const { error } = await supabase.rpc('deactivate_push_subscription', {
    p_endpoint: endpoint,
  })

  if (error) throw error
  return { ok: true, reason: 'deactivated' }
}

export async function refreshPushSubscriptionIfGranted() {
  if (!isPushSupported()) return null
  if (Notification.permission !== 'granted') return null

  try {
    const registration = await getServiceWorkerRegistration()
    await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return null
    return upsertPushSubscription(subscription)
  } catch {
    return null
  }
}

export async function hasActivePushSubscription() {
  if (!isPushSupported()) return false
  if (Notification.permission !== 'granted') return false

  const registration = await navigator.serviceWorker.getRegistration('/')
  const subscription = await registration?.pushManager.getSubscription()
  return Boolean(subscription)
}
