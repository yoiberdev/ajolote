import * as THREE from 'three'

// Utilidades para pintar texturas pixel-art en un canvas.

export function rng(seed) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

// Ruido de valor 2D suave, para repartir terreno y manchas.
function hash(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

export function noise2(x, y, seed = 0) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash(xi, yi, seed)
  const b = hash(xi + 1, yi, seed)
  const c = hash(xi, yi + 1, seed)
  const d = hash(xi + 1, yi + 1, seed)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

export function fbm(x, y, seed = 0) {
  return (noise2(x, y, seed) * 0.6 + noise2(x * 2.1, y * 2.1, seed + 7) * 0.3 + noise2(x * 4.3, y * 4.3, seed + 13) * 0.1)
}

export function shade(hex, amount) {
  const c = new THREE.Color(hex)
  const hsl = {}
  c.getHSL(hsl)
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amount)))
  return `#${c.getHexString()}`
}

export class Pixmap {
  constructor(w, h) {
    this.w = w
    this.h = h
    this.canvas = document.createElement('canvas')
    this.canvas.width = w
    this.canvas.height = h
    this.ctx = this.canvas.getContext('2d')
  }

  px(x, y, color) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    this.ctx.fillStyle = color
    this.ctx.fillRect(x, y, 1, 1)
  }

  rect(x, y, w, h, color) {
    this.ctx.fillStyle = color
    this.ctx.fillRect(x, y, w, h)
  }

  clear(x, y) {
    this.ctx.clearRect(x, y, 1, 1)
  }

  // Rellena con colores de la paleta al azar (repetir un color en la lista le da más peso).
  noise(palette, rnd, x0 = 0, y0 = 0, w = this.w, h = this.h) {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) this.px(x, y, palette[Math.floor(rnd() * palette.length)])
    }
    return this
  }

  texture() {
    const t = new THREE.CanvasTexture(this.canvas)
    t.magFilter = THREE.NearestFilter
    t.minFilter = THREE.NearestMipmapLinearFilter
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return t
  }
}
