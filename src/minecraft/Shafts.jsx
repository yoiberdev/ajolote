import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CEIL, FLOOR } from './cave'

// Haces de luz que entran por los huecos del techo (planos aditivos que siempre miran a la cámara).
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
      const i = (y * 32 + x) * 4
      img.data.set([255, 255, 255, a], i)
    }
  }
  ctx.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function Shafts({ holes }) {
  const texture = useMemo(shaftTexture, [])
  return holes.map(([x, z], i) => <Shaft key={i} x={x} z={z} index={i} texture={texture} />)
}

function Shaft({ x, z, index, texture }) {
  const mesh = useRef()
  // Del techo de la cueva hasta el suelo.
  const height = CEIL + 2 - FLOOR
  useFrame((state) => {
    const cam = state.camera
    mesh.current.rotation.y = Math.atan2(cam.position.x - mesh.current.position.x, cam.position.z - mesh.current.position.z)
    mesh.current.material.opacity = 0.42 + Math.sin(state.clock.elapsedTime * 0.6 + index * 1.7) * 0.12
  })
  return (
    <mesh ref={mesh} position={[x + 0.6, FLOOR + height / 2 - 0.5, z]} rotation-z={0.12} renderOrder={2}>
      <planeGeometry args={[2.4, height]} />
      <meshBasicMaterial map={texture} color="#c8f6ff" transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
    </mesh>
  )
}
