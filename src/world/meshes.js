import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { blockTexture, emissiveTexture, glowVineEmissive, pickleTextures, plantTexture } from './textures'
import { withWater } from './materials'

// Las mallas de la cueva: una InstancedMesh por tipo de bloque o planta, así miles de piezas se
// dibujan con una llamada por tipo. No dependen del framework: la escena solo las monta.

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

export function worldMeshes(world) {
  return [
    ...Object.entries(world.blocks).map(([type, list]) => blocks(type, list)),
    ...Object.entries(world.plants).map(([type, list]) => plants(type, list)),
    pickles(world.pickles),
  ]
}

function finish(mesh) {
  mesh.instanceMatrix.needsUpdate = true
  mesh.computeBoundingSphere()
  return mesh
}

function blocks(type, list) {
  const ceiling = type.startsWith('ceil:')
  const base = ceiling ? type.slice(5) : type
  const material = new THREE.MeshLambertMaterial({ map: blockTexture(base) })
  const glow = emissiveTexture(base)
  if (glow) {
    material.emissiveMap = glow
    material.emissive = new THREE.Color('#ffffff')
    material.emissiveIntensity = GLOW[base]
  }
  withWater(material, { caustics: glow || ceiling ? 0 : 0.4 })

  const mesh = new THREE.InstancedMesh(BOX, material, list.length)
  const m = new THREE.Matrix4()
  list.forEach(([x, y, z], i) => mesh.setMatrixAt(i, m.makeTranslation(x, y, z)))
  // El techo no proyecta sombra: si no, dejaría toda la cueva a oscuras.
  mesh.castShadow = !ceiling
  mesh.receiveShadow = true
  return finish(mesh)
}

function plants(type, list) {
  const hang = type === 'glowVine'
  const geometry = CROSS.clone()
  geometry.setAttribute('aBase', new THREE.InstancedBufferAttribute(new Float32Array(list.map((p) => p.base)), 1))
  const material = new THREE.MeshLambertMaterial({ map: plantTexture(type), alphaTest: 0.5, side: THREE.DoubleSide })
  if (hang) {
    material.emissiveMap = glowVineEmissive()
    material.emissive = new THREE.Color('#ffffff')
    material.emissiveIntensity = 2.6
  }
  const sway = type.startsWith('fan') ? 0.05 : hang ? 0.05 : type === 'seagrass' ? 0.12 : 0.07
  withWater(material, { caustics: 0.25, sway, hang })

  const mesh = new THREE.InstancedMesh(geometry, material, list.length)
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const up = new THREE.Vector3(0, 1, 0)
  list.forEach((p, i) => {
    q.setFromAxisAngle(up, p.rot)
    m.compose(new THREE.Vector3(p.x, p.y - 0.5, p.z), q, new THREE.Vector3(p.scale, 1, p.scale))
    mesh.setMatrixAt(i, m)
  })
  mesh.receiveShadow = true
  return finish(mesh)
}

// Pepinos de mar: grupos de 1 a 4 cilindros pequeños con la punta luminosa.
const PICKLE_OFFSETS = [
  [0, 0],
  [-0.19, 0.13],
  [0.17, -0.15],
  [0.14, 0.2],
]

function pickles(list) {
  const items = list.flatMap(([x, h, z, n]) => PICKLE_OFFSETS.slice(0, n).map(([dx, dz]) => [x + dx, h + 0.5 + 0.1875, z + dz]))
  const { side, top } = pickleTextures()
  const sideMat = new THREE.MeshLambertMaterial({ map: side, emissive: new THREE.Color('#5c8f2c'), emissiveIntensity: 0.35 })
  const topMat = new THREE.MeshLambertMaterial({ map: top, emissiveMap: top, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 2.2 })
  const materials = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]

  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.25, 0.375, 0.25), materials, items.length)
  const m = new THREE.Matrix4()
  items.forEach(([x, y, z], i) => mesh.setMatrixAt(i, m.makeTranslation(x, y, z)))
  mesh.castShadow = true
  mesh.receiveShadow = true
  return finish(mesh)
}
