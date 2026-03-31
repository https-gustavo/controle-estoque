import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

<<<<<<< HEAD
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
      strictPort: true,
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
=======
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/controle-estoque/',
  build: {
    outDir: 'dist'
>>>>>>> b607bae02313d8af97551be9f1177bb0acb65ecb
  }
})
