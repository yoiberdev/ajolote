import * as THREE from 'three'
import { useRef } from 'react'
import { extend, useFrame } from '@react-three/fiber'
import { shaderMaterial } from '@react-three/drei'
import { useFrustum } from './layout'

// Rayos de sol que se mueven despacio sobre la foto del fondo (mezcla aditiva).
const RaysMaterial = shaderMaterial(
  { time: 0, source: new THREE.Vector2(0.72, 1.3), color: new THREE.Color('#bff3ee'), strength: 0.14 },
  /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* glsl */ `
    uniform float time;
    uniform vec2 source;
    uniform vec3 color;
    uniform float strength;
    varying vec2 vUv;
    void main() {
      vec2 d = vUv - source;
      float ang = atan(d.x, -d.y);
      float rays = (sin(ang * 26.0 + time * 0.27) * 0.5 + 0.5) * (sin(ang * 41.0 - time * 0.19 + 1.3) * 0.5 + 0.5);
      rays += (sin(ang * 14.0 + time * 0.11 + 2.0) * 0.5 + 0.5) * 0.4;
      rays = pow(rays, 2.4);
      float falloff = smoothstep(0.15, 1.0, vUv.y) * smoothstep(1.8, 0.45, length(d));
      float a = rays * falloff * strength;
      gl_FragColor = vec4(color * a, 0.0);
      #include <colorspace_fragment>
    }
  `,
)

extend({ RaysMaterial })

export function LightRays({ z }) {
  const material = useRef()
  const { at } = useFrustum()
  const f = at(z)
  useFrame((_, delta) => {
    material.current.time += Math.min(delta, 0.1)
  })
  return (
    <mesh position={[0, 0, z]} scale={[f.w * 1.4, f.h * 1.4, 1]} renderOrder={1}>
      <planeGeometry />
      <raysMaterial ref={material} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  )
}
