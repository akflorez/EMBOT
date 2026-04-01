import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // port: 4445,
    // strictPort: true,
    watch: {
      ignored: ['**/whatsapp-service/**']
    },
    proxy: {
      '/api': {
        target: process.env.VITE_CRM_API_URL || 'http://localhost:5119',
        changeOrigin: true,
        secure: false,
      },
      '/wa': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path.replace(/^\/wa/, '')
      }
    }
  }
})
