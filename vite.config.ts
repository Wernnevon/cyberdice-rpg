import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split the vendors out so a change to app code does not invalidate the
        // cached three.js payload, which dwarfs everything else here.
        manualChunks: {
          three: ['three'],
          react: ['react', 'react-dom'],
          // The physics engine ships its WebAssembly inlined, ~2 MB of it.
          rapier: ['@dimforge/rapier3d-compat'],
        },
      },
    },
    // three.js is irreducibly ~600 kB and Rapier's inlined WebAssembly ~2 MB;
    // the limit sits just above Rapier so the warning stays useful for the
    // chunks we can actually control instead of being silenced outright.
    chunkSizeWarningLimit: 2300,
  },
})
