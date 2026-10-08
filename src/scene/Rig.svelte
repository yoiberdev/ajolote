<script>
  import * as THREE from 'three'
  import { useTask, useThrelte } from '@threlte/core'
  import { clock, focus, mouth, pointer } from '../lib/shared'
  import { CAMERA } from './Scene.svelte'

  // La cámara orbita un poco con el puntero (parallax real en 3D) y el enfoque viaja
  // entre el ajolote, el fondo de la cueva y las plantas junto a la cámara.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const touchOnly = window.matchMedia('(hover: none)').matches
  const BACK = new THREE.Vector3(0, 1.5, -11)
  const FRONT = new THREE.Vector3(0, 0, 1.8)

  const { camera, size } = useThrelte()
  const target = new THREE.Vector3()

  useTask((delta) => {
    const dt = Math.min(delta, 0.1)
    const t = clock.elapsed
    const drift = pointer.lastMove === -Infinity || (touchOnly && performance.now() - pointer.lastMove > 3000)
    const tx = drift ? (reducedMotion ? 0 : Math.sin(t * 0.23) * 0.55) : pointer.targetX
    const ty = drift ? (reducedMotion ? 0 : Math.sin(t * 0.17 + 1) * 0.3) : pointer.targetY
    pointer.x = THREE.MathUtils.damp(pointer.x, tx, 3, dt)
    pointer.y = THREE.MathUtils.damp(pointer.y, ty, 3, dt)

    const cam = camera.current
    const [x0, y0, zBase] = CAMERA.position
    // En pantallas verticales la cámara se aleja para que el ajolote quepa a lo ancho.
    const aspect = size.current.width / size.current.height
    const z0 = Math.max(zBase, 0.95 / (Math.tan(THREE.MathUtils.degToRad(CAMERA.fov / 2)) * aspect))
    cam.position.set(x0 + pointer.x * 0.8, y0 + pointer.y * 0.4, z0 - Math.abs(pointer.x) * 0.15)
    cam.lookAt(0, -0.02, 0)

    // Arriba a la derecha enfoca el fondo; abajo a la izquierda, lo que está pegado a la cámara.
    const k = ((pointer.x + pointer.y) / 2 + 1) / 2
    const back = THREE.MathUtils.smoothstep(k, 0.6, 0.95)
    const front = 1 - THREE.MathUtils.smoothstep(k, 0.02, 0.22)
    // Por defecto, la cara del ajolote (lo más cercano y expresivo).
    if (drift) target.copy(mouth)
    else target.copy(mouth).lerp(BACK, back).lerp(FRONT, front)
    focus.distance = THREE.MathUtils.damp(focus.distance, cam.position.distanceTo(target), 4, dt)
  })
</script>
