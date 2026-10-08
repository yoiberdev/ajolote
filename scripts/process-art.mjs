// Convierte las imágenes generadas (art/raw/) en capas listas para la escena (public/layers/).
// Recorta el fondo de color sólido (chroma key), recupera el color real en los bordes
// semitransparentes, elimina el reflejo del color de fondo y recorta al contenido.
// Ejecuta: npm run art
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const RAW = fileURLToPath(new URL('../art/raw/', import.meta.url))
const OUT = fileURLToPath(new URL('../public/layers/', import.meta.url))
mkdirSync(OUT, { recursive: true })

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

async function load(file) {
  const { data, info } = await sharp(RAW + file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height }
}

// Color de fondo: mediana de unos parches en las esquinas superiores.
function sampleKey({ data, width, height }) {
  const samples = []
  for (const [cx, cy] of [[0.02, 0.02], [0.98, 0.02], [0.5, 0.02], [0.02, 0.4], [0.98, 0.4]]) {
    for (let dy = 0; dy < 8; dy++) {
      for (let dx = 0; dx < 8; dx++) {
        const x = Math.floor(cx * (width - 8)) + dx
        const y = Math.floor(cy * (height - 8)) + dy
        const i = (y * width + x) * 4
        samples.push([data[i], data[i + 1], data[i + 2]])
      }
    }
  }
  return [0, 1, 2].map((c) => samples.map((s) => s[c]).sort((a, b) => a - b)[samples.length >> 1] / 255)
}

// "Cuánto se parece al fondo": verde → g − max(r, b); magenta → min(r, b) − g.
const keyness = {
  green: (r, g, b) => g - Math.max(r, b),
  magenta: (r, g, b) => Math.min(r, b) - g,
}

function chromaKey(img, mode, { low = 0.12, high = 0.85, choke = 0.08 } = {}) {
  const { data, width, height } = img
  const key = sampleKey(img)
  const kKey = keyness[mode](...key)
  const out = Buffer.alloc(data.length)
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] / 255
    let g = data[i + 1] / 255
    let b = data[i + 2] / 255
    const k = keyness[mode](r, g, b) / kKey // 1 = fondo puro, ≤0 = sujeto
    let a = 1 - smoothstep(low, high, k)
    a = smoothstep(choke, 1, a)
    if (a > 0.001 && a < 0.999) {
      // Quita la mezcla con el fondo: C = a·F + (1 − a)·K  →  F = (C − (1 − a)·K) / a
      r = (r - (1 - a) * key[0]) / a
      g = (g - (1 - a) * key[1]) / a
      b = (b - (1 - a) * key[2]) / a
    }
    // Elimina el reflejo del color de fondo que queda sobre el sujeto.
    if (mode === 'green') {
      g = Math.min(g, (r + b) / 2 + 0.02)
    } else {
      const spill = Math.max(0, Math.min(r, b) - g * 1.02)
      r -= spill
      b -= spill
    }
    out[i] = Math.round(Math.min(1, Math.max(0, r)) * 255)
    out[i + 1] = Math.round(Math.min(1, Math.max(0, g)) * 255)
    out[i + 2] = Math.round(Math.min(1, Math.max(0, b)) * 255)
    out[i + 3] = Math.round(a * 255)
  }
  return { data: out, width, height }
}

function bbox({ data, width, height }, x0 = 0, x1 = width, threshold = 10) {
  let minX = x1
  let minY = height
  let maxX = x0
  let maxY = 0
  for (let y = 0; y < height; y++) {
    for (let x = x0; x < x1; x++) {
      if (data[(y * width + x) * 4 + 3] > threshold) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

// Separa los elementos sueltos de una imagen (piezas conectadas), ordenados de izquierda a derecha.
// Las islas pequeñas se asignan a la pieza grande más cercana.
function splitPieces(img, count, cell = 2) {
  const { data, width, height } = img
  const w = Math.ceil(width / cell)
  const h = Math.ceil(height / cell)
  const mask = new Uint8Array(w * h)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 40) mask[Math.floor(y / cell) * w + Math.floor(x / cell)] = 1
    }
  }
  const label = new Int32Array(w * h).fill(-1)
  const pieces = []
  for (let start = 0; start < w * h; start++) {
    if (!mask[start] || label[start] >= 0) continue
    const id = pieces.length
    const stack = [start]
    label[start] = id
    let size = 0
    let sumX = 0
    while (stack.length) {
      const p = stack.pop()
      size++
      sumX += p % w
      const px = p % w
      const py = (p / w) | 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = px + dx
          const ny = py + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          const q = ny * w + nx
          if (mask[q] && label[q] < 0) {
            label[q] = id
            stack.push(q)
          }
        }
      }
    }
    pieces.push({ id, size, cx: sumX / size })
  }
  const main = [...pieces].sort((a, b) => b.size - a.size).slice(0, count).sort((a, b) => a.cx - b.cx)
  const owner = new Map(pieces.map((p) => [p.id, main.reduce((best, m) => (Math.abs(m.cx - p.cx) < Math.abs(best.cx - p.cx) ? m : best))]))
  return main.map((m) => {
    const out = Buffer.from(data)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const l = label[Math.floor(y / cell) * w + Math.floor(x / cell)]
        if (l < 0 || owner.get(l) !== m) out[(y * width + x) * 4 + 3] = 0
      }
    }
    return { data: out, width, height }
  })
}

async function save(img, box, name, { pad = 0.03, maxSize = 2048, quality = 88 } = {}) {
  const p = Math.round(Math.max(box.width, box.height) * pad)
  const left = Math.max(0, box.left - p)
  const top = Math.max(0, box.top - p)
  const width = Math.min(img.width - left, box.width + p * 2)
  const height = Math.min(img.height - top, box.height + p * 2)
  const info = await sharp(img.data, { raw: { width: img.width, height: img.height, channels: 4 } })
    .extract({ left, top, width, height })
    .resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true })
    .webp({ quality, alphaQuality: 95, effort: 6 })
    .toFile(OUT + name)
  console.log(`${name.padEnd(22)} ${info.width}×${info.height}  ${(info.size / 1024).toFixed(0)} KB`)
  return { left, top, width, height, outWidth: info.width, outHeight: info.height }
}

const manifest = {}

// Ajolote (fondo verde).
{
  const img = chromaKey(await load('axolotl.png'), 'green')
  const crop = await save(img, bbox(img), 'axolotl.webp', { pad: 0.02 })
  // Puntos de referencia en la imagen original → coordenadas UV de la capa recortada.
  const uv = ([x, y]) => [+((x - crop.left) / crop.width).toFixed(4), +(1 - (y - crop.top) / crop.height).toFixed(4)]
  manifest.axolotl = {
    aspect: crop.width / crop.height,
    head: uv([1239, 959]), // centro de la cabeza
    mouth: uv([1250, 1035]),
    gillInner: 250 / crop.height, // radio de la cara (sin branquias)
    gillOuter: 520 / crop.height, // hasta la punta de las branquias
    tailEnd: uv([930, 0])[0], // la cola ocupa la parte izquierda, hasta aquí
  }
}

// Plantas y roca (fondo magenta): se separan en tres capas.
{
  const img = chromaKey(await load('plants.png'), 'magenta', { low: 0.1, high: 0.7 })
  const names = ['plants-left', 'rock', 'plants-right']
  for (const [i, piece] of splitPieces(img, 3).entries()) {
    const crop = await save(piece, bbox(piece), `${names[i]}.webp`, { pad: 0.01, quality: 85 })
    manifest[names[i]] = { aspect: crop.width / crop.height }
  }
}

// Fondo (opaco).
{
  const info = await sharp(RAW + 'background.png').webp({ quality: 85 }).toFile(OUT + 'background.webp')
  manifest.background = { aspect: info.width / info.height }
  console.log(`background.webp         ${info.width}×${info.height}  ${(info.size / 1024).toFixed(0)} KB`)
}

writeFileSync(fileURLToPath(new URL('../src/scene/art.json', import.meta.url)), JSON.stringify(manifest, null, 2) + '\n')
console.log(manifest)
