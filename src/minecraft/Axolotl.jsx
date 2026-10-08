import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../store'
import { mouth, pointer } from '../scene/shared'
import { axolotlTextures } from './textures'

// Las medidas del modelo están en "píxeles" (1/16 de bloque), como los modelos del juego.
const U = 1 / 16
const MOUTH_LOCAL = new THREE.Vector3(0, -1.6, 5.4) // dentro del grupo de la cabeza

function useMaterials(textures, flat = false) {
  return useMemo(
    () =>
      [textures].flat().map((map) => new THREE.MeshLambertMaterial({ map, alphaTest: flat ? 0.5 : 0, side: flat ? THREE.DoubleSide : THREE.FrontSide })),
    [textures, flat],
  )
}

function Box({ size, textures, alpha = false, ...props }) {
  const materials = useMaterials(textures, alpha)
  return (
    <mesh material={materials} castShadow receiveShadow {...props}>
      <boxGeometry args={size} />
    </mesh>
  )
}

function Flat({ size, texture, ...props }) {
  const [material] = useMaterials(texture, true)
  return (
    <mesh material={material} castShadow {...props}>
      <planeGeometry args={size} />
    </mesh>
  )
}

export function Axolotl() {
  const shown = useStore((s) => s.shown)
  const tex = useMemo(() => axolotlTextures(shown), [shown])
  const inc = useStore((s) => s.inc)
  const root = useRef()
  const swim = useRef()
  const head = useRef()
  const gills = { top: useRef(), left: useRef(), right: useRef() }
  const legs = [useRef(), useRef(), useRef(), useRef()]
  const tail = useRef()
  const roll = useRef({ t: 1 })

  useEffect(
    () =>
      useStore.subscribe((state, prev) => {
        if (state.count > prev.count) roll.current.t = 0
      }),
    [],
  )

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const dt = Math.min(delta, 0.05)

    // Flota en el sitio con un vaivén lento.
    root.current.position.set(Math.sin(t * 0.4) * 0.08, 0.06 + Math.sin(t * 1.1) * 0.05, Math.sin(t * 0.3) * 0.05)
    root.current.rotation.y = 0.75 + Math.sin(t * 0.35) * 0.12

    // Al subir el contador da una voltereta.
    const r = roll.current
    const before = r.t
    r.t = Math.min(1, r.t + dt / 0.9)
    // Cambia de color justo cuando está boca abajo.
    if (before < 0.5 && r.t >= 0.5) {
      const { variant, shown } = useStore.getState()
      if (variant !== shown) useStore.setState({ shown: variant })
    }
    const ease = 1 - Math.pow(1 - r.t, 3)
    swim.current.rotation.z = Math.sin(t * 1.3) * 0.05 + ease * Math.PI * 2 * (r.t < 1 ? 1 : 0)
    swim.current.rotation.x = Math.sin(t * 1.1 + 1) * 0.04

    // La cabeza mira un poco hacia el cursor.
    head.current.rotation.y = THREE.MathUtils.damp(head.current.rotation.y, -0.55 + pointer.x * 0.45, 4, dt)
    head.current.rotation.x = THREE.MathUtils.damp(head.current.rotation.x, -pointer.y * 0.25, 4, dt)

    const flutter = Math.sin(t * 3.2) * 0.12
    gills.top.current.rotation.x = -0.45 + flutter
    gills.right.current.rotation.y = 0.3 + flutter
    gills.left.current.rotation.y = -0.3 - flutter

    // Patas remando (las de cada lado en contrafase) y cola ondulando.
    legs.forEach((leg, i) => {
      const side = i % 2 ? -1 : 1
      const phase = i < 2 ? 0 : Math.PI
      leg.current.rotation.z = side * (-0.3 + Math.sin(t * 2.4 + phase + (side > 0 ? 0 : Math.PI)) * 0.22)
      leg.current.rotation.y = side * Math.sin(t * 2.4 + phase) * 0.35
    })
    tail.current.rotation.y = Math.sin(t * 2.6) * 0.35

    mouth.copy(MOUTH_LOCAL).applyMatrix4(head.current.matrixWorld)
  })

  const legPivots = [
    [4, -2, 3],
    [-4, -2, 3],
    [4, -2, -3.5],
    [-4, -2, -3.5],
  ]

  return (
    <group ref={root}>
      <group ref={swim} scale={U}>
        <Box size={[8, 4, 10]} textures={tex.body} />

        <group ref={head} position={[0, 0.5, 5]}>
          <Box size={[8, 5, 5]} position={[0, 0, 2.5]} textures={tex.head} />
          <group ref={gills.top} position={[0, 2.5, 1]}>
            <Flat size={[8, 4]} position={[0, 2, 0]} texture={tex.gillTop} />
          </group>
          <group ref={gills.right} position={[4, 0.5, 1.5]}>
            <Flat size={[5, 8]} position={[2.5, 0.5, 0]} texture={tex.gillSide} />
          </group>
          <group ref={gills.left} position={[-4, 0.5, 1.5]}>
            <Flat size={[5, 8]} position={[-2.5, 0.5, 0]} scale={[-1, 1, 1]} texture={tex.gillSide} />
          </group>
        </group>

        {legPivots.map((p, i) => (
          <group key={i} ref={legs[i]} position={p}>
            <Box size={[4, 1, 3]} position={[p[0] > 0 ? 2 : -2, 0, 0]} textures={tex.leg} />
          </group>
        ))}

        <group ref={tail} position={[0, 0.5, -5]}>
          <Box size={[1, 5, 12]} position={[0, 0, -6]} textures={tex.tail} alpha />
        </group>
      </group>

      {/* Zona para hacer clic, un poco más grande que el cuerpo. */}
      <mesh
        position={[0, 0.05, 0.1]}
        onClick={(e) => {
          e.stopPropagation()
          inc()
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <sphereGeometry args={[0.55, 16, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  )
}
