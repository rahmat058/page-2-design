/**
 * Builds typography token signatures from font/size/weight/line-height styles
 * and aggregates TypographyUsage maps for the scan.
 */
import type { TypographyUsage } from '../shared/types'
import { hashString } from '../shared/utils'

export function typographySignature(style: Record<string, string>): string {
  const parts = [
    style['font-family'] ?? '',
    style['font-size'] ?? '',
    style['font-weight'] ?? '',
    style['font-style'] ?? '',
    style['line-height'] ?? '',
    style['letter-spacing'] ?? '',
    style['font-stretch'] ?? '',
    style['text-transform'] ?? '',
    style['text-decoration'] ?? '',
    style['text-align'] ?? '',
    style['font-feature-settings'] ?? '',
    style['font-variation-settings'] ?? '',
  ]
  return hashString(parts.join('|'))
}

export function collectTypography(
  elementId: string,
  style: Record<string, string>,
  text: string,
  classNames: string[],
  tagName: string,
  bucket: Map<string, TypographyUsage>,
): void {
  if (!text && !['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'button', 'label', 'li', 'span'].includes(tagName)) {
    return
  }
  const signature = typographySignature(style)
  const selector = classNames[0] ? `${tagName}.${classNames[0]}` : tagName
  const existing = bucket.get(signature)
  if (existing) {
    existing.count += 1
    if (!existing.elementIds.includes(elementId)) existing.elementIds.push(elementId)
    if (!existing.selectors.includes(selector)) existing.selectors.push(selector)
    return
  }
  bucket.set(signature, {
    signature,
    fontFamily: style['font-family'] ?? '',
    fontSize: style['font-size'] ?? '',
    fontWeight: style['font-weight'] ?? '',
    fontStyle: style['font-style'] ?? 'normal',
    lineHeight: style['line-height'] ?? '',
    letterSpacing: style['letter-spacing'] ?? 'normal',
    fontStretch: style['font-stretch'] ?? 'normal',
    textTransform: style['text-transform'] ?? 'none',
    textDecoration: style['text-decoration'] ?? 'none',
    textAlign: style['text-align'] ?? 'start',
    fontFeatureSettings: style['font-feature-settings'] ?? 'normal',
    fontVariationSettings: style['font-variation-settings'] ?? 'normal',
    count: 1,
    elementIds: [elementId],
    selectors: [selector],
  })
}

export function typographyUsages(bucket: Map<string, TypographyUsage>): TypographyUsage[] {
  return [...bucket.values()].sort((a, b) => b.count - a.count || a.fontSize.localeCompare(b.fontSize))
}

export function looksProprietaryFont(family: string): boolean {
  const safe =
    /^(serif|sans-serif|monospace|system-ui|ui-sans-serif|ui-serif|ui-monospace|cursive|fantasy|emoji|math|inherit|initial)$/i
  const stacks = family.split(',').map((p) => p.trim().replace(/['"]/g, ''))
  return stacks.some(
    (name) =>
      name &&
      !safe.test(name) &&
      !/^(arial|helvetica|times|georgia|verdana|tahoma|trebuchet|courier|garamond)$/i.test(name),
  )
}
