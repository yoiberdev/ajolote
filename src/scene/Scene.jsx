import * as THREE from 'three'
import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { EffectComposer, DepthOfField, Noise, Vignette } from '@react-three/postprocessing'
import { CAM_Z, prepTextures, useFrustum } from './layout'
import { pointer } from './shared'
import { Plane } from './Plane'
import { LightRays } from './LightRays'
import { Axolotl } from './Axolotl'
import { Bubbles } from './Bubbles'
import { MarineSnow } from './MarineSnow'
import art from './art.json'

const URLS = {
  background: '/layers/background.webp',
  rock: '/layers/rock.webp',
  plantsLeft: '/layers/plants-left.webp',
  plantsRight: '/layers/plants-right.webp',
}

const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const touchOnly = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches

export function Scene() {
  const tex = useTexture(URLS, prepTextures)
  const dof = useRef()
  const { at, landscape } = useFrustum()

  // Fondo: la foto cubre todo el encuadre con margen para el parallax, desplazada para que
  // los rayos de sol queden arriba a la derecha.
  const bgZ = -12
  const bg = at(bgZ)
  const bgW = Math.max(bg.w * 1.3, bg.h * 1.3 * art.background.aspect)
  const bgH = bgW / art.background.aspect

  // Roca con musgo, bajo el ajolote.
  const rockZ = -3
  const rk = at(rockZ)
  const rockW = landscape ? rk.w * 0.5 : rk.w * 1.3
  const rockH = rockW / art.rock.aspect

  // Plantas lejanas (las mismas fotos, más pequeñas y con bruma).
  const farZ = -7
  const far = at(farZ)
  const farH = far.h * (landscape ? 0.55 : 0.4)

  // Plantas del frente: más altas que el encuadre para que nunca se vea su borde superior.
  const nearZ = 4
  const near = at(nearZ)
  const nearH = near.h * 1.2
  const nearVisible = landscape ? 0.32 : 0.26

  return (
    <>
      <Rig dof={dof} />
      <Plane texture={tex.background} width={bgW} height={bgH} position={[-bgW * 0.08, bg.h * 0.02, bgZ]} />
      <LightRays z={-9} />
      <Plane
        texture={tex.plantsLeft}
        width={farH * art['plants-left'].aspect}
        height={farH}
        position={[-far.w * 0.36, -far.h / 2 + farH / 2 - far.h * 0.02, farZ - 1]}
        segments={[4, 24]}
        mode={1}
        wiggle={0.03}
        speed={0.7}
        freq={2.2}
        haze={0.45}
      />
      <Plane
        texture={tex.plantsRight}
        width={farH * art['plants-right'].aspect}
        height={farH}
        position={[far.w * 0.3, -far.h / 2 + farH / 2 - far.h * 0.03, farZ]}
        segments={[4, 24]}
        flip
        mode={1}
        wiggle={0.03}
        speed={0.8}
        freq={2.2}
        phase={2}
        haze={0.35}
      />
      <Plane
        texture={tex.rock}
        width={rockW}
        height={rockH}
        position={[-rk.w * 0.03, -rk.h / 2 + rockH / 2 - rk.h * 0.06, rockZ]}
        haze={0.12}
        caustics={0.12}
      />
      <Axolotl />
      <Plane
        texture={tex.plantsLeft}
        width={nearH * art['plants-left'].aspect}
        height={nearH}
        position={[-near.w / 2 + nearH * art['plants-left'].aspect * (nearVisible - 0.5), -near.h / 2 + nearH / 2 - near.h * 0.06, nearZ]}
        segments={[6, 40]}
        mode={1}
        wiggle={0.035}
        speed={0.9}
        freq={2.4}
        phase={1}
      />
      <Plane
        texture={tex.plantsRight}
        width={nearH * art['plants-right'].aspect}
        height={nearH}
        position={[near.w / 2 - nearH * art['plants-right'].aspect * (nearVisible - 0.5), -near.h / 2 + nearH / 2 - near.h * 0.06, nearZ - 0.6]}
        segments={[6, 40]}
        mode={1}
        wiggle={0.035}
        speed={1.05}
        freq={2.4}
        phase={4}
      />
      <Bubbles />
      <MarineSnow />
      <EffectComposer multisampling={0}>
        <DepthOfField ref={dof} focusDistance={CAM_Z} focusRange={5} bokehScale={6} resolutionScale={0.5} />
        <Noise opacity={0.035} />
        <Vignette offset={0.25} darkness={0.6} />
      </EffectComposer>
    </>
  )
}

// La cámara sigue al puntero (parallax) y el enfoque viaja entre el ajolote, el fondo y el frente.
function Rig({ dof }) {
  const focus = useRef(CAM_Z)
  const [target] = useState(() => new THREE.Vector3())
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1)
    const t = state.clock.elapsedTime
    // Sin ratón (pantallas táctiles, o antes del primer movimiento) la cámara deriva sola.
    const drift = pointer.lastMove === -Infinity || (touchOnly && performance.now() - pointer.lastMove > 3000)
    const tx = drift ? (reducedMotion ? 0 : Math.sin(t * 0.23) * 0.55) : pointer.targetX
    const ty = drift ? (reducedMotion ? 0 : Math.sin(t * 0.17 + 1) * 0.3) : pointer.targetY
    pointer.x = THREE.MathUtils.damp(pointer.x, tx, 3, dt)
    pointer.y = THREE.MathUtils.damp(pointer.y, ty, 3, dt)

    const cam = state.camera
    cam.position.set(pointer.x * 2.2, pointer.y * 1.1, CAM_Z)
    cam.lookAt(0, 0, 0)

    // Arriba a la derecha enfoca el fondo; abajo a la izquierda, las plantas del frente.
    const k = ((pointer.x + pointer.y) / 2 + 1) / 2
    const back = THREE.MathUtils.smoothstep(k, 0.6, 0.95)
    const front = 1 - THREE.MathUtils.smoothstep(k, 0.02, 0.22)
    const focusZ = drift ? 0 : -10 * back + 4 * front
    focus.current = THREE.MathUtils.damp(focus.current, cam.position.distanceTo(target.set(0, 0, focusZ)), 4, dt)
    if (dof.current) dof.current.cocMaterial.focusDistance = focus.current
  })
  return null
}
