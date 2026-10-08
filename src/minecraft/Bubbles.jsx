import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useStore } from '../store'
import { mouth } from '../scene/shared'
import { CEIL } from './cave'

const MAX = 260

const vertexShader = /* glsl */ `
  attribute float size;
  attribute float alpha;
  uniform float scale;
  varying float vAlpha;
  void main() {
    vAlpha = alpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * scale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`

// Burbuja pixelada de 8×8: un aro claro con un brillo en la esquina.
const fragmentShader = /* glsl */ `
  varying float vAlpha;
  void main() {
    vec2 c = floor(gl_PointCoord * 8.0);
    bool edgeX = c.x == 0.0 || c.x == 7.0;
    bool edgeY = c.y == 0.0 || c.y == 7.0;
    if ((edgeX && edgeY) || vAlpha < 0.01) discard;
    bool ring = edgeX || edgeY;
    bool shine = (c.x == 2.0 && (c.y == 2.0 || c.y == 3.0)) || (c.x == 3.0 && c.y == 2.0);
    float a = ring ? 0.85 : shine ? 0.95 : 0.12;
    vec3 col = shine ? vec3(1.0) : vec3(0.78, 0.93, 1.0);
    a *= vAlpha;
    gl_FragColor = vec4(col * a, a);
    #include <colorspace_fragment>
  }
`

// Columnas de burbujas sobre los bloques de magma y ráfagas desde la boca del ajolote.
export function Bubbles({ sources }) {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const height = useThree((s) => s.size.height)
  const material = useRef()
  const queue = useRef(0)
  const timers = useRef({ column: 0, burst: 0 })
  const uniforms = useMemo(() => ({ scale: { value: 1 } }), [])

  const [geometry, pool] = useMemo(() => {
    const g = new THREE.BufferGeometry()
    for (const [name, size] of [['position', 3], ['size', 1], ['alpha', 1]]) {
      g.setAttribute(name, new THREE.BufferAttribute(new Float32Array(MAX * size), size).setUsage(THREE.DynamicDrawUsage))
    }
    return [g, Array.from({ length: MAX }, () => ({ alive: false, x: 0, y: 0, z: 0, vy: 0, size: 0, phase: 0, age: 0, top: 0 }))]
  }, [])

  useEffect(
    () =>
      useStore.subscribe((state, prev) => {
        if (state.count > prev.count) queue.current += 12
      }),
    [],
  )

  const spawn = (x, y, z, vy, size, top) => {
    const b = pool.find((b) => !b.alive)
    if (b) Object.assign(b, { alive: true, x, y, z, vy, size, top, phase: Math.random() * 10, age: 0 })
  }

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = timers.current

    t.column -= dt
    if (t.column <= 0) {
      t.column = 0.07
      for (const [x, h, z] of sources) {
        if (Math.random() < 0.6) {
          spawn(x + (Math.random() - 0.5) * 0.7, h + 0.55, z + (Math.random() - 0.5) * 0.7, 1.4 + Math.random() * 0.8, 0.1 + Math.random() * 0.06, z <= -7 ? CEIL - 0.6 : 7)
        }
      }
    }

    t.burst -= dt
    while (queue.current > 0 && t.burst <= 0) {
      t.burst += 0.045
      queue.current--
      spawn(mouth.x + (Math.random() - 0.5) * 0.08, mouth.y, mouth.z + (Math.random() - 0.5) * 0.08, 0.7 + Math.random() * 0.5, 0.07 + Math.random() * 0.05, 7)
    }
    if (queue.current === 0) t.burst = Math.max(t.burst, 0)

    for (const b of pool) {
      if (!b.alive) continue
      b.age += dt
      b.y += b.vy * dt
      b.x += Math.sin(b.age * 5 + b.phase) * 0.15 * dt
      if (b.y > b.top) b.alive = false
    }

    const alive = pool.filter((b) => b.alive).sort((a, b) => a.z - b.z)
    const pos = geometry.attributes.position.array
    const size = geometry.attributes.size.array
    const alpha = geometry.attributes.alpha.array
    alive.forEach((b, i) => {
      pos.set([b.x, b.y, b.z], i * 3)
      size[i] = b.size
      alpha[i] = Math.min(1, b.age / 0.15) * Math.min(1, (b.top - b.y) / 0.3)
    })
    geometry.setDrawRange(0, alive.length)
    for (const name of ['position', 'size', 'alpha']) geometry.attributes[name].needsUpdate = true
    // R3F copia los uniforms al material, así que se actualizan a través de la referencia.
    material.current.uniforms.scale.value = (height * gl.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))
  })

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={10}>
      <shaderMaterial ref={material} vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} transparent premultipliedAlpha />
    </points>
  )
}
