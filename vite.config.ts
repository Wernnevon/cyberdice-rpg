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
        // PNGs generated from public/icon.svg by `npm run icons`
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,wasm}'],
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
