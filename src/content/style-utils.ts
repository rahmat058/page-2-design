import { STYLE_ALLOWLIST } from '../shared/constants';
import { hashString } from '../shared/utils';

export function pickComputedStyle(style: CSSStyleDeclaration): Record<string, string> {
  const picked: Record<string, string> = {};
  for (const prop of STYLE_ALLOWLIST) {
    const value = style.getPropertyValue(prop);
    if (value) picked[prop] = value;
  }
  return picked;
}

export function styleSignature(style: Record<string, string>): string {
  const keys = Object.keys(style).sort();
  const packed = keys.map((key) => `${key}:${style[key] ?? ''}`).join('|');
  return hashString(packed);
}

export function isVisible(
  el: Element,
  style: CSSStyleDeclaration,
): { visible: boolean; reason?: string } {
  if (!(el instanceof HTMLElement) && !(el instanceof SVGElement)) {
    return { visible: false, reason: 'non-rendered' };
  }
  if (style.display === 'none') return { visible: false, reason: 'display:none' };
  if (style.visibility === 'hidden') return { visible: false, reason: 'visibility:hidden' };
  if (style.opacity === '0') return { visible: false, reason: 'opacity:0' };
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return { visible: false, reason: 'zero-size' };
  return { visible: true };
}

export function documentBounds(el: Element) {
  const rect = el.getBoundingClientRect();
  return {
    x: Math.round(rect.left + window.scrollX),
    y: Math.round(rect.top + window.scrollY),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

export function parsePx(value: string | undefined): number | null {
  if (!value) return null;
  if (value === '0') return 0;
  const m = /^(-?\d*\.?\d+)px$/.exec(value.trim());
  if (!m) return null;
  return Number.parseFloat(m[1] ?? '');
}
