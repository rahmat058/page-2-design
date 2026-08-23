import { parseColor, isFullyTransparent } from '../normalize/colors';
import type { ColorUsage } from '../shared/types';
import { extractCssUrls } from './css-urls';

const COLOR_PROPS = [
  ['color', 'text'],
  ['background-color', 'background'],
  ['border-color', 'border'],
  ['outline-color', 'outline'],
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
  addShadowColors(bucket, style['box-shadow'], 'box-shadow', elementId);
  addShadowColors(bucket, style['text-shadow'], 'text-shadow', elementId);
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
  vars: { name: string; value: string }[],
  bucket: Map<string, ColorUsage>,
): void {
  for (const item of vars) {
    addColor(bucket, item.value, item.name, 'variable', 'root');
  }
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
  if (isFullyTransparent(parsed) && source !== 'background') return;
  const key = parsed.rgba;
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

function addShadowColors(
  bucket: Map<string, ColorUsage>,
  value: string | undefined,
  property: string,
  elementId: string,
): void {
  if (!value || value === 'none') return;
  const colorLikes =
    value.match(/#(?:[0-9a-f]{3,8})|rgba?\([^)]+\)|hsla?\([^)]+\)|oklch\([^)]+\)|[a-z]+/gi) ?? [];
  for (const token of colorLikes) {
    if (extractCssUrls(token).length) continue;
    addColor(bucket, token, property, 'shadow', elementId);
  }
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

export function colorUsages(bucket: Map<string, ColorUsage>): ColorUsage[] {
  return [...bucket.values()].sort(
    (a, b) => b.count - a.count || a.canonicalHex.localeCompare(b.canonicalHex),
  );
}
