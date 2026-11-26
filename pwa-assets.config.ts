import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Icon art is full-bleed with the die inside the maskable safe zone, so no extra padding.
const full = { padding: 0, resizeOptions: { background: '#0B0B10' } }

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, ...full },
    maskable: { ...minimal2023Preset.maskable, ...full },
    apple: { ...minimal2023Preset.apple, ...full },
  },
  images: ['public/icon.svg'],
})
