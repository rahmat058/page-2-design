/**
 * Design-system helpers: color scales and export snippets from a NormalizedDesign.
 */
import { parseColor } from '../../normalize/colors'
import type { ColorToken, DesignToken, NormalizedDesign, TypographyToken } from '../../shared/types'
import { isSaneLayoutToken } from './layout-tokens'

const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const

export type ScaleStep = (typeof SCALE_STEPS)[number]

export interface ColorScale {
  id: string
  name: string
  baseHex: string
  steps: Array<{ step: ScaleStep; hex: string }>
}

export interface DesignSystemModel {
  scales: ColorScale[]
  gradients: ColorToken[]
  semantic: Array<{ id: string; name: string; hex: string; tone: 'success' | 'warning' | 'error' }>
  bodyFont: string
  headingFont: string
  typeScale: Array<{ id: string; label: string; size: string; rem: string; sample: string }>
  spacing: DesignToken[]
  radii: DesignToken[]
  shadows: DesignToken[]
  /** Serial token rows with Tailwind class examples for the Tokens panel. */
  tokenRows: {
    spacing: Array<{ id: string; label: string; value: string; px: number; tw: string }>
    radii: Array<{ id: string; label: string; value: string; px: number; tw: string }>
    shadows: Array<{ id: string; label: string; value: string; tw: string }>
  }
  primary: string
  secondary: string
  accent: string
  radius: string
}

export type DesignExportFormat = 'css' | 'tailwind' | 'scss' | 'json' | 'design-md' | 'shadcn'

export function buildDesignSystem(design: NormalizedDesign): DesignSystemModel {
  const solids = design.tokens.colors.filter((c) => c.kind !== 'gradient' && Boolean(parseColor(c.hex)))
  const gradients = design.tokens.colors
    .filter((c) => c.kind === 'gradient')
    .sort((a, b) => (b.area || b.count) - (a.area || a.count))
    .slice(0, 6)
  const buttonElementIds = new Set(
    (design.components ?? []).filter((c) => c.kind === 'button').flatMap((c) => c.elementIds),
  )
  const scales = pickColorScales(solids, buttonElementIds, gradients)
  const semantic = inferSemantic(
    solids,
    scales.map((s) => s.baseHex),
  )

  const type = design.tokens.typography
  const heading =
    type.find((t) => /heading|h1|display/i.test(t.name)) ??
    [...type].sort((a, b) => Number.parseFloat(b.fontSize) - Number.parseFloat(a.fontSize))[0]
  const body =
    type.find((t) => /body|paragraph|text/i.test(t.name)) ??
    [...type].sort((a, b) => Number.parseFloat(a.fontSize) - Number.parseFloat(b.fontSize))[0]

  const typeScale = buildTypeScale(type)
  const spacingRaw = design.tokens.spacing.filter(isSaneLayoutToken)
  const radiiRaw = design.tokens.radii.filter(isSaneLayoutToken)
  const shadowsRaw = design.tokens.shadows.filter((t) => t.value.trim())
  const spacing = serializeSpacingTokens(spacingRaw)
  const radii = serializeRadiusTokens(radiiRaw)
  const shadows = serializeShadowTokens(shadowsRaw)
  const tokenRows = {
    spacing: spacingTokenRows(spacing),
    radii: radiusTokenRows(radii),
    shadows: shadowTokenRows(shadows),
  }

  const byName = (name: string) => scales.find((s) => s.name === name)?.baseHex
  const primary = byName('Primary') ?? scales[0]?.baseHex ?? '#2e2a42'
  const secondary = byName('Secondary') ?? scales[1]?.baseHex ?? '#d7befc'
  const accent = byName('Accent') ?? scales[2]?.baseHex ?? '#ff93ab'
  const radius = radii[0]?.value ?? '12px'

  return {
    scales,
    gradients,
    semantic,
    bodyFont: primaryFont(body?.fontFamily ?? 'system-ui, sans-serif'),
    headingFont: primaryFont(heading?.fontFamily ?? body?.fontFamily ?? 'system-ui, sans-serif'),
    typeScale,
    spacing,
    radii,
    shadows,
    tokenRows,
    primary,
    secondary,
    accent,
    radius,
  }
}

export function exportDesignSystem(model: DesignSystemModel, format: DesignExportFormat, siteName: string): string {
  switch (format) {
    case 'css':
      return toCss(model)
    case 'tailwind':
      return toTailwind(model)
    case 'scss':
      return toScss(model)
    case 'json':
      return toJson(model, siteName)
    case 'design-md':
      return toDesignMd(model, siteName)
    case 'shadcn':
      return toShadcn(model)
  }
}

export function exportFilename(format: DesignExportFormat): string {
  if (format === 'css') return 'design-tokens.css'
  if (format === 'tailwind') return 'design-tokens.tailwind.css'
  if (format === 'scss') return '_design-tokens.scss'
  if (format === 'json') return 'design-tokens.json'
  if (format === 'shadcn') return 'globals.css'
  return 'DESIGN_SYSTEM.md'
}

/** CSS custom property line for a type-scale step (clipboard). */
export function typeScaleToken(label: string, rem: string): string {
  return `--text-${label}: ${rem};`
}

function buildScale(hex: string): Array<{ step: ScaleStep; hex: string }> {
  const parsed = parseColor(hex)
  if (!parsed) return SCALE_STEPS.map((step) => ({ step, hex }))
  const { h, s, l } = rgbToHsl(parsed.r, parsed.g, parsed.b)
  const chroma = (Math.max(parsed.r, parsed.g, parsed.b) - Math.min(parsed.r, parsed.g, parsed.b)) / 255
  const neutral = chroma < 0.1 || s < 0.08
  const sat = neutral ? 0.02 : Math.min(0.92, Math.max(0.18, s))
  const mid = neutral ? 0.52 : Math.min(0.62, Math.max(0.38, l))
  const targets: Record<ScaleStep, number> = {
    50: 0.97,
    100: 0.93,
    200: 0.86,
    300: 0.76,
    400: 0.64,
    500: mid,
    600: 0.45,
    700: 0.36,
    800: 0.28,
    900: 0.2,
    950: 0.12,
  }
  return SCALE_STEPS.map((step) => {
    const lightBoost = step <= 200 ? (neutral ? 0.35 : 0.55) : 1
    return {
      step,
      hex: hslToHex(neutral ? 0 : h, sat * lightBoost, targets[step]),
    }
  })
}

interface ScoredColor {
  color: ColorToken
  h: number
  s: number
  l: number
  chroma: number
  weight: number
  brandScore: number
  neutral: boolean
}

function analyzeColor(color: ColorToken): ScoredColor | null {
  const parsed = parseColor(color.hex)
  if (!parsed || parsed.a < 0.35) return null
  const { h, s, l } = rgbToHsl(parsed.r, parsed.g, parsed.b)
  const chroma = (Math.max(parsed.r, parsed.g, parsed.b) - Math.min(parsed.r, parsed.g, parsed.b)) / 255
  // Usage-weighted like Wobolo: large surfaces + repeats beat one-off neon CTAs.
  const weight = color.count * 80 + Math.min(color.area ?? 0, 80000)
  const nearWhite = l > 0.93
  const nearBlack = l < 0.08
  const neutral = (chroma < 0.12 || s < 0.12) && !nearWhite && !nearBlack
  const roleBoost =
    color.role === 'background' || color.role === 'accent'
      ? 1.15
      : color.role.startsWith('text')
        ? 1.05
        : color.role === 'border' || color.role === 'shadow'
          ? 0.65
          : 1
  // Mid saturation wins; neon (s≈1, chroma≈1) is a highlight, not the page system.
  const satCurve = s < 0.12 ? 0.35 : s > 0.82 ? 0.22 : 0.55 + s * 0.7
  const toneBoost = nearWhite || nearBlack ? 0.08 : l > 0.22 && l < 0.72 ? 1.45 : 0.55
  const brandScore = nearWhite || nearBlack ? 0 : weight * satCurve * toneBoost * roleBoost
  return {
    color,
    h,
    s,
    l,
    chroma,
    weight,
    brandScore,
    neutral: neutral || (chroma < 0.1 && !nearWhite && !nearBlack),
  }
}

function isNeonHighlight(item: ScoredColor): boolean {
  return item.s > 0.82 && item.chroma > 0.68
}

/** Representative page color: usage first, neon CTAs last (they belong in Accent). */
function representativeScore(
  item: ScoredColor,
  buttonElementIds: Set<string>,
  gradientStopRgb: Array<{ r: number; g: number; b: number }>,
  slot: 'primary' | 'secondary' | 'accent',
): number {
  let score = item.brandScore
  const onButton = item.color.elementIds.some((id) => buttonElementIds.has(id))
  if (onButton) score *= slot === 'accent' ? 1.6 : 1.25
  if (item.color.properties.some((p) => /background/i.test(p))) score *= 1.1
  if (isNeonHighlight(item)) score *= slot === 'accent' ? 0.85 : 0.08
  if (slot !== 'accent' && isStatusHue(item)) score *= 0.12
  if (slot === 'primary' && item.h >= 8 && item.h <= 55 && item.l > 0.58) score *= 0.35
  const rgb = hexRgb(item.color.hex)
  if (slot === 'primary' && rgb && gradientStopRgb.some((stop) => colorDistanceRgb(stop, rgb) < 28)) score *= 0.55
  return score
}

function isStatusHue(item: ScoredColor): boolean {
  const { h, s, l } = item
  if (s < 0.35 || l < 0.22 || l > 0.7) return false
  if (h >= 105 && h <= 150) return true
  if (h >= 36 && h <= 52 && s >= 0.55 && l <= 0.62) return true
  if ((h <= 14 || h >= 350) && s >= 0.5 && l <= 0.62) return true
  return false
}

function gradientStopColors(gradients: ColorToken[]): Array<{ r: number; g: number; b: number }> {
  const out: Array<{ r: number; g: number; b: number }> = []
  for (const grad of gradients) {
    const css = grad.css || ''
    for (const match of css.matchAll(/#(?:[0-9a-f]{3,8})\b|rgba?\([^)]+\)/gi)) {
      const parsed = parseColor(match[0])
      if (parsed && parsed.a >= 0.35) out.push({ r: parsed.r, g: parsed.g, b: parsed.b })
    }
  }
  return out
}

function tooClose(a: ScoredColor, b: ScoredColor): boolean {
  const dist = colorDistanceRgb(hexRgb(a.color.hex)!, hexRgb(b.color.hex)!)
  const hues = hueDistance(a.h, b.h)
  const lightGap = Math.abs(a.l - b.l)
  if (a.neutral && b.neutral) return dist < 22
  return dist < 36 || (hues < 26 && dist < 72 && lightGap < 0.12)
}

function pickColorScales(
  solids: ColorToken[],
  buttonElementIds: Set<string> = new Set(),
  gradients: ColorToken[] = [],
): ColorScale[] {
  const scored = solids.map(analyzeColor).filter((item): item is ScoredColor => Boolean(item))
  const usable = scored.filter((item) => item.l > 0.12 && item.l < 0.88)
  const gradientStops = gradientStopColors(gradients)
  const ranked = [...usable].sort(
    (a, b) =>
      representativeScore(b, buttonElementIds, gradientStops, 'primary') -
      representativeScore(a, buttonElementIds, gradientStops, 'primary'),
  )

  const picks: ScoredColor[] = []
  for (const item of ranked) {
    if (picks.some((picked) => tooClose(picked, item))) continue
    picks.push(item)
    if (picks.length >= 4) break
  }

  const greyest = [...picks].sort((a, b) => a.chroma + a.s - (b.chroma + b.s))[0]
  const brand = picks.filter((item) => item !== greyest)
  while (brand.length < 3 && picks.length) {
    const extra = picks.find((item) => !brand.includes(item) && item !== greyest)
    if (!extra) break
    brand.push(extra)
  }

  const brandNames = ['Primary', 'Secondary', 'Accent'] as const
  const scales: ColorScale[] = brand.slice(0, 3).map((item, index) => ({
    id: item.color.id,
    name: brandNames[index]!,
    baseHex: item.color.hex,
    steps: buildScale(item.color.hex),
  }))

  const neutral = greyest ?? picks[picks.length - 1]
  if (neutral) {
    scales.push({
      id: scales.some((s) => s.id === neutral.color.id) ? `${neutral.color.id}-neutral` : neutral.color.id,
      name: 'Neutral',
      baseHex: neutral.color.hex,
      steps: buildScale(neutral.color.hex),
    })
  }

  const order = ['Primary', 'Secondary', 'Accent', 'Neutral'] as const
  scales.sort(
    (a, b) => order.indexOf(a.name as (typeof order)[number]) - order.indexOf(b.name as (typeof order)[number]),
  )
  return scales
}

function inferSemantic(
  colors: ColorToken[],
  brandHexes: string[] = [],
): Array<{ id: string; name: string; hex: string; tone: 'success' | 'warning' | 'error' }> {
  type Tone = 'success' | 'warning' | 'error'
  const brandRgbs = brandHexes.map(hexRgb).filter((v): v is { r: number; g: number; b: number } => Boolean(v))
  const candidates: Array<{ id: string; name: string; hex: string; tone: Tone; score: number }> = []

  for (const color of colors) {
    const scored = analyzeColor(color)
    if (!scored) continue
    const rgb = hexRgb(color.hex)
    if (!rgb) continue

    const named = semanticHintFromScan(color)
    const { h, s, l, weight } = scored

    let tone: Tone | null = named
    if (!tone) {
      // Only page-observed hues — no invented Tailwind defaults.
      if (s < 0.28 || l < 0.18 || l > 0.78) continue
      if (brandRgbs.some((brand) => colorDistanceRgb(brand, rgb) < 18)) continue
      if (h >= 95 && h <= 160 && s >= 0.3) tone = 'success'
      else if (h >= 28 && h <= 55 && s >= 0.4 && l <= 0.72) tone = 'warning'
      else if ((h <= 18 || h >= 345) && s >= 0.4 && l <= 0.65) tone = 'error'
    }

    if (!tone) continue
    // Soft brand pinks (high L rose) are not errors unless CSS named them.
    if (!named && tone === 'error' && h >= 330 && h <= 350 && l > 0.55) continue

    const mid = 1 - Math.abs(l - 0.48) * 1.2
    const nameBoost = named ? 4 : 1
    candidates.push({
      id: color.id,
      name: tone === 'success' ? 'Success' : tone === 'warning' ? 'Warning' : 'Error',
      hex: color.hex,
      tone,
      score: weight * (0.7 + s) * Math.max(0.3, mid) * nameBoost,
    })
  }

  const out: Array<{ id: string; name: string; hex: string; tone: Tone }> = []
  for (const tone of ['success', 'warning', 'error'] as const) {
    const best = candidates.filter((c) => c.tone === tone).sort((a, b) => b.score - a.score)[0]
    if (best) out.push({ id: best.id, name: best.name, hex: best.hex, tone: best.tone })
  }
  return out
}

/** Detect status tokens from scanned CSS vars / class-ish original strings. */
function semanticHintFromScan(color: ColorToken): 'success' | 'warning' | 'error' | null {
  const blob = `${color.name} ${color.role} ${color.original.join(' ')}`.toLowerCase()
  if (/success|positive|--ok\b|valid(ate)?|toast-success|badge-success/.test(blob)) return 'success'
  if (/warn(ing)?|caution|amber|toast-warn|badge-warn/.test(blob)) return 'warning'
  if (/error|danger|destructive|fail(ed|ure)?|invalid|toast-error|badge-error|badge-danger/.test(blob)) {
    return 'error'
  }
  return null
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

function hexRgb(hex: string): { r: number; g: number; b: number } | null {
  const parsed = parseColor(hex)
  return parsed ? { r: parsed.r, g: parsed.g, b: parsed.b } : null
}

function buildTypeScale(tokens: TypographyToken[]): DesignSystemModel['typeScale'] {
  const labels = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl']
  const sorted = [...tokens]
    .map((t) => ({ token: t, px: Number.parseFloat(t.fontSize) || 0 }))
    .filter((t) => t.px > 0)
    .sort((a, b) => a.px - b.px)

  const unique: typeof sorted = []
  for (const item of sorted) {
    if (unique.length >= labels.length) break
    if (unique.some((u) => Math.abs(u.px - item.px) < 1.5)) continue
    unique.push(item)
  }

  return unique.map((item, index) => ({
    id: item.token.id,
    label: labels[index] ?? `s${index + 1}`,
    size: item.token.fontSize,
    rem: `${Number((item.px / 16).toFixed(3))}rem`,
    sample: 'The quick brown fox',
  }))
}

/** Tailwind spacing scale keys (n → n * 4px). */
const TW_SPACE = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24] as const

function nearestTwSpace(px: number): (typeof TW_SPACE)[number] {
  let best: (typeof TW_SPACE)[number] = 4
  let bestDist = Infinity
  for (const step of TW_SPACE) {
    const dist = Math.abs(step * 4 - px)
    if (dist < bestDist) {
      bestDist = dist
      best = step
    }
  }
  return best
}

function tokenPx(token: DesignToken): number | null {
  if (token.px != null && Number.isFinite(token.px)) return token.px
  const rem = token.value.match(/^([\d.]+)\s*rem$/i)
  if (rem) return Number(rem[1]) * 16
  const px = token.value.match(/^([\d.]+)\s*px$/i)
  if (px) return Number(px[1])
  return null
}

function serializeSpacingTokens(tokens: DesignToken[]): DesignToken[] {
  const unique: DesignToken[] = []
  for (const token of [...tokens].sort((a, b) => (tokenPx(a) ?? 0) - (tokenPx(b) ?? 0))) {
    const px = tokenPx(token)
    if (px == null || px < 2 || px > 96) continue
    if (unique.some((u) => Math.abs((tokenPx(u) ?? 0) - px) < 1.25)) continue
    unique.push(token)
    if (unique.length >= 12) break
  }
  return unique.map((token) => {
    const px = Math.round(tokenPx(token) ?? 0)
    const step = nearestTwSpace(px)
    return {
      ...token,
      name: `space ${step}`,
      nameInferred: true,
      value: `${px}px`,
      px,
    }
  })
}

function serializeRadiusTokens(tokens: DesignToken[]): DesignToken[] {
  const unique: DesignToken[] = []
  for (const token of [...tokens].sort((a, b) => (tokenPx(a) ?? 0) - (tokenPx(b) ?? 0))) {
    const px = tokenPx(token)
    if (px == null || px < 0 || px > 9999) continue
    if (unique.some((u) => Math.abs((tokenPx(u) ?? 0) - px) < 1)) continue
    unique.push(token)
    if (unique.length >= 10) break
  }
  return unique.map((token, index) => {
    const px = Math.round(tokenPx(token) ?? 0)
    return {
      ...token,
      name: `radius ${index + 1}`,
      nameInferred: true,
      value: px >= 999 ? '9999px' : `${px}px`,
      px,
    }
  })
}

function serializeShadowTokens(tokens: DesignToken[]): DesignToken[] {
  const unique: DesignToken[] = []
  for (const token of tokens) {
    const key = token.value.replace(/\s+/g, ' ').trim().toLowerCase()
    if (!key || key === 'none') continue
    if (unique.some((u) => u.value.replace(/\s+/g, ' ').trim().toLowerCase() === key)) continue
    unique.push(token)
    if (unique.length >= 6) break
  }
  return unique.map((token, index) => ({
    ...token,
    name: `shadow ${index + 1}`,
    nameInferred: true,
  }))
}

function spacingTokenRows(
  tokens: DesignToken[],
): Array<{ id: string; label: string; value: string; px: number; tw: string }> {
  return tokens.map((token) => {
    const px = Math.round(tokenPx(token) ?? 0)
    const step = nearestTwSpace(px)
    return {
      id: token.id,
      label: `space ${step}`,
      value: `${px}px`,
      px,
      tw: `p-${step} · m-${step} · gap-${step}`,
    }
  })
}

function radiusTokenRows(
  tokens: DesignToken[],
): Array<{ id: string; label: string; value: string; px: number; tw: string }> {
  return tokens.map((token, index) => {
    const px = Math.round(tokenPx(token) ?? 0)
    return {
      id: token.id,
      label: `radius ${index + 1}`,
      value: px >= 999 ? '9999px' : `${px}px`,
      px,
      tw: twRadiusClass(px),
    }
  })
}

function shadowTokenRows(tokens: DesignToken[]): Array<{ id: string; label: string; value: string; tw: string }> {
  const twNames = ['shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl']
  return tokens.map((token, index) => ({
    id: token.id,
    label: `shadow ${index + 1}`,
    value: token.value,
    tw: twNames[Math.min(index, twNames.length - 1)] ?? 'shadow',
  }))
}

function twRadiusClass(px: number): string {
  if (px >= 999) return 'rounded-full'
  if (px <= 2) return 'rounded-sm'
  if (px <= 4) return 'rounded'
  if (px <= 6) return 'rounded-md'
  if (px <= 8) return 'rounded-lg'
  if (px <= 12) return 'rounded-xl'
  if (px <= 16) return 'rounded-2xl'
  return 'rounded-3xl'
}

function toCss(model: DesignSystemModel): string {
  const lines = [':root {', '  /* Colors */']
  for (const scale of model.scales) {
    const key = slug(scale.name)
    for (const step of scale.steps) {
      lines.push(`  --color-${key}-${step.step}: ${step.hex};`)
    }
  }
  lines.push('  /* Typography */')
  lines.push(`  --font-body: ${model.bodyFont};`)
  lines.push(`  --font-heading: ${model.headingFont};`)
  for (const row of model.typeScale) {
    lines.push(`  --text-${row.label}: ${row.rem};`)
  }
  lines.push('  /* Radius */')
  lines.push(`  --radius: ${model.radius};`)
  lines.push('}')
  return `${lines.join('\n')}\n`
}

function toTailwind(model: DesignSystemModel): string {
  const lines = ['@theme {', '  /* Colors */']
  for (const scale of model.scales) {
    const key = slug(scale.name)
    for (const step of scale.steps) {
      lines.push(`  --color-${key}-${step.step}: ${step.hex};`)
    }
  }
  lines.push(`  --font-sans: ${model.bodyFont};`)
  lines.push(`  --font-display: ${model.headingFont};`)
  for (const row of model.typeScale) {
    lines.push(`  --text-${row.label}: ${row.rem};`)
  }
  lines.push(`  --radius-lg: ${model.radius};`)
  for (const row of model.tokenRows.spacing) {
    lines.push(`  --spacing-${nearestTwSpace(row.px)}: ${row.value};`)
  }
  lines.push('}')
  return `${lines.join('\n')}\n`
}

function toScss(model: DesignSystemModel): string {
  const lines = ['// Design System Variables', '']
  for (const scale of model.scales) {
    const key = slug(scale.name)
    for (const step of scale.steps) {
      lines.push(`$color-${key}-${step.step}: ${step.hex};`)
    }
    lines.push('')
  }
  lines.push(`$font-body: ${model.bodyFont};`)
  lines.push(`$font-heading: ${model.headingFont};`)
  lines.push(`$radius: ${model.radius};`)
  return `${lines.join('\n')}\n`
}

function toJson(model: DesignSystemModel, siteName: string): string {
  const colors: Record<string, Record<string, string>> = {}
  for (const scale of model.scales) {
    colors[slug(scale.name)] = Object.fromEntries(scale.steps.map((s) => [String(s.step), s.hex]))
  }
  return `${JSON.stringify(
    {
      name: siteName,
      fonts: { body: model.bodyFont, heading: model.headingFont },
      typography: Object.fromEntries(model.typeScale.map((row) => [row.label, row.rem])),
      colors,
      radius: model.radius,
      spacing: model.spacing.map((t) => ({ name: t.name, value: t.value })),
      shadows: model.shadows.map((t) => ({ name: t.name, value: t.value })),
    },
    null,
    2,
  )}\n`
}

function toShadcn(model: DesignSystemModel): string {
  const primary = model.primary
  const secondary = model.secondary
  const accent = model.accent
  const lines = [
    '/* shadcn/ui theme tokens derived from this page */',
    ':root {',
    `  --background: #ffffff;`,
    `  --foreground: #0a0a0a;`,
    `  --primary: ${primary};`,
    `  --primary-foreground: #ffffff;`,
    `  --secondary: ${secondary};`,
    `  --secondary-foreground: #0a0a0a;`,
    `  --accent: ${accent};`,
    `  --accent-foreground: #0a0a0a;`,
    `  --muted: #f4f4f5;`,
    `  --muted-foreground: #71717a;`,
    `  --border: #e4e4e7;`,
    `  --input: #e4e4e7;`,
    `  --ring: ${primary};`,
    `  --radius: ${model.radius};`,
    `  --font-sans: ${model.bodyFont};`,
    `  --font-heading: ${model.headingFont};`,
  ]
  for (const row of model.typeScale) {
    lines.push(`  --text-${row.label}: ${row.rem};`)
  }
  lines.push('}', '')
  return `${lines.join('\n')}\n`
}

function toDesignMd(model: DesignSystemModel, siteName: string): string {
  const lines = [`# 🎨 ${siteName} — Design System`, '', '## 1. Colors', '']
  for (const scale of model.scales) {
    lines.push(`### ${scale.name}`, '', '| Shade | Hex | Token |', '| --- | --- | --- |')
    const key = slug(scale.name)
    for (const step of scale.steps) {
      lines.push(`| ${step.step} | \`${step.hex}\` | \`--color-${key}-${step.step}\` |`)
    }
    lines.push('')
  }
  lines.push('## 2. Typography', '')
  lines.push(`- **Body:** ${model.bodyFont}`)
  lines.push(`- **Headings:** ${model.headingFont}`, '')
  lines.push('## 3. Radius', '', `\`${model.radius}\``, '')
  return `${lines.join('\n')}\n`
}

function primaryFont(stack: string): string {
  return stack.split(',')[0]?.replace(/['"]/g, '').trim() || stack
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function colorDistanceRgb(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }): number {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b)
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
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
    if (max === rn) h = 60 * (((gn - bn) / d) % 6)
    else if (max === gn) h = 60 * ((bn - rn) / d + 2)
    else h = 60 * ((rn - gn) / d + 4)
  }
  if (h < 0) h += 360
  return { h, s, l }
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const to = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}
