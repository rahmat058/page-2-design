import { parseColor } from '../normalize/colors'
import type { ColorUsage } from '../shared/types'

const COLOR_PROPS = [
  ['color', 'text', 0.28],
  ['background-color', 'background', 1],
  ['fill', 'svg', 0.7],
  ['stroke', 'svg', 0.2],
  ['border-color', 'border', 0.08],
] as const

export function collectColors(
  elementId: string,
  style: Record<string, string>,
  bucket: Map<string, ColorUsage>,
  area = 1,
): void {
  const px = Math.max(1, Math.round(area))
  for (const [prop, source, weight] of COLOR_PROPS) {
    addSolid(bucket, style[prop], prop, source, elementId, px * weight)
  }
  addGradient(bucket, style['background-image'], elementId, px)
}

export function collectSvgColors(el: Element, elementId: string, bucket: Map<string, ColorUsage>): void {
  if (el.tagName.toLowerCase() !== 'svg' && !el.closest('svg')) return
  const fill =
    el.getAttribute('fill') || (el instanceof HTMLElement || el instanceof SVGElement ? getComputedStyle(el).fill : '')
  const stroke =
    el.getAttribute('stroke') ||
    (el instanceof HTMLElement || el instanceof SVGElement ? getComputedStyle(el).stroke : '')
  addSolid(bucket, fill, 'fill', 'svg', elementId, 4)
  addSolid(bucket, stroke, 'stroke', 'svg', elementId, 2)
}

export function collectCssVariableColors(
  _vars: { name: string; value: string }[],
  _bucket: Map<string, ColorUsage>,
): void {
  /* Visual colors come from computed styles, not unused tokens. */
}

function addSolid(
  bucket: Map<string, ColorUsage>,
  raw: string | undefined,
  property: string,
  source: ColorUsage['source'],
  elementId: string,
  area: number,
): void {
  if (!raw) return
  const parsed = parseColor(raw)
  if (!parsed || parsed.a < 0.08) return
  const key = `solid:${parsed.r},${parsed.g},${parsed.b},${parsed.a >= 0.96 ? 1 : Math.round(parsed.a * 20) / 20}`
  const painted = Math.max(1, Math.round(area))
  const existing = bucket.get(key)
  if (existing) {
    existing.count += 1
    existing.area = (existing.area ?? 0) + painted
    if (!existing.properties.includes(property)) existing.properties.push(property)
    if (!existing.elementIds.includes(elementId)) existing.elementIds.push(elementId)
    if (!existing.original.includes(raw)) existing.original.push(raw)
    return
  }
  bucket.set(key, {
    original: [raw],
    canonicalRgba: parsed.rgba,
    canonicalHex: displayHex(parsed.hex),
    properties: [property],
    count: 1,
    area: painted,
    elementIds: [elementId],
    source,
  })
}

function addGradient(
  bucket: Map<string, ColorUsage>,
  value: string | undefined,
  elementId: string,
  area: number,
): void {
  if (!value || value === 'none' || !/gradient\(/i.test(value)) return
  const css = value.trim()
  const key = `gradient:${css}`
  const stops = css.match(/#(?:[0-9a-f]{3,8})|rgba?\([^)]+\)|hsla?\([^)]+\)|oklch\([^)]+\)/gi) ?? []
  const first = stops.map((stop) => parseColor(stop)).find((color) => color && color.a >= 0.08)
  const painted = Math.max(1, Math.round(area))
  const existing = bucket.get(key)
  if (existing) {
    existing.count += 1
    existing.area = (existing.area ?? 0) + painted
    if (!existing.elementIds.includes(elementId)) existing.elementIds.push(elementId)
  } else {
    bucket.set(key, {
      original: [css],
      canonicalRgba: first?.rgba ?? 'rgba(0, 0, 0, 1)',
      canonicalHex: displayHex(first?.hex ?? '#000000'),
      properties: ['background-image'],
      count: 1,
      area: painted,
      elementIds: [elementId],
      source: 'gradient',
    })
  }
  for (const stop of stops) {
    addSolid(bucket, stop, 'background-image', 'background', elementId, painted * 0.9)
  }
}

function displayHex(hex: string): string {
  if (/^#[0-9a-f]{8}$/i.test(hex) && hex.slice(7).toUpperCase() === 'FF') {
    return hex.slice(0, 7).toUpperCase()
  }
  return hex.toUpperCase()
}

export function colorUsages(bucket: Map<string, ColorUsage>): ColorUsage[] {
  return [...bucket.values()].sort(
    (a, b) => (b.area || b.count) - (a.area || a.count) || a.canonicalHex.localeCompare(b.canonicalHex),
  )
}
