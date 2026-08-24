export interface ParsedColor {
  r: number
  g: number
  b: number
  a: number
  original: string
  hex: string
  rgba: string
  hsl: string
  oklch: string
}

const NAMED: Record<string, [number, number, number]> = {
  black: [0, 0, 0],
  white: [255, 255, 255],
  red: [255, 0, 0],
  green: [0, 128, 0],
  blue: [0, 0, 255],
  yellow: [255, 255, 0],
  cyan: [0, 255, 255],
  magenta: [255, 0, 255],
  silver: [192, 192, 192],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
  maroon: [128, 0, 0],
  olive: [128, 128, 0],
  lime: [0, 255, 0],
  aqua: [0, 255, 255],
  teal: [0, 128, 128],
  navy: [0, 0, 128],
  fuchsia: [255, 0, 255],
  purple: [128, 0, 128],
  orange: [255, 165, 0],
  transparent: [0, 0, 0],
}

export function parseColor(input: string): ParsedColor | null {
  const original = input.trim()
  if (!original || original === 'none' || original === 'currentcolor' || original === 'inherit') {
    return null
  }
  const lower = original.toLowerCase()

  if (lower === 'transparent') {
    return toParsed(0, 0, 0, 0, original)
  }

  const hex = parseHex(lower)
  if (hex) return toParsed(hex.r, hex.g, hex.b, hex.a, original)

  const rgb = parseRgb(lower)
  if (rgb) return toParsed(rgb.r, rgb.g, rgb.b, rgb.a, original)

  const hsl = parseHsl(lower)
  if (hsl) {
    const { r, g, b } = hslToRgb(hsl.h, hsl.s, hsl.l)
    return toParsed(r, g, b, hsl.a, original)
  }

  const oklch = parseOklch(lower)
  if (oklch) {
    const { r, g, b } = oklchToSrgb(oklch.l, oklch.c, oklch.h)
    return toParsed(r, g, b, oklch.a, original)
  }

  const named = NAMED[lower]
  if (named) {
    const a = lower === 'transparent' ? 0 : 1
    return toParsed(named[0], named[1], named[2], a, original)
  }

  return null
}

export function isFullyTransparent(color: ParsedColor): boolean {
  return color.a === 0
}

export function toParsed(r: number, g: number, b: number, a: number, original: string): ParsedColor {
  const rr = clampByte(r)
  const gg = clampByte(g)
  const bb = clampByte(b)
  const aa = clamp01(a)
  const hex = toHex(rr, gg, bb, aa)
  const rgba = `rgba(${rr}, ${gg}, ${bb}, ${round4(aa)})`
  const hsl = rgbToHslString(rr, gg, bb, aa)
  const oklch = rgbToOklchString(rr, gg, bb, aa)
  return { r: rr, g: gg, b: bb, a: aa, original, hex, rgba, hsl, oklch }
}

function parseHex(value: string): { r: number; g: number; b: number; a: number } | null {
  const m = /^#([0-9a-f]{3,8})$/.exec(value)
  if (!m) return null
  const h = m[1] ?? ''
  if (h.length === 3 || h.length === 4) {
    const r = h.charAt(0)
    const g = h.charAt(1)
    const b = h.charAt(2)
    const a = h.charAt(3)
    return {
      r: parseInt(r + r, 16),
      g: parseInt(g + g, 16),
      b: parseInt(b + b, 16),
      a: h.length === 4 ? parseInt(a + a, 16) / 255 : 1,
    }
  }
  if (h.length === 6) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: 1,
    }
  }
  if (h.length === 8) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: parseInt(h.slice(6, 8), 16) / 255,
    }
  }
  return null
}

function parseRgb(value: string): { r: number; g: number; b: number; a: number } | null {
  const m =
    /^rgba?\(\s*([+-]?\d*\.?\d+%?)\s*[, ]\s*([+-]?\d*\.?\d+%?)\s*[, ]\s*([+-]?\d*\.?\d+%?)\s*(?:[,/]\s*([+-]?\d*\.?\d+%?))?\s*\)$/.exec(
      value,
    )
  if (!m) return null
  return {
    r: parseRgbChannel(m[1] ?? '0'),
    g: parseRgbChannel(m[2] ?? '0'),
    b: parseRgbChannel(m[3] ?? '0'),
    a: m[4] !== undefined ? parseAlpha(m[4]) : 1,
  }
}

function parseHsl(value: string): { h: number; s: number; l: number; a: number } | null {
  const m =
    /^hsla?\(\s*([+-]?\d*\.?\d+(?:deg|rad|turn)?)\s*[, ]\s*([+-]?\d*\.?\d+)%\s*[, ]\s*([+-]?\d*\.?\d+)%\s*(?:[,/]\s*([+-]?\d*\.?\d+%?))?\s*\)$/.exec(
      value,
    )
  if (!m) return null
  return {
    h: parseHue(m[1] ?? '0'),
    s: Number.parseFloat(m[2] ?? '0') / 100,
    l: Number.parseFloat(m[3] ?? '0') / 100,
    a: m[4] !== undefined ? parseAlpha(m[4]) : 1,
  }
}

function parseOklch(value: string): { l: number; c: number; h: number; a: number } | null {
  const m =
    /^oklch\(\s*([+-]?\d*\.?\d+%?)\s+([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+(?:deg|rad|turn)?)\s*(?:\/\s*([+-]?\d*\.?\d+%?))?\s*\)$/.exec(
      value,
    )
  if (!m) return null
  const rawL = m[1] ?? '0'
  const l = rawL.endsWith('%') ? Number.parseFloat(rawL) / 100 : Number.parseFloat(rawL)
  return {
    l,
    c: Number.parseFloat(m[2] ?? '0'),
    h: parseHue(m[3] ?? '0'),
    a: m[4] !== undefined ? parseAlpha(m[4]) : 1,
  }
}

function parseRgbChannel(raw: string): number {
  if (raw.endsWith('%')) return (Number.parseFloat(raw) / 100) * 255
  return Number.parseFloat(raw)
}

function parseAlpha(raw: string): number {
  if (raw.endsWith('%')) return Number.parseFloat(raw) / 100
  return Number.parseFloat(raw)
}

function parseHue(raw: string): number {
  if (raw.endsWith('rad')) return ((Number.parseFloat(raw) * 180) / Math.PI) % 360
  if (raw.endsWith('turn')) return (Number.parseFloat(raw) * 360) % 360
  return Number.parseFloat(raw) % 360
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const hn = ((h % 360) + 360) % 360
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (hn < 60) [r, g, b] = [c, x, 0]
  else if (hn < 120) [r, g, b] = [x, c, 0]
  else if (hn < 180) [r, g, b] = [0, c, x]
  else if (hn < 240) [r, g, b] = [0, x, c]
  else if (hn < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 }
}

function rgbToHslString(r: number, g: number, b: number, a: number): string {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min
  let h = 0
  let s = 0
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    switch (max) {
      case rn:
        h = 60 * (((gn - bn) / d) % 6)
        break
      case gn:
        h = 60 * ((bn - rn) / d + 2)
        break
      default:
        h = 60 * ((rn - gn) / d + 4)
    }
  }
  if (h < 0) h += 360
  const base = `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
  return a < 1 ? `${base} / ${round4(a)})` : `${base})`
}

function srgbToLinear(c: number): number {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

function linearToSrgb(c: number): number {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
  return v * 255
}

function rgbToOklchString(r: number, g: number, b: number, a: number): string {
  const lr = srgbToLinear(r)
  const lg = srgbToLinear(g)
  const lb = srgbToLinear(b)
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb
  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  const C = Math.sqrt(A * A + B * B)
  let H = (Math.atan2(B, A) * 180) / Math.PI
  if (H < 0) H += 360
  const base = `oklch(${round4(L)} ${round4(C)} ${round4(H)}`
  return a < 1 ? `${base} / ${round4(a)})` : `${base})`
}

function oklchToSrgb(L: number, C: number, H: number): { r: number; g: number; b: number } {
  const hr = (H * Math.PI) / 180
  const A = C * Math.cos(hr)
  const B = C * Math.sin(hr)
  const l_ = L + 0.3963377774 * A + 0.2158037573 * B
  const m_ = L - 0.1055613458 * A - 0.0638541728 * B
  const s_ = L - 0.0894841775 * A - 1.291485548 * B
  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3
  const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  return {
    r: linearToSrgb(lr),
    g: linearToSrgb(lg),
    b: linearToSrgb(lb),
  }
}

function toHex(r: number, g: number, b: number, a: number): string {
  const hex = `#${byteHex(r)}${byteHex(g)}${byteHex(b)}`
  if (a >= 1) return hex.toUpperCase()
  return `${hex}${byteHex(Math.round(a * 255))}`.toUpperCase()
}

function byteHex(n: number): string {
  return clampByte(n).toString(16).padStart(2, '0')
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)))
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 1
  return Math.max(0, Math.min(1, n))
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000
}

export function relativeLuminance(hex: string): number | null {
  const parsed = parseColor(hex)
  if (!parsed) return null
  const channel = (value: number) => {
    const s = value / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(parsed.r) + 0.7152 * channel(parsed.g) + 0.0722 * channel(parsed.b)
}

export function contrastRatio(foreground: string, background: string): number | null {
  const a = relativeLuminance(foreground)
  const b = relativeLuminance(background)
  if (a == null || b == null) return null
  const light = Math.max(a, b)
  const dark = Math.min(a, b)
  return (light + 0.05) / (dark + 0.05)
}

export function isDarkHex(hex: string): boolean {
  const parsed = parseColor(hex)
  if (!parsed) return false
  const r = parsed.r * parsed.a + 255 * (1 - parsed.a)
  const g = parsed.g * parsed.a + 255 * (1 - parsed.a)
  const b = parsed.b * parsed.a + 255 * (1 - parsed.a)
  const channel = (value: number) => {
    const s = value / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
  return luminance < 0.45
}

export function contrastGrade(ratio: number): { label: string; tone: 'ok' | 'warning' | 'error' } {
  if (ratio >= 7) return { label: 'AAA', tone: 'ok' }
  if (ratio >= 4.5) return { label: 'AA', tone: 'ok' }
  if (ratio >= 3) return { label: 'AA Large', tone: 'warning' }
  if (ratio >= 2) return { label: 'Poor', tone: 'warning' }
  return { label: 'Very Poor', tone: 'error' }
}

export function contrastPairs(
  colors: Array<{ hex: string; role: string }>,
): Array<{ fg: string; bg: string; ratio: number; label: string; tone: 'ok' | 'warning' | 'error' }> {
  const text = colors.filter((color) => color.role.startsWith('text'))
  const surfaces = colors.filter((color) => color.role.includes('surface') || color.role.includes('background'))
  const fgList = text.length ? text : colors.slice(0, 3)
  const bgList = surfaces.length ? surfaces : colors.slice().reverse().slice(0, 3)
  const items: Array<{
    fg: string
    bg: string
    ratio: number
    label: string
    tone: 'ok' | 'warning' | 'error'
  }> = []
  for (const fg of fgList.slice(0, 4)) {
    for (const bg of bgList.slice(0, 3)) {
      if (fg.hex === bg.hex) continue
      const ratio = contrastRatio(fg.hex, bg.hex)
      if (!ratio) continue
      const grade = contrastGrade(ratio)
      items.push({ fg: fg.hex, bg: bg.hex, ratio, label: grade.label, tone: grade.tone })
    }
  }
  return items.slice(0, 8)
}

export function inferColorRole(hex: string, properties: string[]): string {
  const parsed = parseColor(hex)
  if (!parsed) return 'unknown'
  const { r, g, b, a } = parsed
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  if (a === 0) return 'transparent'
  if (properties.includes('color') && !properties.some((p) => p.includes('background'))) {
    return luminance < 0.5 ? 'text' : 'text-muted'
  }
  if (properties.some((p) => p.includes('background'))) {
    if (luminance > 0.92) return 'surface'
    if (luminance < 0.15) return 'surface-inverse'
    return 'background'
  }
  if (properties.some((p) => p.includes('border') || p.includes('outline'))) return 'border'
  if (properties.some((p) => p.includes('shadow'))) return 'shadow'
  return 'accent'
}

export function colorDistance(a: ParsedColor, b: ParsedColor): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2)
}

export function colorLooksLike(value: string, targetHex: string): boolean {
  const a = parseColor(value)
  const b = parseColor(targetHex)
  if (!a || !b) return false
  if (Math.abs(a.a - b.a) > 0.2) return false
  return colorDistance(a, b) < 8
}

export function colorIsExact(value: string, targetHex: string): boolean {
  const a = parseColor(value)
  const b = parseColor(targetHex)
  if (!a || !b) return false
  if (a.a < 0.08 || Math.abs(a.a - b.a) > 0.05) return false
  return colorDistance(a, b) < 2.5
}

export function pagePaletteGroups(
  colors: Array<{
    id: string
    hex: string
    kind: 'solid' | 'gradient'
    area?: number
    count: number
  }>,
): Array<{ key: 'gradient' | 'primary' | 'secondary'; title: string; ids: string[] }> {
  const byWeight = (a: { area?: number; count: number }, b: { area?: number; count: number }) =>
    (b.area || b.count) - (a.area || a.count)
  const gradients = colors.filter((color) => color.kind === 'gradient').sort(byWeight)
  const solids = colors.filter((color) => color.kind !== 'gradient').sort(byWeight)
  const maxArea = Math.max(1, ...solids.map((color) => color.area || color.count))
  const primary: typeof solids = []
  const secondary: typeof solids = []

  for (const color of solids) {
    if (primary.length >= 8 || !isPrimarySwatch(color, primary, maxArea)) {
      secondary.push(color)
      continue
    }
    primary.push(color)
  }

  return (
    [
      { key: 'gradient' as const, title: 'Gradients', ids: gradients.map((color) => color.id) },
      { key: 'primary' as const, title: 'Primary', ids: primary.map((color) => color.id) },
      { key: 'secondary' as const, title: 'Secondary', ids: secondary.map((color) => color.id) },
    ] as const
  ).filter((group) => group.ids.length > 0)
}

function isPrimarySwatch(
  color: { hex: string; area?: number; count: number },
  already: Array<{ hex: string; area?: number; count: number }>,
  maxArea: number,
): boolean {
  const parsed = parseColor(color.hex)
  if (!parsed) return false
  const share = (color.area || color.count) / maxArea
  const chroma = (Math.max(parsed.r, parsed.g, parsed.b) - Math.min(parsed.r, parsed.g, parsed.b)) / 255
  const close = already.some((item) => {
    const other = parseColor(item.hex)
    return other ? colorDistance(parsed, other) < 26 : false
  })
  if (close && share < 0.4) return false
  if (already.length < 2) return true
  if (share >= 0.08) return true
  return chroma >= 0.2 && share >= 0.015
}
