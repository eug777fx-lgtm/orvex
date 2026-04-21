import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: [],
    },
  },
  optimizeDeps: {
    exclude: ['@neondatabase/serverless'],
  },
  server: {
    proxy: {
      '/maps-api': {
        target: 'https://maps.googleapis.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/maps-api/, ''),
      },
    },
  },
})
