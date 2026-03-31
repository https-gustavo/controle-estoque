import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  const isProd = command === 'build' || mode === 'production'
  return {
    plugins: [react()],
    base: isProd ? '/controle-estoque/' : '/',
    cacheDir: isProd ? 'node_modules/.vite' : 'node_modules/.vite-dev4',
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js', 'cookie']
    },
    server: {
      port: 5173,
      strictPort: false,
      headers: {
        'Cache-Control': 'no-store'
      },
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true
        }
      }
    },
    build: {
      outDir: 'dist'
    }
  }
})
