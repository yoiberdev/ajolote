import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Pre-empaqueta todo junto al arrancar, así no quedan dos copias de React en caché.
  optimizeDeps: {
    include: [
      'react',
      'react-dom/client',
      'three',
      'three/examples/jsm/utils/BufferGeometryUtils.js',
      '@react-three/fiber',
      '@react-three/drei',
      '@react-three/postprocessing',
      'zustand',
    ],
  },
})
