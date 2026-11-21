import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Automatically exposes to local network IP
    // Allow the ngrok host and current LAN IP so the dev server accepts requests from those origins.
    allowedHosts: ['squeezing-cuddle-woozy.ngrok-free.dev', 'localhost','192.168.18.12'],
  },
  build: {
    rollupOptions: {
      output: {
        // Split vendor libraries into separate, independently-cacheable chunks.
        // This prevents a single app file change from busting the entire React bundle.
        manualChunks: {
          // React core — changes almost never, gets cached for a very long time
          'vendor-react': ['react', 'react-dom'],
          // Router — changes rarely
          'vendor-router': ['react-router-dom'],
          // Toast notifications — small but isolated
          'vendor-toast': ['react-hot-toast'],
          // HTTP client — large (38 kB), cache-busted separately from app code
          'vendor-axios': ['axios'],
        },
      },
    },
  },
})
