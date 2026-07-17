// Genera iconos PNG de la PWA sin dependencias externas (codificador PNG con zlib).
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public')
mkdirSync(outDir, { recursive: true })

const ACCENT = [0x00, 0x66, 0xcc]
const WHITE = [0xff, 0xff, 0xff]

// Patrón de la letra "B" (5 de ancho × 7 de alto).
const B = [
  '01111',
  '10000',
  '10000',
  '01110',
  '00001',
  '00001',
  '11110',
]

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePng(size, pixels) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1))
  let o = 0
  for (let y = 0; y < size; y++) {
    raw[o++] = 0 // filtro none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixels(x, y)
      raw[o++] = r
      raw[o++] = g
      raw[o++] = b
      raw[o++] = a
    }
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

function makeIcon(size, { maskable = false } = {}) {
  const pad = maskable ? size * 0.12 : 0 // zona segura para iconos maskable
  const inner = size - pad * 2
  const radius = maskable ? 0 : size * 0.22
  // Geometría de la "B".
  const glyphH = inner * 0.5
  const glyphW = glyphH * (5 / 7)
  const gx = (size - glyphW) / 2
  const gy = (size - glyphH) / 2
  const cell = glyphH / 7

  return encodePng(size, (x, y) => {
    // Fondo (rounded rect salvo maskable, que cubre todo).
    let bg = false
    if (maskable) {
      bg = true
    } else {
      const rx = Math.max(radius - x, x - (size - radius), 0)
      const ry = Math.max(radius - y, y - (size - radius), 0)
      bg = rx * rx + ry * ry <= radius * radius
    }
    if (!bg) return [0, 0, 0, 0]

    // Letra en blanco.
    const col = Math.floor((x - gx) / cell)
    const row = Math.floor((y - gy) / cell)
    if (row >= 0 && row < 7 && col >= 0 && col < 5 && B[row][col] === '1') {
      return [...WHITE, 255]
    }
    return [...ACCENT, 255]
  })
}

const targets = [
  ['icon-192.png', 192, {}],
  ['icon-512.png', 512, {}],
  ['icon-maskable-512.png', 512, { maskable: true }],
  ['apple-touch-icon.png', 180, {}],
]

for (const [name, size, opts] of targets) {
  writeFileSync(join(outDir, name), makeIcon(size, opts))
  console.log('escrito', name, size)
}
