import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  // Pre-empaqueta los imports profundos de three al arrancar, para que no recargue a mitad de camino.
  optimizeDeps: {
    include: ['three', 'three/examples/jsm/utils/BufferGeometryUtils.js', 'postprocessing', '@threlte/core'],
  },
})
