import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env from project root (parent dir) so we can read GOOGLE_CLIENT_ID
  // Use absolute path and empty prefix '' to load ALL env vars (not just VITE_*)
  const rootEnv = loadEnv(mode, path.resolve(__dirname, '..'), '')

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(
        rootEnv.VITE_GOOGLE_CLIENT_ID || rootEnv.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || ''
      ),
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/health': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  }
})
