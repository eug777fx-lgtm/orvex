import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@/lib/db':
        mode === 'development'
          ? path.resolve(__dirname, 'src/lib/db.dev.js')
          : path.resolve(__dirname, 'src/lib/db.prod.js'),
    },
  },
  build: {
    rollupOptions: {
      external: (id) => (id === '@neondatabase/serverless' ? false : false),
    },
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
}))
