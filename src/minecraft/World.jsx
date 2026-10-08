import * as THREE from 'three'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { blockTexture, emissiveTexture, glowVineEmissive, pickleTextures, plantTexture } from './textures'
import { withWater } from './materials'

const BOX = new THREE.BoxGeometry(1, 1, 1)

// Dos planos cruzados con la base en y = 0, como las plantas del juego.
const CROSS = (() => {
  const a = new THREE.PlaneGeometry(1, 1).rotateY(Math.PI / 4).translate(0, 0.5, 0)
  const b = new THREE.PlaneGeometry(1, 1).rotateY(-Math.PI / 4).translate(0, 0.5, 0)
  const g = mergeGeometries([a, b])
  // Normales hacia arriba: el follaje se ilumina parejo por ambos lados.
  const n = g.attributes.normal
  for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0)
  return g
})()

const GLOW = { magma: 2.4, seaLantern: 1.8 }

export function World({ world }) {
  return (
    <>
      {Object.entries(world.blocks).map(([type, list]) => (
        <Blocks key={type} type={type} list={list} />
      ))}
      {Object.entries(world.plants).map(([type, list]) => (
        <Plants key={type} type={type} list={list} />
      ))}
      <Pickles list={world.pickles} />
    </>
  )
}

function Blocks({ type, list }) {
  const mesh = useRef()
  const ceiling = type.startsWith('ceil:')
  const base = ceiling ? type.slice(5) : type
  const material = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({ map: blockTexture(base) })
    const glow = emissiveTexture(base)
    if (glow) {
      m.emissiveMap = glow
      m.emissive = new THREE.Color('#ffffff')
      m.emissiveIntensity = GLOW[base]
    }
    return withWater(m, { caustics: glow || ceiling ? 0 : 0.4 })
  }, [base, ceiling])

  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    list.forEach(([x, y, z], i) => mesh.current.setMatrixAt(i, m.makeTranslation(x, y, z)))
    mesh.current.instanceMatrix.needsUpdate = true
    mesh.current.computeBoundingSphere()
  }, [list])

  // El techo no proyecta sombra: si no, dejaría toda la cueva a oscuras.
  return <instancedMesh ref={mesh} args={[BOX, material, list.length]} castShadow={!ceiling} receiveShadow />
}

function Plants({ type, list }) {
  const mesh = useRef()
  const hang = type === 'glowVine'
  const geometry = useMemo(() => {
    const g = CROSS.clone()
    g.setAttribute('aBase', new THREE.InstancedBufferAttribute(new Float32Array(list.map((p) => p.base)), 1))
    return g
  }, [list])
  const material = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({ map: plantTexture(type), alphaTest: 0.5, side: THREE.DoubleSide })
    if (hang) {
      m.emissiveMap = glowVineEmissive()
      m.emissive = new THREE.Color('#ffffff')
      m.emissiveIntensity = 2.6
    }
    const sway = type.startsWith('fan') ? 0.05 : hang ? 0.05 : type === 'seagrass' ? 0.12 : 0.07
    return withWater(m, { caustics: 0.25, sway, hang })
  }, [type, hang])

  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const up = new THREE.Vector3(0, 1, 0)
    list.forEach((p, i) => {
      q.setFromAxisAngle(up, p.rot)
      m.compose(new THREE.Vector3(p.x, p.y - 0.5, p.z), q, new THREE.Vector3(p.scale, 1, p.scale))
      mesh.current.setMatrixAt(i, m)
    })
    mesh.current.instanceMatrix.needsUpdate = true
    mesh.current.computeBoundingSphere()
  }, [list])

  return <instancedMesh ref={mesh} args={[geometry, material, list.length]} receiveShadow />
}

// Pepinos de mar: grupos de 1 a 4 cilindros pequeños con la punta luminosa.
const PICKLE_OFFSETS = [
  [0, 0],
  [-0.19, 0.13],
  [0.17, -0.15],
  [0.14, 0.2],
]

function Pickles({ list }) {
  const mesh = useRef()
  const items = useMemo(() => list.flatMap(([x, h, z, n]) => PICKLE_OFFSETS.slice(0, n).map(([dx, dz]) => [x + dx, h + 0.5 + 0.1875, z + dz])), [list])
  const materials = useMemo(() => {
    const { side, top } = pickleTextures()
    const sideMat = new THREE.MeshLambertMaterial({ map: side, emissive: new THREE.Color('#5c8f2c'), emissiveIntensity: 0.35 })
    const topMat = new THREE.MeshLambertMaterial({ map: top, emissiveMap: top, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 2.2 })
    return [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]
  }, [])
  const geometry = useMemo(() => new THREE.BoxGeometry(0.25, 0.375, 0.25), [])

  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    items.forEach(([x, y, z], i) => mesh.current.setMatrixAt(i, m.makeTranslation(x, y, z)))
    mesh.current.instanceMatrix.needsUpdate = true
    mesh.current.computeBoundingSphere()
  }, [items])

  return <instancedMesh ref={mesh} args={[geometry, materials, items.length]} castShadow receiveShadow />
}
