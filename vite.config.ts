import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    // Self-signed HTTPS so phones on the LAN get a secure context (motion sensor, service worker).
    !process.env.HTTP && basicSsl(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Dice Roller',
        short_name: 'Dados',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0B0B10',
        theme_color: '#0B0B10',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,wasm}'],
        // Rapier ships its WASM inlined in JS (~2MB+), above workbox's 2MB default
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // Google Fonts: cached on first load so the app keeps its look offline
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
})
