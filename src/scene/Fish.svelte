<script>
  import * as THREE from 'three'
  import { T, useTask } from '@threlte/core'
  import { clock } from '../lib/shared'
  import { fishTextures } from '../world/textures'

  // Un pez tropical que nada en óvalo alrededor de `center`.
  let { colors, center, radius, speed, phase } = $props()

  const U = 1 / 16
  const tex = fishTextures(...colors)
  const materials = tex.box.map((map) => new THREE.MeshLambertMaterial({ map }))
  const finMaterial = new THREE.MeshLambertMaterial({ map: tex.fin, alphaTest: 0.5, side: THREE.DoubleSide })

  const root = new THREE.Group()
  const tail = new THREE.Group()

  useTask(() => {
    const t = clock.elapsed
    const a = t * speed + phase
    const [cx, cy, cz] = center
    const [rx, rz] = radius
    root.position.set(cx + Math.cos(a) * rx, cy + Math.sin(a * 2) * 0.25, cz + Math.sin(a) * rz)
    // Mira hacia donde nada (la tangente del óvalo).
    const dir = Math.sign(speed)
    root.rotation.y = Math.atan2(-Math.sin(a) * rx * dir, Math.cos(a) * rz * dir)
    tail.rotation.y = Math.sin(t * 12 + phase) * 0.5
  })
</script>

<T is={root}>
  <T.Group scale={U * 1.6}>
    <T.Mesh material={materials} castShadow>
      <T.BoxGeometry args={[2, 3, 6]} />
    </T.Mesh>
    <T.Mesh material={finMaterial} position={[0, 2.5, 0.5]} rotation={[0, Math.PI / 2, 0]}>
      <T.PlaneGeometry args={[3, 2]} />
    </T.Mesh>
    <T is={tail} position={[0, 0, -3]}>
      <T.Mesh material={finMaterial} position={[0, 0, -1.5]} rotation={[0, Math.PI / 2, 0]}>
        <T.PlaneGeometry args={[3, 3]} />
      </T.Mesh>
    </T>
  </T.Group>
</T>
