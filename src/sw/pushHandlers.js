/** Push + notificationclick — debe cargarse antes que Workbox (sin deps async). */

const DEFAULT_TITLE = 'Album Figuritas SF'
const DEFAULT_URL = '/map'

function resolveAssetUrl(path) {
  if (!path) return `${self.location.origin}/pwa-192.png`
  try {
    return new URL(path, self.location.origin).href
  } catch {
    return `${self.location.origin}/pwa-192.png`
  }
}

function parsePushPayload(event) {
  const fallback = {
    title: DEFAULT_TITLE,
    body: '',
    icon: '/pwa-192.png',
    badge: '/favicon-48x48.png',
    data: { url: DEFAULT_URL },
  }

  if (!event.data) return fallback

  try {
    const json = event.data.json()
    return {
      title: json.title || fallback.title,
      body: json.body ?? fallback.body,
      icon: json.icon || fallback.icon,
      badge: json.badge || fallback.badge,
      data: json.data || fallback.data,
    }
  } catch {
    const text = event.data.text()
    return {
      ...fallback,
      body: text || fallback.body,
    }
  }
}

self.addEventListener('install', () => {
  console.log('[PUSH_SW] service worker installed')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[PUSH_SW] service worker activated')
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  console.log('[PUSH_SW] push event received', { hasData: Boolean(event.data) })

  const payload = parsePushPayload(event)
  const tag = payload.data?.tag || `album-push-${Date.now()}`
  const options = {
    body: payload.body,
    icon: resolveAssetUrl(payload.icon),
    badge: resolveAssetUrl(payload.badge),
    data: payload.data,
    tag,
    renotify: true,
  }

  event.waitUntil(
    self.registration
      .showNotification(payload.title, options)
      .then(() => {
        console.log('[PUSH_SW] showNotification called', { title: payload.title, tag })
      })
      .catch((error) => {
        console.error('[PUSH_SW] showNotification failed', error)
      }),
  )
})

self.addEventListener('notificationclick', (event) => {
  console.log('[PUSH_SW] notificationclick', event.notification?.tag)
  event.notification.close()

  const targetPath = event.notification.data?.url || DEFAULT_URL
  const targetUrl = new URL(targetPath, self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus().then((focused) => {
            if ('navigate' in focused) {
              return focused.navigate(targetUrl)
            }
            return focused
          })
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
      return undefined
    }),
  )
})
