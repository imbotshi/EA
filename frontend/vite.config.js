import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          mapbox: ['mapbox-gl'],
          three: ['three']
        }
      }
    }
  },
  server: {
    // Listen on all interfaces so devices on the LAN can access Vite
    host: true,
    port: 3000,
    // Allow external hosts such as ngrok tunnels
    allowedHosts: ['.ngrok-free.app', '.ngrok.app'],
    // Toggle to true if you want HTTPS by default (useful for geolocation on mobile)
    // https: true,
    // Configure HMR to announce the LAN IP so the phone can connect back for live reload
    hmr: {
      host: '192.168.1.216',
      port: 3000,
      protocol: 'ws'
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/proxy': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
