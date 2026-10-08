import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useStore } from '../store'
import { mouth } from './shared'
import { useFrustum } from './layout'

const MAX = 200

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

const fragmentShader = /* glsl */ `
  varying float vAlpha;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    p.y = -p.y;
    float r = length(p);
    if (r > 1.0 || vAlpha < 0.01) discard;
    float rim = smoothstep(0.62, 0.9, r) * (1.0 - smoothstep(0.93, 1.0, r));
    float shine = 1.0 - smoothstep(0.0, 0.3, length(p - vec2(-0.36, 0.38)));
    float a = clamp(0.1 + rim * 0.75 + shine * 0.9, 0.0, 1.0) * vAlpha;
    vec3 col = mix(vec3(0.72, 0.95, 1.0), vec3(1.0), shine);
    gl_FragColor = vec4(col * a, a);
    #include <colorspace_fragment>
  }
`

export function Bubbles() {
  const { at, pxPerUnit } = useFrustum()
  const gl = useThree((s) => s.gl)
  const frustum = useRef(at)
  frustum.current = at
  const material = useRef()
  const uniforms = useMemo(() => ({ scale: { value: 1 } }), [])
  const queue = useRef(0)
  const timers = useRef({ ambient: 0.4, burst: 0 })

  const [geometry, pool] = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX * 3), 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('size', new THREE.BufferAttribute(new Float32Array(MAX), 1).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(MAX), 1).setUsage(THREE.DynamicDrawUsage))
    const bubbles = Array.from({ length: MAX }, () => ({ alive: false, x: 0, y: 0, z: 0, vy: 0, size: 0, phase: 0, age: 0 }))
    return [g, bubbles]
  }, [])

  useEffect(
    () =>
      useStore.subscribe((state, prev) => {
        if (state.count > prev.count) queue.current += 14
      }),
    [],
  )

  const spawn = (x, y, z, vy, size) => {
    const b = pool.find((b) => !b.alive)
    if (!b) return
    Object.assign(b, { alive: true, x, y, z, vy, size, phase: Math.random() * 10, age: 0 })
  }

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const fz = frustum.current
    const t = timers.current

    // Burbujas sueltas que suben desde abajo, a veces en fila.
    t.ambient -= dt
    if (t.ambient <= 0) {
      t.ambient = 0.22 + Math.random() * 0.4
      const z = THREE.MathUtils.lerp(-7, 3.5, Math.random())
      const f = fz(z)
      const x = (Math.random() - 0.5) * f.w * 1.1
      const n = Math.random() < 0.3 ? 3 + Math.floor(Math.random() * 3) : 1
      for (let i = 0; i < n; i++) {
        spawn(x + (Math.random() - 0.5) * 0.15, -f.h / 2 - 0.6 - i * 0.5, z, 0.8 + Math.random() * 0.6, 0.06 + Math.random() * 0.14)
      }
    }

    // Ráfaga desde la boca del ajolote.
    t.burst -= dt
    while (queue.current > 0 && t.burst <= 0) {
      t.burst += 0.035
      queue.current--
      spawn(
        mouth.x + (Math.random() - 0.5) * 0.3,
        mouth.y + (Math.random() - 0.5) * 0.1,
        mouth.z + 0.1 + Math.random() * 0.4,
        1.3 + Math.random() * 1.3,
        0.07 + Math.random() * 0.22,
      )
    }
    if (queue.current === 0) t.burst = Math.max(t.burst, 0)

    for (const b of pool) {
      if (!b.alive) continue
      b.age += dt
      b.vy = Math.min(b.vy + dt * 0.3, 3)
      b.y += b.vy * dt
      b.x += Math.sin(b.age * 2.6 + b.phase) * 0.35 * dt
      if (b.y > fz(b.z).h / 2 + 2) b.alive = false
    }

    // De atrás hacia adelante, para que las transparencias se mezclen bien.
    const alive = pool.filter((b) => b.alive).sort((a, b) => a.z - b.z)
    const pos = geometry.attributes.position.array
    const size = geometry.attributes.size.array
    const alpha = geometry.attributes.alpha.array
    alive.forEach((b, i) => {
      pos[i * 3] = b.x
      pos[i * 3 + 1] = b.y
      pos[i * 3 + 2] = b.z
      size[i] = b.size * (1 + 0.07 * Math.sin(b.age * 9 + b.phase))
      alpha[i] = Math.min(1, b.age / 0.25)
    })
    geometry.setDrawRange(0, alive.length)
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.size.needsUpdate = true
    geometry.attributes.alpha.needsUpdate = true
    // R3F copia los uniforms al material, así que se actualizan a través de la referencia.
    material.current.uniforms.scale.value = pxPerUnit * gl.getPixelRatio()
  })

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={10}>
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        premultipliedAlpha
      />
    </points>
  )
}
