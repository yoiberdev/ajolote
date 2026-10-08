import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

// Partículas diminutas que flotan en el agua y dan sensación de volumen.
// box: ancho y alto de la zona; depth: [z mínima, z máxima]; size: tamaño de las partículas.
const vertexShader = /* glsl */ `
  attribute vec3 seed;
  uniform float time;
  uniform float scale;
  uniform vec2 box;
  uniform vec2 depth;
  uniform vec2 offset;
  uniform float size;
  varying float vAlpha;
  void main() {
    vec3 p;
    p.x = offset.x + (seed.x - 0.5) * box.x + sin(time * 0.3 + seed.z * 20.0) * 0.4 * size / 0.05;
    p.y = offset.y + mod(seed.y * box.y - time * (0.08 + seed.x * 0.12) * size / 0.05, box.y) - box.y * 0.5;
    p.z = mix(depth.x, depth.y, seed.z);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (0.6 + seed.x) * size * scale / -mv.z;
    vAlpha = 0.25 + seed.y * 0.35;
    gl_Position = projectionMatrix * mv;
  }
`

const fragmentShader = /* glsl */ `
  varying float vAlpha;
  void main() {
    float r = length(gl_PointCoord * 2.0 - 1.0);
    if (r > 1.0) discard;
    float a = (1.0 - smoothstep(0.2, 1.0, r)) * vAlpha;
    gl_FragColor = vec4(vec3(0.82, 0.96, 0.95) * a, a);
    #include <colorspace_fragment>
  }
`

export function MarineSnow({ count = 450, box = [40, 22], depth = [-12, 6], offset = [0, 0], size = 0.05 }) {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const height = useThree((s) => s.size.height)
  const material = useRef()
  const [geometry, uniforms] = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('seed', new THREE.BufferAttribute(new Float32Array(count * 3).map(() => Math.random()), 3))
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    return [g, { time: { value: 0 }, scale: { value: 1 }, box: { value: new THREE.Vector2() }, depth: { value: new THREE.Vector2() }, offset: { value: new THREE.Vector2() }, size: { value: size } }]
  }, [count, size])

  useFrame((_, delta) => {
    // R3F copia los uniforms al material, así que se actualizan a través de la referencia.
    const u = material.current.uniforms
    u.time.value += Math.min(delta, 0.1)
    u.scale.value = (height * gl.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))
    u.box.value.set(...box)
    u.depth.value.set(...depth)
    u.offset.value.set(...offset)
    u.size.value = size
  })

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={11}>
      <shaderMaterial ref={material} vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} transparent premultipliedAlpha depthWrite={false} />
    </points>
  )
}
