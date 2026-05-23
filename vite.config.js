import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    minify: 'terser',
    sourcemap: false, 
    cssCodeSplit: true,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          'anime-vendor': ['animejs'],
          'framer-vendor': ['framer-motion', 'gsap'],
        }
      }
    }
  }
})
