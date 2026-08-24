import { deflateSync } from 'node:zlib'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

function crc32(buffer) {
  let crc = ~0
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i]
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return ~crc >>> 0
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type)
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crcInput = Buffer.concat([typeBuffer, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(crcInput))
  return Buffer.concat([length, typeBuffer, data, crc])
}

function createPng(size, paint) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (size * 4 + 1)
    raw[rowStart] = 0
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = paint(x, y, size)
      const i = rowStart + 1 + x * 4
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = b
      raw[i + 3] = a
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

function paintIcon(x, y, size) {
  const nx = (x + 0.5) / size
  const ny = (y + 0.5) / size
  const radius = 0.22
  const inRoundedRect =
    nx > 0.08 &&
    nx < 0.92 &&
    ny > 0.08 &&
    ny < 0.92 &&
    (nx > 0.08 + radius || ny > 0.08 + radius || Math.hypot(nx - (0.08 + radius), ny - (0.08 + radius)) <= radius) &&
    (nx < 0.92 - radius || ny > 0.08 + radius || Math.hypot(nx - (0.92 - radius), ny - (0.08 + radius)) <= radius) &&
    (nx > 0.08 + radius || ny < 0.92 - radius || Math.hypot(nx - (0.08 + radius), ny - (0.92 - radius)) <= radius) &&
    (nx < 0.92 - radius || ny < 0.92 - radius || Math.hypot(nx - (0.92 - radius), ny - (0.92 - radius)) <= radius)

  if (!inRoundedRect) {
    return [0, 0, 0, 0]
  }

  const frame = nx < 0.16 || nx > 0.84 || ny < 0.16 || ny > 0.84 ? [15, 23, 42, 255] : [37, 99, 235, 255]

  const scanBar = ny > 0.46 && ny < 0.58 && nx > 0.22 && nx < 0.78
  const corner = (nx < 0.34 && ny < 0.34) || (nx > 0.66 && ny > 0.66)
  if (scanBar || corner) {
    return [255, 255, 255, 255]
  }
  return frame
}

export function generateIcons(outDir = resolve(process.cwd(), 'public/icons')) {
  mkdirSync(outDir, { recursive: true })
  for (const size of [16, 32, 48, 128]) {
    const custom = resolve(outDir, `icon-${size}.png`)
    if (existsSync(custom)) {
      continue
    }
    writeFileSync(custom, createPng(size, paintIcon))
  }
}

if (
  import.meta.url === `file://${process.argv[1]?.replaceAll('\\', '/')}` ||
  process.argv[1]?.endsWith('generate-icons.mjs')
) {
  generateIcons()
}
