import { Pixmap, rng, shade } from './pixel'

// Texturas pixel-art 16×16 pintadas a mano en código. Todas se crean una sola vez.
const cache = new Map()
const memo = (key, make) => {
  if (!cache.has(key)) cache.set(key, make())
  return cache.get(key)
}

function line(p, x0, y0, x1, y1, color) {
  const dx = Math.abs(x1 - x0)
  const dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  for (;;) {
    p.px(x0, y0, color)
    if (x0 === x1 && y0 === y1) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x0 += sx
    }
    if (e2 <= dx) {
      err += dx
      y0 += sy
    }
  }
}

// ─── Bloques ─────────────────────────────────────────────────────────────────

export const CORALS = {
  tube: '#3058d2',
  brain: '#d363b0',
  bubble: '#a735c6',
  fire: '#cf3636',
  horn: '#dcc847',
}

function coralBlock(color, seed) {
  const r = rng(seed)
  const p = new Pixmap(16, 16).noise([color, color, shade(color, 0.05), shade(color, -0.05), shade(color, 0.1)], r)
  for (let i = 0; i < 22; i++) p.px((r() * 16) | 0, (r() * 16) | 0, shade(color, -0.2))
  for (let i = 0; i < 12; i++) {
    const x = (r() * 15) | 0
    const y = (r() * 15) | 0
    p.px(x, y, shade(color, 0.2))
    p.px(x + 1, y + 1, shade(color, -0.12))
  }
  return p
}

const BLOCKS = {
  sand() {
    const r = rng(11)
    const p = new Pixmap(16, 16).noise(['#cfc08e', '#cfc08e', '#d6c898', '#d6c898', '#c7b783', '#bfae7a', '#ddd0a6'], r)
    for (let i = 0; i < 10; i++) p.px((r() * 16) | 0, (r() * 16) | 0, '#bfb37a')
    return p
  },
  gravel() {
    const r = rng(12)
    const p = new Pixmap(16, 16).noise(['#837a7a', '#7b7272', '#8e8585', '#706868', '#9a9191'], r)
    for (let i = 0; i < 16; i++) {
      const x = (r() * 15) | 0
      const y = (r() * 15) | 0
      const c = ['#a59b97', '#615959', '#8b7d6e', '#b1a9a5'][(r() * 4) | 0]
      p.rect(x, y, 2, 1, c)
      if (r() < 0.6) p.px(x, y + 1, shade(c, -0.1))
    }
    return p
  },
  clay() {
    return new Pixmap(16, 16).noise(['#a2a8b8', '#a2a8b8', '#9ea4b4', '#a7adbd', '#989eae', '#adb3c3'], rng(13))
  },
  stone() {
    const r = rng(14)
    const p = new Pixmap(16, 16).noise(['#7e7e7e', '#858585', '#787878', '#8c8c8c', '#727272'], r)
    for (let i = 0; i < 9; i++) p.rect((r() * 14) | 0, (r() * 16) | 0, 2 + ((r() * 3) | 0), 1, '#686868')
    return p
  },
  deepslate() {
    const r = rng(15)
    const p = new Pixmap(16, 16).noise(['#50505a', '#4a4a52', '#55555e', '#46464e'], r)
    for (let y = 1; y < 16; y += 3 + ((r() * 2) | 0)) {
      for (let x = 0; x < 16; x++) if (r() < 0.7) p.px(x, y, '#3b3b42')
    }
    for (let i = 0; i < 8; i++) p.px((r() * 16) | 0, (r() * 16) | 0, '#62626d')
    return p
  },
  moss() {
    const r = rng(16)
    const p = new Pixmap(16, 16).noise(['#596d2b', '#627830', '#6b8434', '#506326', '#76903c', '#5d722d'], r)
    for (let i = 0; i < 14; i++) p.px((r() * 16) | 0, (r() * 16) | 0, '#8aa94a')
    return p
  },
  prismarine() {
    const r = rng(17)
    const p = new Pixmap(16, 16).noise(['#63a697', '#5b9c8d', '#6eb2a3', '#528f81', '#79bdaf'], r)
    for (let i = 0; i < 16; i += 4) {
      p.rect(0, i, 16, 1, '#4a8577')
      p.rect(i, 0, 1, 16, '#4a8577')
    }
    return p
  },
  seaLantern() {
    const p = new Pixmap(16, 16)
    p.rect(0, 0, 16, 16, '#b9d9de')
    p.rect(1, 1, 14, 14, '#d4ebee')
    for (const [x, y] of [[2, 2], [9, 2], [2, 9], [9, 9]]) {
      p.rect(x, y, 5, 5, '#eef9fa')
      p.rect(x + 1, y + 1, 3, 3, '#ffffff')
    }
    return p
  },
  magma() {
    const r = rng(18)
    const p = new Pixmap(16, 16).noise(['#5c1c12', '#6a2214', '#4f170f', '#762816'], r)
    return magmaCracks(p, rng(19))
  },
  ...Object.fromEntries(Object.entries(CORALS).map(([name, color], i) => [`coral-${name}`, () => coralBlock(color, 40 + i)])),
}

function magmaCracks(p, r) {
  for (let i = 0; i < 7; i++) {
    let x = (r() * 16) | 0
    let y = (r() * 16) | 0
    for (let s = 0; s < 6; s++) {
      p.px(x, y, s % 3 === 0 ? '#ffc24d' : '#ff7a1c')
      x += r() < 0.5 ? 1 : 0
      y += r() < 0.5 ? 1 : -1
    }
  }
  return p
}

export const blockTexture = (type) => memo(`block:${type}`, () => BLOCKS[type]().texture())

// Mapas de emisión (lo que brilla en la oscuridad).
export const emissiveTexture = (type) =>
  memo(`emissive:${type}`, () => {
    if (type === 'seaLantern') return BLOCKS.seaLantern().texture()
    if (type === 'magma') {
      const p = new Pixmap(16, 16)
      p.rect(0, 0, 16, 16, '#000000')
      return magmaCracks(p, rng(19)).texture()
    }
    return null
  })

// ─── Plantas (con transparencia) ─────────────────────────────────────────────

const PLANTS = {
  seagrass() {
    const r = rng(21)
    const p = new Pixmap(16, 16)
    const greens = ['#3b8a38', '#4aa043', '#2f7531', '#5cb752']
    for (let b = 0; b < 7; b++) {
      let x = 2 + ((r() * 12) | 0)
      const h = 6 + ((r() * 10) | 0)
      const c = greens[(r() * 4) | 0]
      for (let y = 15; y > 15 - h; y--) {
        p.px(x, y, c)
        if (y > 12) p.px(x + 1, y, shade(c, -0.06))
        if (r() < 0.22) x += r() < 0.5 ? -1 : 1
      }
    }
    return p
  },
  kelp() {
    const r = rng(22)
    const p = new Pixmap(16, 16)
    let x = 7
    for (let y = 15; y >= 0; y--) {
      p.px(x, y, '#3f7d22')
      p.px(x + 1, y, '#4b8f2b')
      if (y % 4 === 1) {
        const dir = (y >> 2) % 2 ? 1 : -1
        const len = 3 + ((r() * 3) | 0)
        for (let i = 1; i <= len; i++) {
          p.px(x + (dir > 0 ? 1 : 0) + dir * i, y - (i > len - 2 ? 1 : 0), i === len ? '#7ccb4c' : '#5aa834')
          p.px(x + (dir > 0 ? 1 : 0) + dir * i, y + 1, '#4f9a2e')
        }
      }
      if (r() < 0.2) x += r() < 0.5 ? -1 : 1
      x = Math.max(5, Math.min(9, x))
    }
    return p
  },
  kelpTop() {
    const p = new Pixmap(16, 16)
    for (let y = 15; y >= 5; y--) {
      p.px(7, y, '#3f7d22')
      if (y > 8) p.px(8, y, '#4b8f2b')
      if (y === 11 || y === 7) {
        for (let i = 1; i <= 3; i++) p.px(y === 11 ? 8 + i : 7 - i, y - (i === 3 ? 1 : 0), i === 3 ? '#7ccb4c' : '#5aa834')
      }
    }
    p.rect(6, 3, 3, 2, '#5aa834')
    p.px(7, 2, '#7ccb4c')
    return p
  },
  ...Object.fromEntries(
    Object.entries(CORALS).map(([name, color], i) => [
      `fan-${name}`,
      () => {
        const r = rng(60 + i)
        const p = new Pixmap(16, 16)
        const tips = []
        for (let k = 0; k < 7; k++) {
          const a = Math.PI * (-0.92 + (k / 6) * 0.84) + (r() - 0.5) * 0.15
          const len = 8 + r() * 5
          const ex = Math.round(8 + Math.cos(a) * len)
          const ey = Math.round(15 + Math.sin(a) * len)
          line(p, 8, 15, ex, ey, shade(color, -0.06))
          tips.push([ex, ey])
        }
        for (let i = 0; i < 40; i++) {
          const [ex, ey] = tips[(r() * tips.length) | 0]
          const t = 0.35 + r() * 0.65
          p.px(Math.round(8 + (ex - 8) * t + (r() - 0.5) * 2), Math.round(15 + (ey - 15) * t), shade(color, -0.14))
        }
        for (const [ex, ey] of tips) p.px(ex, ey, shade(color, 0.2))
        return p
      },
    ]),
  ),
  glowVine() {
    return glowVine(false)
  },
}

function glowVine(emissive) {
  const r = rng(31)
  const p = new Pixmap(16, 16)
  if (emissive) p.rect(0, 0, 16, 16, '#000000')
  for (const x0 of [4, 10]) {
    let x = x0
    for (let y = 0; y < 16; y++) {
      if (!emissive) {
        p.px(x, y, '#3e7b2c')
        if (r() < 0.35) p.px(x + (r() < 0.5 ? -1 : 1), y, '#58a03a')
      }
      if (r() < 0.2) x += r() < 0.5 ? -1 : 1
    }
  }
  for (const [x, y] of [[3, 4], [10, 9], [5, 12], [11, 2]]) {
    p.rect(x, y, 2, 2, '#ff9a2a')
    p.px(x, y, '#ffd66e')
    p.px(x + 1, y + 1, '#e2741a')
  }
  return p
}

export const plantTexture = (type) => memo(`plant:${type}`, () => PLANTS[type]().texture())
export const glowVineEmissive = () => memo('emissive:glowVine', () => glowVine(true).texture())

// ─── Pepino de mar ───────────────────────────────────────────────────────────

export const pickleTextures = () =>
  memo('pickle', () => {
    const side = new Pixmap(4, 6)
    side.rect(0, 0, 4, 6, '#5a8d2b')
    side.rect(1, 0, 1, 6, '#76ab3b')
    side.rect(0, 0, 4, 1, '#9fd65a')
    const top = new Pixmap(4, 4)
    top.rect(0, 0, 4, 4, '#a7e05c')
    top.rect(1, 1, 2, 2, '#ecffc0')
    return { side: side.texture(), top: top.texture() }
  })

// ─── Ajolote ─────────────────────────────────────────────────────────────────

// Cinco variantes de color. El azul es el raro.
export const AXOLOTL_VARIANTS = {
  rosa: {
    label: 'rosa',
    skin: ['#f5a5c0', '#f5a5c0', '#f8b3ca', '#f09ab7'],
    spot: '#df7f9e',
    fleck: '#fcc8d8',
    belly: ['#fbc5d6', '#fdd3e0', '#f8bccf'],
    gill: ['#bd3260', '#e44a7a', '#f6789f'],
    mouth: '#b45876',
    cheek: '#f88fb1',
    toe: '#e889a8',
  },
  cafe: {
    label: 'café',
    skin: ['#7d5c40', '#7d5c40', '#88674b', '#715238'],
    spot: '#55402c',
    fleck: '#9c7c5e',
    belly: ['#a98b6d', '#b49678', '#9e8164'],
    gill: ['#6e2f24', '#9c4a3a', '#c26c54'],
    mouth: '#3a2618',
    cheek: '#9c6b50',
    toe: '#5c4330',
  },
  dorado: {
    label: 'dorado',
    skin: ['#f2c14e', '#f2c14e', '#f6cd63', '#e8b43c'],
    spot: '#d39a2c',
    fleck: '#fbe08e',
    belly: ['#fbe4a0', '#fdeab2', '#f7da8c'],
    gill: ['#b9641a', '#e8892a', '#ffb352'],
    mouth: '#9a5a1a',
    cheek: '#f5a04a',
    toe: '#d39a2c',
  },
  cian: {
    label: 'cian',
    skin: ['#a9e6ea', '#a9e6ea', '#b8eef0', '#98d9de'],
    spot: '#7cc5cc',
    fleck: '#d4f6f7',
    belly: ['#d6f4f5', '#e2f8f9', '#c9eef0'],
    gill: ['#b8336a', '#e85a8c', '#ff8ab0'],
    mouth: '#4f8f96',
    cheek: '#ff9ac0',
    toe: '#7cc5cc',
  },
  azul: {
    label: 'azul',
    skin: ['#4b60d6', '#4b60d6', '#5a6fe0', '#4053c4'],
    spot: '#2f3ea0',
    fleck: '#7a8cf0',
    belly: ['#8091ea', '#8d9df0', '#7283e0'],
    gill: ['#c9951c', '#f2c84a', '#ffe58a'],
    mouth: '#222b7a',
    cheek: '#7f8ff2',
    toe: '#2f3ea0',
  },
}

export const axolotlTextures = (variant = 'rosa') =>
  memo(`axolotl:${variant}`, () => {
    const c = AXOLOTL_VARIANTS[variant]
    const skin = (w, h, seed, { belly = false, spots = true } = {}) => {
      const r = rng(seed)
      const p = new Pixmap(w, h).noise(belly ? c.belly : c.skin, r)
      if (spots) {
        for (let i = 0; i < Math.round(w * h * 0.07); i++) p.px((r() * w) | 0, (r() * h) | 0, c.spot)
        for (let i = 0; i < Math.round(w * h * 0.05); i++) p.px((r() * w) | 0, (r() * h) | 0, c.fleck)
      }
      return p
    }
    const [gillDark, gill, gillLight] = c.gill

    // Orden de las caras de una caja: +x, −x, +y, −y, +z (frente), −z (atrás).
    const body = [skin(10, 4, 1), skin(10, 4, 2), skin(8, 10, 3), skin(8, 10, 4, { belly: true, spots: false }), skin(8, 4, 5), skin(8, 4, 6)]

    const face = skin(8, 5, 7, { spots: false })
    face.rect(0, 0, 8, 1, c.fleck)
    face.px(1, 2, '#1f1019')
    face.px(6, 2, '#1f1019')
    face.px(1, 1, '#3a2232')
    face.px(6, 1, '#3a2232')
    face.px(0, 3, c.cheek)
    face.px(7, 3, c.cheek)
    for (const [x, y] of [[2, 3], [3, 4], [4, 4], [5, 3]]) face.px(x, y, c.mouth)
    const head = [skin(5, 5, 8), skin(5, 5, 9), skin(8, 5, 10), skin(8, 5, 11, { belly: true, spots: false }), face, skin(8, 5, 12)]

    const r = rng(70)
    const gillSide = new Pixmap(5, 8)
    for (let y = 0; y < 8; y++) {
      const len = y % 2 ? 1 + ((r() * 2) | 0) : 4 + ((r() * 2) | 0)
      for (let x = 0; x < len; x++) gillSide.px(x, y, x === 0 ? gillDark : x === len - 1 ? gillLight : gill)
    }
    const gillTop = new Pixmap(8, 4)
    for (let x = 0; x < 8; x++) {
      const h = x % 2 ? 1 + ((r() * 2) | 0) : 3 + ((r() * 2) | 0)
      for (let y = 0; y < h; y++) gillTop.px(x, 3 - y, y === 0 ? gillDark : y === h - 1 ? gillLight : gill)
    }

    const tail = new Pixmap(12, 5)
    for (let x = 0; x < 12; x++) {
      const core = shade(c.skin[0], (x / 11) * 0.1)
      if (x > 0 && x < 11 && x % 3 !== 2) tail.px(x, 0, shade(core, 0.06))
      for (let y = 1; y <= 3; y++) tail.px(x, y, y === 2 ? shade(core, -0.06) : core)
      if (x < 9 && x % 2 === 0) tail.px(x, 4, shade(core, 0.04))
      if (x >= 10) {
        tail.clear(x, 1)
        tail.clear(x, 3)
      }
    }

    // Patas y cola como bloques finos (se ven bien desde cualquier ángulo).
    const toe = new Pixmap(3, 1)
    toe.rect(0, 0, 3, 1, c.toe)
    const legBox = [toe, toe, skin(4, 3, 14), skin(4, 3, 15, { belly: true, spots: false }), skin(4, 1, 16, { spots: false }), skin(4, 1, 17, { spots: false })]
    const tailBox = [tail, tail, skin(1, 12, 18, { spots: false }), skin(1, 12, 19, { spots: false }), skin(1, 5, 20, { spots: false }), skin(1, 5, 21, { spots: false })]

    return {
      body: body.map((p) => p.texture()),
      head: head.map((p) => p.texture()),
      gillSide: gillSide.texture(),
      gillTop: gillTop.texture(),
      leg: legBox.map((p) => p.texture()),
      tail: tailBox.map((p) => p.texture()),
    }
  })

// ─── Pez tropical ────────────────────────────────────────────────────────────

export const fishTextures = (a, b) =>
  memo(`fish:${a}:${b}`, () => {
    const side = new Pixmap(6, 3)
    side.rect(0, 0, 6, 3, a)
    side.rect(2, 0, 1, 3, b)
    side.rect(4, 0, 1, 3, b)
    const sideL = new Pixmap(6, 3)
    sideL.ctx.drawImage(side.canvas, 0, 0)
    side.px(5, 1, '#151515')
    sideL.px(0, 1, '#151515')
    const plain = new Pixmap(6, 2)
    plain.rect(0, 0, 6, 2, shade(a, -0.05))
    const front = new Pixmap(2, 3)
    front.rect(0, 0, 2, 3, a)
    const fin = new Pixmap(3, 3)
    fin.rect(0, 0, 1, 3, b)
    fin.rect(1, 0, 2, 3, a)
    fin.clear(2, 1)
    return {
      // +x, −x, +y, −y, +z (cabeza), −z. En la cara +x la cabeza queda a la izquierda de la textura.
      box: [sideL, side, plain, plain, front, front].map((p) => p.texture()),
      fin: fin.texture(),
    }
  })
