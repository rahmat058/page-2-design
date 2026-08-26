/**
 * Layout token sanity filters and count helpers for the Layout tab.
 */
import type { DesignToken, NormalizedDesign } from '../../shared/types'

export const MAX_SANE_LAYOUT_PX = 1200

export function isSaneLayoutToken(token: DesignToken): boolean {
  if (!token.value.trim()) return false
  if (/e[+-]?\d+/i.test(token.value)) return false
  if (token.px != null && (token.px < 0 || token.px > MAX_SANE_LAYOUT_PX)) return false
  const nums = [...token.value.matchAll(/-?\d*\.?\d+/g)].map((m) => Number(m[0]))
  if (nums.some((n) => !Number.isFinite(n) || Math.abs(n) > MAX_SANE_LAYOUT_PX * 4)) return false
  return true
}

export function layoutItemCount(design: NormalizedDesign): number {
  const spacing = design.tokens.spacing.filter(isSaneLayoutToken).length
  const radii = design.tokens.radii.filter(isSaneLayoutToken).length
  const shadows = design.tokens.shadows.filter((token) => token.value.trim().length > 0).length
  return design.sections.length + spacing + radii + shadows
}
