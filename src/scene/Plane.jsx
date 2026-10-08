import * as THREE from 'three'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import './LayerMaterial'

// Un plano con una capa de la ilustración. Las props que no son de la malla van al material.
export function Plane({ texture, width, height, position = [0, 0, 0], segments = [1, 1], flip = false, renderOrder, ...uniforms }) {
  const material = useRef()
  useFrame((_, delta) => {
    if (material.current) material.current.time += Math.min(delta, 0.1)
  })
  return (
    <mesh position={position} scale={[width * (flip ? -1 : 1), height, 1]} renderOrder={renderOrder}>
      <planeGeometry args={[1, 1, segments[0], segments[1]]} />
      <layerMaterial ref={material} tex={texture} transparent premultipliedAlpha side={THREE.DoubleSide} {...uniforms} />
    </mesh>
  )
}
