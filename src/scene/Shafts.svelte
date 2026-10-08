<script>
  import * as THREE from 'three'
  import { T, useTask, useThrelte } from '@threlte/core'
  import { clock } from '../lib/shared'
  import { CEIL, FLOOR } from '../world/cave'

  // Haces de luz que entran por los huecos del techo (planos aditivos que siempre miran a la cámara).
  let { holes } = $props()

  function shaftTexture() {
    const c = document.createElement('canvas')
    c.width = 32
    c.height = 128
    const ctx = c.getContext('2d')
    const img = ctx.createImageData(32, 128)
    for (let y = 0; y < 128; y++) {
      const v = y / 127
      const along = Math.min(1, v / 0.12) * Math.pow(1 - v, 0.7)
      for (let x = 0; x < 32; x++) {
        const u = (x / 31) * 2 - 1
        const a = along * Math.exp(-u * u * 3.5) * 255
        img.data.set([255, 255, 255, a], (y * 32 + x) * 4)
      }
    }
    ctx.putImageData(img, 0, 0)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }

  // Del techo de la cueva hasta el suelo.
  const HEIGHT = CEIL + 2 - FLOOR
  const texture = shaftTexture()
  const geometry = new THREE.PlaneGeometry(2.4, HEIGHT)
  const shafts = holes.map(([x, z]) => {
    const material = new THREE.MeshBasicMaterial({ map: texture, color: '#c8f6ff', transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x + 0.6, FLOOR + HEIGHT / 2 - 0.5, z)
    mesh.rotation.z = 0.12
    mesh.renderOrder = 2
    return mesh
  })

  const { camera } = useThrelte()

  useTask(() => {
    const cam = camera.current
    shafts.forEach((mesh, i) => {
      mesh.rotation.y = Math.atan2(cam.position.x - mesh.position.x, cam.position.z - mesh.position.z)
      mesh.material.opacity = 0.42 + Math.sin(clock.elapsed * 0.6 + i * 1.7) * 0.12
    })
  })
</script>

{#each shafts as mesh}
  <T is={mesh} />
{/each}
