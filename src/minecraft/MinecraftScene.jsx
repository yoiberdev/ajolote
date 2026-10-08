import * as THREE from 'three'
import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Bloom, BrightnessContrast, DepthOfField, EffectComposer, HueSaturation, Vignette } from '@react-three/postprocessing'
import { mouth, pointer } from '../scene/shared'
import { MarineSnow } from '../scene/MarineSnow'
import { generateWorld } from './cave'
import { waterUniforms } from './materials'
import { World } from './World'
import { Axolotl } from './Axolotl'
import { Fishes } from './Fish'
import { Bubbles } from './Bubbles'
import { Shafts } from './Shafts'

export const CAMERA = { position: [0, 0.25, 3.3], fov: 35, near: 0.05, far: 60 }
const WATER = '#13566a'

const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const touchOnly = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches

export function MinecraftScene() {
  const world = useMemo(() => generateWorld(), [])
  const dof = useRef()
  useFrame((_, delta) => {
    waterUniforms.uTime.value += Math.min(delta, 0.1)
  })

  return (
    <>
      <color attach="background" args={[WATER]} />
      <fogExp2 attach="fog" args={[WATER, 0.07]} />
      <hemisphereLight args={['#9fe6f0', '#4f7f86', 1]} />
      <directionalLight
        position={[1.5, 10, 8]}
        intensity={1.25}
        color="#dcf7ff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={11}
        shadow-camera-bottom={-11}
        shadow-camera-far={40}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      {world.lights.map((l, i) => (
        <pointLight key={i} position={l.pos} color={l.color} intensity={l.intensity} distance={l.distance} decay={1.5} />
      ))}

      <World world={world} />
      <Axolotl />
      <Fishes />
      <Shafts holes={world.holes} />
      <Bubbles sources={world.magma} />
      <MarineSnow count={600} box={[16, 8]} depth={[-12, 2.5]} offset={[0, 1]} size={0.014} />
      <Rig dof={dof} />

      <EffectComposer multisampling={0}>
        <DepthOfField ref={dof} focusDistance={3.3} focusRange={2.4} bokehScale={5} resolutionScale={0.5} />
        <Bloom luminanceThreshold={1} luminanceSmoothing={0.1} intensity={1.2} mipmapBlur />
        <HueSaturation saturation={0.22} />
        <BrightnessContrast brightness={-0.02} contrast={0.12} />
        <Vignette offset={0.25} darkness={0.65} />
      </EffectComposer>
    </>
  )
}

// La cámara orbita un poco con el puntero (parallax real en 3D) y el enfoque viaja
// entre el ajolote, el fondo de la cueva y las plantas junto a la cámara.
function Rig({ dof }) {
  const focus = useRef(3.3)
  const [target] = useState(() => new THREE.Vector3())
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1)
    const t = state.clock.elapsedTime
    const drift = pointer.lastMove === -Infinity || (touchOnly && performance.now() - pointer.lastMove > 3000)
    const tx = drift ? (reducedMotion ? 0 : Math.sin(t * 0.23) * 0.55) : pointer.targetX
    const ty = drift ? (reducedMotion ? 0 : Math.sin(t * 0.17 + 1) * 0.3) : pointer.targetY
    pointer.x = THREE.MathUtils.damp(pointer.x, tx, 3, dt)
    pointer.y = THREE.MathUtils.damp(pointer.y, ty, 3, dt)

    const cam = state.camera
    const [x0, y0, zBase] = CAMERA.position
    // En pantallas verticales la cámara se aleja para que el ajolote quepa a lo ancho.
    const z0 = Math.max(zBase, 0.95 / (Math.tan(THREE.MathUtils.degToRad(CAMERA.fov / 2)) * state.viewport.aspect))
    cam.position.set(x0 + pointer.x * 0.8, y0 + pointer.y * 0.4, z0 - Math.abs(pointer.x) * 0.15)
    cam.lookAt(0, -0.02, 0)

    // Arriba a la derecha enfoca el fondo; abajo a la izquierda, lo que está pegado a la cámara.
    const k = ((pointer.x + pointer.y) / 2 + 1) / 2
    const back = THREE.MathUtils.smoothstep(k, 0.6, 0.95)
    const front = 1 - THREE.MathUtils.smoothstep(k, 0.02, 0.22)
    // Por defecto, la cara del ajolote (lo más cercano y expresivo).
    if (drift) target.copy(mouth)
    else target.copy(mouth).lerp(new THREE.Vector3(0, 1.5, -11), back).lerp(new THREE.Vector3(0, 0, 1.8), front)
    focus.current = THREE.MathUtils.damp(focus.current, cam.position.distanceTo(target), 4, dt)
    if (dof.current) dof.current.cocMaterial.focusDistance = focus.current
  })
  return null
}
