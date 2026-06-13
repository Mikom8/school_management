import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: ['postage-beer-neighborhood-trustee.trycloudflare.com']
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-uppy': [
            '@uppy/core', 
            '@uppy/dashboard', 
            '@uppy/react', 
            '@uppy/xhr-upload', 
            '@uppy/drag-drop', 
            '@uppy/status-bar'
          ],
          'vendor-icons': ['lucide-react'],
          'vendor-charts': ['recharts'],
          'vendor-motion': ['framer-motion']
        }
      },
    },
  },
})
