import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { resolveBuildInfo } from './src/build/resolveBuildInfo.js'

const appBuildInfo = resolveBuildInfo()

export default defineConfig({
  define: {
    __APP_BUILD_INFO__: JSON.stringify(appBuildInfo),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicom.png',
        'favicon.ico',
        'favicon.png',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'favicon-48x48.png',
        'apple-touch-icon.png',
        'pwa-192.png',
        'pwa-512.png',
        'og-image.png',
      ],
      manifest: {
        id: '/',
        name: 'Album de Figuritas San Fernando',
        short_name: 'Figuritas SF',
        description:
          'Recorré San Fernando, descubrí puntos turísticos y desbloqueá figuritas digitales.',
        theme_color: '#faf9f7',
        background_color: '#faf9f7',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'es-AR',
        categories: ['games', 'entertainment', 'travel'],
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        importScripts: ['push-sw-handler.js'],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.tile\.openstreetmap\.org\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 80, maxAgeSeconds: 86400 },
              networkTimeoutSeconds: 4,
            },
          },
        ],
      },
    }),
  ],
  build: {
    esbuild: {
      /** Preserva nombres de funciones en stack traces del bundle (solo diagnóstico). */
      keepNames: true,
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('leaflet') || id.includes('react-leaflet')) return 'leaflet'
          if (id.includes('framer-motion')) return 'motion'
          if (id.includes('react-icons')) return 'icons'
        },
      },
    },
  },
})
