import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { fishTextures } from './textures'

const U = 1 / 16

// Peces tropicales nadando en óvalos por el fondo de la cueva.
const SCHOOL = [
  { colors: ['#ff8a1f', '#ffffff'], center: [1.5, 0.9, -5.5], radius: [3.2, 1.8], speed: 0.32, phase: 0 },
  { colors: ['#3aa0ff', '#ffe14a'], center: [1.9, 1.15, -5.8], radius: [3.0, 1.6], speed: 0.32, phase: 0.35 },
  { colors: ['#ff4d6d', '#ffd0d8'], center: [-3, 1.6, -8], radius: [4, 2.2], speed: -0.24, phase: 2 },
  { colors: ['#ffe14a', '#2b2b2b'], center: [-2.5, 0.5, -4], radius: [2.2, 1.2], speed: 0.4, phase: 4 },
  { colors: ['#7cff8a', '#2a7fff'], center: [4, 2.2, -10], radius: [3.5, 2], speed: -0.28, phase: 1 },
]

export function Fishes() {
  return SCHOOL.map((fish, i) => <Fish key={i} {...fish} />)
}

function Fish({ colors, center, radius, speed, phase }) {
  const root = useRef()
  const tail = useRef()
  const tex = useMemo(() => fishTextures(...colors), [colors])
  const materials = useMemo(() => tex.box.map((map) => new THREE.MeshLambertMaterial({ map })), [tex])
  const finMaterial = useMemo(() => new THREE.MeshLambertMaterial({ map: tex.fin, alphaTest: 0.5, side: THREE.DoubleSide }), [tex])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const a = t * speed + phase
    const [cx, cy, cz] = center
    const [rx, rz] = radius
    root.current.position.set(cx + Math.cos(a) * rx, cy + Math.sin(a * 2) * 0.25, cz + Math.sin(a) * rz)
    // Mira hacia donde nada (la tangente del óvalo).
    const dir = Math.sign(speed)
    root.current.rotation.y = Math.atan2(-Math.sin(a) * rx * dir, Math.cos(a) * rz * dir)
    tail.current.rotation.y = Math.sin(t * 12 + phase) * 0.5
  })

  return (
    <group ref={root}>
      <group scale={U * 1.6}>
        <mesh material={materials} castShadow>
          <boxGeometry args={[2, 3, 6]} />
        </mesh>
        <mesh material={finMaterial} position={[0, 2.5, 0.5]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[3, 2]} />
        </mesh>
        <group ref={tail} position={[0, 0, -3]}>
          <mesh material={finMaterial} position={[0, 0, -1.5]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[3, 3]} />
          </mesh>
        </group>
      </group>
    </group>
  )
}
