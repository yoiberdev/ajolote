<script>
  import * as THREE from 'three'
  import { Canvas } from '@threlte/core'
  import Scene from './scene/Scene.svelte'
  import { game } from './lib/state.svelte.js'
  import { AXOLOTL_VARIANTS } from './world/textures'

  const createRenderer = (canvas) => new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' })
  const variant = $derived(AXOLOTL_VARIANTS[game.shown])
</script>

<div class="stage">
  <Canvas dpr={[1, 1.75]} {createRenderer} renderMode="always" shadows={THREE.PCFShadowMap} toneMapping={THREE.NoToneMapping}>
    <Scene />
  </Canvas>
</div>

<div class="overlay">
  <header>
    <h1 class="logo">AJOLOTE</h1>
    <p class="species">Ambystoma mexicanum</p>
    {#key game.shown}
      <p class="variant" aria-live="polite">
        <span class="dot" style:background={variant.skin[0]}></span>
        Ajolote {variant.label}
        {#if game.shown === 'azul'}<strong> · ¡el más raro!</strong>{/if}
      </p>
    {/key}
  </header>
  <footer>
    <a class="firma" href="https://yoiber.com">Yoiber</a>
    <span class="hint">Mueve el cursor para cambiar el enfoque · Haz clic en el ajolote</span>
  </footer>
</div>
