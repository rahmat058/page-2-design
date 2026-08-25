/**
 * Picks allowlisted computed style props, builds style signatures, and derives
 * visibility plus document-space bounds from a single getBoundingClientRect.
 */
import { STYLE_ALLOWLIST } from '../shared/constants'
import type { BoundingBox, VisibilityInfo } from '../shared/types'
import { hashString } from '../shared/utils'

export function pickComputedStyle(style: CSSStyleDeclaration): Record<string, string> {
  const picked: Record<string, string> = {}
  for (const prop of STYLE_ALLOWLIST) {
    const value = style.getPropertyValue(prop)
    if (value) picked[prop] = value
  }
  return picked
}

export function styleSignature(style: Record<string, string>): string {
  const keys = Object.keys(style).sort()
  const packed = keys.map((key) => `${key}:${style[key] ?? ''}`).join('|')
  return hashString(packed)
}

/** Style-only visibility (no layout). */
function styleVisibility(el: Element, style: CSSStyleDeclaration): VisibilityInfo | null {
  if (!(el instanceof HTMLElement) && !(el instanceof SVGElement)) {
    return { visible: false, reason: 'non-rendered' }
  }
  if (style.display === 'none') return { visible: false, reason: 'display:none' }
  if (style.visibility === 'hidden') return { visible: false, reason: 'visibility:hidden' }
  if (style.opacity === '0') return { visible: false, reason: 'opacity:0' }
  return null
}

function boundsFromRect(rect: DOMRect): BoundingBox {
  return {
    x: Math.round(rect.left + window.scrollX),
    y: Math.round(rect.top + window.scrollY),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  }
}

/** One `getBoundingClientRect` for visibility (zero-size) and document bounds. */
export function visibilityAndBounds(
  el: Element,
  style: CSSStyleDeclaration,
): { visibility: VisibilityInfo; bounds: BoundingBox } {
  const early = styleVisibility(el, style)
  if (early) {
    return { visibility: early, bounds: { x: 0, y: 0, width: 0, height: 0 } }
  }
  const rect = el.getBoundingClientRect()
  const bounds = boundsFromRect(rect)
  if (rect.width === 0 && rect.height === 0) {
    return { visibility: { visible: false, reason: 'zero-size' }, bounds }
  }
  return { visibility: { visible: true }, bounds }
}

export function isVisible(el: Element, style: CSSStyleDeclaration): VisibilityInfo {
  return visibilityAndBounds(el, style).visibility
}

export function documentBounds(el: Element): BoundingBox {
  return boundsFromRect(el.getBoundingClientRect())
}

export function parsePx(value: string | undefined): number | null {
  if (!value) return null
  if (value === '0') return 0
  const m = /^(-?\d*\.?\d+)px$/.exec(value.trim())
  if (!m) return null
  return Number.parseFloat(m[1] ?? '')
}
