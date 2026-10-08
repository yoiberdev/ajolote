<script>
  import * as THREE from 'three'
  import { T, useTask, useThrelte } from '@threlte/core'
  import { game, inc } from '../lib/state.svelte.js'
  import { clock, mouth, pointer } from '../lib/shared'
  import { axolotlTextures } from '../world/textures'

  // Las medidas del modelo están en "píxeles" (1/16 de bloque), como los modelos del juego.
  const U = 1 / 16
  const MOUTH_LOCAL = new THREE.Vector3(0, -1.6, 5.4) // dentro del grupo de la cabeza
  const LEG_PIVOTS = [
    [4, -2, 3],
    [-4, -2, 3],
    [4, -2, -3.5],
    [-4, -2, -3.5],
  ]

  // Un juego de materiales por textura. Las texturas de cada color ya vienen memorizadas, así que
  // volver a un color ya visto reutiliza sus materiales.
  const caches = { solid: new WeakMap(), flat: new WeakMap() }
  function mats(textures, flat = false) {
    const cache = flat ? caches.flat : caches.solid
    let list = cache.get(textures)
    if (!list) {
      list = [textures].flat().map((map) => new THREE.MeshLambertMaterial({ map, alphaTest: flat ? 0.5 : 0, side: flat ? THREE.DoubleSide : THREE.FrontSide }))
      cache.set(textures, list)
    }
    return list
  }

  const tex = $derived(axolotlTextures(game.shown))

  // Las piezas que se animan, creadas aquí para tenerlas a mano en cada fotograma.
  const root = new THREE.Group()
  const swim = new THREE.Group()
  const head = new THREE.Group()
  const gills = { top: new THREE.Group(), left: new THREE.Group(), right: new THREE.Group() }
  const legs = LEG_PIVOTS.map(() => new THREE.Group())
  const tail = new THREE.Group()
  const roll = { t: 1, seen: game.count }

  // Zona para hacer clic, un poco más grande que el cuerpo: una esfera invisible contra la que se
  // lanza un rayo desde el cursor.
  const hitArea = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 16, 12),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
  )
  hitArea.position.set(0, 0.05, 0.1)

  const { camera, canvas } = useThrelte()
  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  function overAxolotl(e) {
    const r = canvas.getBoundingClientRect()
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    raycaster.setFromCamera(ndc, camera.current)
    return raycaster.intersectObject(hitArea).length > 0
  }

  $effect(() => {
    let hovering = false
    const onClick = (e) => overAxolotl(e) && inc()
    const onMove = (e) => {
      const over = overAxolotl(e)
      if (over !== hovering) canvas.style.cursor = (hovering = over) ? 'pointer' : ''
    }
    canvas.addEventListener('click', onClick)
    canvas.addEventListener('pointermove', onMove)
    return () => {
      canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('pointermove', onMove)
    }
  })

  useTask((delta) => {
    const t = clock.elapsed
    const dt = Math.min(delta, 0.05)

    // Flota en el sitio con un vaivén lento.
    root.position.set(Math.sin(t * 0.4) * 0.08, 0.06 + Math.sin(t * 1.1) * 0.05, Math.sin(t * 0.3) * 0.05)
    root.rotation.y = 0.75 + Math.sin(t * 0.35) * 0.12

    // Con cada clic da una voltereta.
    if (game.count > roll.seen) {
      roll.seen = game.count
      roll.t = 0
    }
    const before = roll.t
    roll.t = Math.min(1, roll.t + dt / 0.9)
    // Cambia de color justo cuando está boca abajo.
    if (before < 0.5 && roll.t >= 0.5 && game.variant !== game.shown) game.shown = game.variant
    const ease = 1 - Math.pow(1 - roll.t, 3)
    swim.rotation.z = Math.sin(t * 1.3) * 0.05 + ease * Math.PI * 2 * (roll.t < 1 ? 1 : 0)
    swim.rotation.x = Math.sin(t * 1.1 + 1) * 0.04

    // La cabeza mira un poco hacia el cursor.
    head.rotation.y = THREE.MathUtils.damp(head.rotation.y, -0.55 + pointer.x * 0.45, 4, dt)
    head.rotation.x = THREE.MathUtils.damp(head.rotation.x, -pointer.y * 0.25, 4, dt)

    const flutter = Math.sin(t * 3.2) * 0.12
    gills.top.rotation.x = -0.45 + flutter
    gills.right.rotation.y = 0.3 + flutter
    gills.left.rotation.y = -0.3 - flutter

    // Patas remando (las de cada lado en contrafase) y cola ondulando.
    legs.forEach((leg, i) => {
      const side = i % 2 ? -1 : 1
      const phase = i < 2 ? 0 : Math.PI
      leg.rotation.z = side * (-0.3 + Math.sin(t * 2.4 + phase + (side > 0 ? 0 : Math.PI)) * 0.22)
      leg.rotation.y = side * Math.sin(t * 2.4 + phase) * 0.35
    })
    tail.rotation.y = Math.sin(t * 2.6) * 0.35

    mouth.copy(MOUTH_LOCAL).applyMatrix4(head.matrixWorld)
  })
</script>

{#snippet box(size, textures, position = [0, 0, 0], alpha = false)}
  <T.Mesh material={mats(textures, alpha)} {position} castShadow receiveShadow>
    <T.BoxGeometry args={size} />
  </T.Mesh>
{/snippet}

{#snippet flat(size, texture, position, scale = [1, 1, 1])}
  <T.Mesh material={mats(texture, true)[0]} {position} {scale} castShadow>
    <T.PlaneGeometry args={size} />
  </T.Mesh>
{/snippet}

<T is={root}>
  <T is={swim} scale={U}>
    {@render box([8, 4, 10], tex.body)}

    <T is={head} position={[0, 0.5, 5]}>
      {@render box([8, 5, 5], tex.head, [0, 0, 2.5])}
      <T is={gills.top} position={[0, 2.5, 1]}>
        {@render flat([8, 4], tex.gillTop, [0, 2, 0])}
      </T>
      <T is={gills.right} position={[4, 0.5, 1.5]}>
        {@render flat([5, 8], tex.gillSide, [2.5, 0.5, 0])}
      </T>
      <T is={gills.left} position={[-4, 0.5, 1.5]}>
        {@render flat([5, 8], tex.gillSide, [-2.5, 0.5, 0], [-1, 1, 1])}
      </T>
    </T>

    {#each LEG_PIVOTS as pivot, i}
      <T is={legs[i]} position={pivot}>
        {@render box([4, 1, 3], tex.leg, [pivot[0] > 0 ? 2 : -2, 0, 0])}
      </T>
    {/each}

    <T is={tail} position={[0, 0.5, -5]}>
      {@render box([1, 5, 12], tex.tail, [0, 0, -6], true)}
    </T>
  </T>

  <T is={hitArea} />
</T>
