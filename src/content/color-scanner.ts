import { parseColor } from '../normalize/colors';
import type { ColorUsage } from '../shared/types';

const COLOR_PROPS = [
  ['color', 'text'],
  ['background-color', 'background'],
  ['border-top-color', 'border'],
  ['fill', 'svg'],
  ['stroke', 'svg'],
] as const;

export function collectColors(
  elementId: string,
  style: Record<string, string>,
  bucket: Map<string, ColorUsage>,
): void {
  for (const [prop, source] of COLOR_PROPS) {
    addColor(bucket, style[prop], prop, source, elementId);
  }
  addGradientColors(bucket, style['background-image'], elementId);
}

export function collectSvgColors(
  el: Element,
  elementId: string,
  bucket: Map<string, ColorUsage>,
): void {
  if (el.tagName.toLowerCase() !== 'svg' && !el.closest('svg')) return;
  const fill =
    el.getAttribute('fill') ||
    (el instanceof HTMLElement || el instanceof SVGElement ? getComputedStyle(el).fill : '');
  const stroke =
    el.getAttribute('stroke') ||
    (el instanceof HTMLElement || el instanceof SVGElement ? getComputedStyle(el).stroke : '');
  addColor(bucket, fill, 'fill', 'svg', elementId);
  addColor(bucket, stroke, 'stroke', 'svg', elementId);
}

export function collectCssVariableColors(
  _vars: { name: string; value: string }[],
  _bucket: Map<string, ColorUsage>,
): void {
  /* Unused design-token variables inflate the palette. Visual colors come from computed styles. */
}

function addColor(
  bucket: Map<string, ColorUsage>,
  raw: string | undefined,
  property: string,
  source: ColorUsage['source'],
  elementId: string,
): void {
  if (!raw) return;
  const parsed = parseColor(raw);
  if (!parsed) return;
  if (parsed.a < 0.08) return;
  if (source === 'border' && parsed.a < 0.2) return;
  const key = paletteKey(parsed);
  const existing = bucket.get(key);
  if (existing) {
    existing.count += 1;
    if (!existing.properties.includes(property)) existing.properties.push(property);
    if (!existing.elementIds.includes(elementId)) existing.elementIds.push(elementId);
    if (!existing.original.includes(raw)) existing.original.push(raw);
    return;
  }
  bucket.set(key, {
    original: [raw],
    canonicalRgba: parsed.rgba,
    canonicalHex: parsed.hex,
    properties: [property],
    count: 1,
    elementIds: [elementId],
    source,
  });
}

function addGradientColors(
  bucket: Map<string, ColorUsage>,
  value: string | undefined,
  elementId: string,
): void {
  if (!value || value === 'none' || !value.includes('gradient')) return;
  const colorLikes =
    value.match(/#(?:[0-9a-f]{3,8})|rgba?\([^)]+\)|hsla?\([^)]+\)|oklch\([^)]+\)/gi) ?? [];
  for (const token of colorLikes) {
    addColor(bucket, token, 'background-image', 'gradient', elementId);
  }
}

function paletteKey(parsed: NonNullable<ReturnType<typeof parseColor>>): string {
  const alpha = parsed.a >= 0.92 ? 1 : Math.round(parsed.a * 10) / 10;
  return `${parsed.r},${parsed.g},${parsed.b},${alpha}`;
}

export function colorUsages(bucket: Map<string, ColorUsage>): ColorUsage[] {
  return [...bucket.values()].sort(
    (a, b) => b.count - a.count || a.canonicalHex.localeCompare(b.canonicalHex),
  );
}
