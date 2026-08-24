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
        },
      },
    },
    // three.js is irreducibly ~600 kB unminified; this keeps the warning useful
    // for the chunks we can actually control instead of silencing it outright.
    chunkSizeWarningLimit: 700,
  },
})
