import { CORALS } from './textures'
import { fbm, rng } from './pixel'

// Altura del bloque de suelo junto al ajolote: su cara superior queda en y = −0.5.
export const FLOOR = -1
// Bloque más bajo del techo de la cueva (cara inferior en y = CEIL − 0.5).
export const CEIL = 3

const FLOOR_TOPS = new Set(['sand', 'gravel', 'clay', 'moss'])
const CORAL_NAMES = Object.keys(CORALS)
// Huecos del techo por donde entran los haces de luz, detrás del ajolote.
const LIGHT_HOLES = [[-3, -8], [2, -9], [6, -11], [-7, -12], [0, -13]]

// Genera una cueva frondosa inundada: suelo, paredes, techo con huecos y toda la decoración.
export function generateWorld(seed = 5) {
  const rnd = rng(seed)
  const blocks = {}
  const plants = {}
  const pickles = []
  const magma = []
  const lights = []
  const holes = []
  const tops = new Map()
  const solid = new Set()
  const key = (x, y, z) => `${x},${y},${z}`

  const put = (type, x, y, z) => {
    ;(blocks[type] ||= []).push([x, y, z])
    solid.add(key(x, y, z))
  }
  const plant = (type, x, y, z, extra = {}) =>
    (plants[type] ||= []).push({ x, y, z, base: extra.hang ? y + 0.5 : y - 0.5, rot: rnd() * Math.PI, scale: 1, ...extra })

  const magmaSpots = new Set(['2,-4', '-3,-8', '5,-11', '-6,-13'])

  // ── Terreno ──
  for (let x = -18; x <= 18; x++) {
    for (let z = -24; z <= 3; z++) {
      const n = fbm(x * 0.13 + 3, z * 0.13 + 7, seed)
      const ridge = Math.max(0, Math.abs(x) - 6) * 0.55 + Math.max(0, -z - 10) * 0.45
      let h = FLOOR + Math.round((n - 0.5) * 2.4 + ridge)
      if (Math.hypot(x, z + 0.5) < 3.2 || z >= 1) h = FLOOR
      h = Math.min(h, CEIL + 2)

      const n2 = fbm(x * 0.21 + 11, z * 0.21 + 2, seed + 1)
      let top
      if (h - FLOOR >= 3) top = n2 > 0.45 ? 'moss' : 'stone'
      else if (magmaSpots.has(`${x},${z}`)) top = 'magma'
      else if (n2 < 0.3) top = 'gravel'
      else if (n2 > 0.72) top = 'clay'
      else if (h > FLOOR && n2 > 0.55) top = 'moss'
      else top = 'sand'

      put(top, x, h, z)
      tops.set(`${x},${z}`, { h, top })
      if (top === 'magma') magma.push([x, h, z])
      for (let y = h - 1; y >= FLOOR - 2; y--) {
        let type
        if (y === h - 1 && FLOOR_TOPS.has(top) && top !== 'moss') type = top
        else if (rnd() < 0.07) type = rnd() < 0.5 ? 'moss' : 'clay'
        else type = y <= FLOOR ? 'deepslate' : fbm(x * 0.3, y * 0.3 + z * 0.3, seed + 2) > 0.5 ? 'stone' : 'deepslate'
        put(type, x, y, z)
      }
    }
  }

  // ── Techo de la cueva, con huecos por donde entra la luz ──
  for (let x = -18; x <= 18; x++) {
    for (let z = -24; z <= -7; z++) {
      const { h } = tops.get(`${x},${z}`)
      if (h >= CEIL - 1) continue
      const lightHole = LIGHT_HOLES.some(([hx, hz]) => Math.abs(x - hx) <= 1 && Math.abs(z - hz) <= 1)
      if (lightHole || fbm(x * 0.22 + 5, z * 0.22 + 9, seed + 3) < 0.36) continue
      put(rnd() < 0.55 ? 'ceil:moss' : 'ceil:stone', x, CEIL, z)
      put('ceil:stone', x, CEIL + 1, z)
      // Enredaderas con bayas luminosas colgando del techo.
      if (rnd() < 0.13 && Math.abs(x) < 12) {
        const len = 2 + ((rnd() * 3) | 0)
        for (let k = 1; k <= len; k++) plant('glowVine', x, CEIL - k, z, { hang: true, base: CEIL - 0.5 })
        if (lights.length < 3 && len >= 3 && Math.abs(x) < 6) {
          lights.push({ pos: [x, CEIL - len, z], color: '#ffad4a', intensity: 6, distance: 7 })
        }
      }
    }
  }

  // ── Decoración del suelo ──
  const free = (x, z) => Math.hypot(x, z) > 1.6 && !(Math.abs(x) < 1 && z > 0)
  const coralClusters = [
    [3, -3, 'brain'],
    [-4, -3, 'tube'],
    [6, -8, 'fire'],
    [-7, -8, 'horn'],
    [1, -10, 'bubble'],
    [-2, -6, 'brain'],
    [9, -5, 'tube'],
  ]

  for (const [[x, z], { h, top }] of [...tops].map(([k, v]) => [k.split(',').map(Number), v])) {
    if (!FLOOR_TOPS.has(top) || h - FLOOR >= 3 || !free(x, z)) continue
    const cluster = coralClusters.find(([cx, cz]) => Math.hypot(x - cx, z - cz) < 1.9)
    if (cluster && rnd() < 0.7) {
      const color = rnd() < 0.7 ? cluster[2] : CORAL_NAMES[(rnd() * CORAL_NAMES.length) | 0]
      let y = h + 1
      if (rnd() < 0.55) {
        put(`coral-${color}`, x, y, z)
        y++
        if (rnd() < 0.3) {
          put(`coral-${CORAL_NAMES[(rnd() * CORAL_NAMES.length) | 0]}`, x, y, z)
          y++
        }
      }
      if (rnd() < 0.75) plant(`fan-${color}`, x, y, z)
      continue
    }
    const r = rnd()
    if (r < 0.04 && top !== 'moss') {
      const len = 3 + ((rnd() * (z < -6 ? 8 : 5)) | 0)
      for (let k = 1; k < len; k++) plant('kelp', x, h + k, z, { base: h + 0.5 })
      plant('kelpTop', x, h + len, z, { base: h + 0.5 })
    } else if (r < 0.26) {
      plant('seagrass', x, h + 1, z)
    } else if (r < 0.29) {
      pickles.push([x, h, z, 1 + ((rnd() * 4) | 0)])
    }
  }

  // Pepinos de mar que iluminan el claro del ajolote.
  for (const [x, z, n] of [[2, -1, 3], [-2, -2, 2], [1, -3, 4]]) {
    pickles.push([x, tops.get(`${x},${z}`).h, z, n])
    if (lights.length < 5) lights.push({ pos: [x, FLOOR + 0.9, z], color: '#b8ff7a', intensity: 1.6, distance: 3.5 })
  }

  // Ruinas de prismarina con linternas de mar.
  for (const [x, z, tall] of [[7, -6, 3], [-8, -11, 4]]) {
    const { h } = tops.get(`${x},${z}`)
    for (let y = h + 1; y <= h + tall; y++) put('prismarine', x, y, z)
    put('seaLantern', x, h + tall + 1, z)
    put('prismarine', x + 1, h + 1, z)
    if (lights.length < 7) lights.push({ pos: [x, h + tall + 1.5, z + 0.8], color: '#c9f6ff', intensity: 5, distance: 7 })
  }

  // Primer plano, junto a la cámara: kelp a la izquierda y coral a la derecha (desenfocados al principio).
  for (let k = 1; k <= 4; k++) plant(k === 4 ? 'kelpTop' : 'kelp', -1, FLOOR + k, 2, { base: FLOOR + 0.5 })
  plant('seagrass', -1, FLOOR + 1, 1)
  for (let k = 1; k <= 3; k++) plant(k === 3 ? 'kelpTop' : 'kelp', 1, FLOOR + k, 2, { base: FLOOR + 0.5 })
  plant('seagrass', 1, FLOOR + 1, 1)
  plant('fan-brain', 2, FLOOR + 1, 1)

  for (const [x, z] of LIGHT_HOLES) holes.push([x, z])
  return { blocks, plants, pickles, magma, lights, holes }
}
