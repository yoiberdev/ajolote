import * as THREE from 'three'
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { useStore } from '../store'
import { useFrustum, prepTextures } from './layout'
import { mouth, pointer } from './shared'
import { Plane } from './Plane'
import art from './art.json'

const A = art.axolotl
// Punto de la boca en coordenadas locales del plano (-0.5..0.5).
const MOUTH_LOCAL = new THREE.Vector3(A.mouth[0] - 0.5, A.mouth[1] - 0.5, 0.05)

export function Axolotl() {
  const texture = useTexture('/layers/axolotl.webp', prepTextures)
  const inc = useStore((s) => s.inc)
  const group = useRef()
  const hop = useRef({ x: 0, v: 0 })
  const { at, landscape } = useFrustum()

  const f = at(0)
  const width = landscape ? Math.min(f.w * 0.6, f.h * 0.8 * A.aspect) : f.w * 0.98
  const height = width / A.aspect
  // Casi centrado, con la cabeza un poco a la derecha del centro y la cola hacia la izquierda.
  const baseX = landscape ? -(A.head[0] - 0.5) * width * 0.6 : 0
  const baseY = landscape ? -f.h * 0.05 : f.h * 0.03

  useEffect(
    () =>
      useStore.subscribe((state, prev) => {
        if (state.count > prev.count) hop.current.v += 3.5
      }),
    [],
  )

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    const g = group.current

    // Un resorte para el impulso cuando sube el contador.
    const h = hop.current
    h.v += (-120 * h.x - 9 * h.v) * dt
    h.x += h.v * dt

    g.position.set(
      baseX + Math.sin(t * 0.37) * 0.025 * width,
      baseY + Math.sin(t * 0.9) * 0.025 * height + h.x * 0.15 * height,
      0,
    )
    g.rotation.z = Math.sin(t * 0.6) * 0.025 + pointer.x * -0.03 + h.x * 0.06
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, pointer.x * 0.12, 4, dt)
    const breathe = 1 + Math.sin(t * 1.7) * 0.006
    g.scale.set(width * breathe * (1 + h.x * 0.04), height * breathe * (1 + h.x * 0.04), 1)

    mouth.copy(MOUTH_LOCAL).applyMatrix4(g.matrixWorld)
  })

  return (
    <group ref={group}>
      <Plane
        texture={texture}
        width={1}
        height={1}
        segments={[64, 32]}
        mode={2}
        wiggle={0.035}
        speed={1.6}
        freq={9}
        head={A.head}
        tailEnd={A.tailEnd}
        gillInner={A.gillInner}
        gillOuter={A.gillOuter}
        aspect={A.aspect}
        haze={0.08}
        caustics={0.06}
      />
      <mesh
        position={[A.head[0] - 0.5, A.head[1] - 0.55, 0.02]}
        scale={[1 / A.aspect, 1, 1]}
        onClick={(e) => {
          e.stopPropagation()
          inc()
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <circleGeometry args={[0.36, 32]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  )
}
