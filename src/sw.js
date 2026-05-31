/**
 * Service worker principal — push handlers se importan primero (síncrono, sin race con Workbox).
 */
import './sw/pushHandlers.js'

import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

const navigationHandler = createHandlerBoundToURL('/index.html')
registerRoute(
  new NavigationRoute(navigationHandler, {
    denylist: [/^\/api/],
  }),
)

registerRoute(
  /^https:\/\/.*\.tile\.openstreetmap\.org\/.*/i,
  new NetworkFirst({
    cacheName: 'osm-tiles',
    networkTimeoutSeconds: 4,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 80,
        maxAgeSeconds: 86400,
      }),
    ],
  }),
  'GET',
)
