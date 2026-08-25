/**
 * Lightweight sanity checks on raw and normalized scans, plus secret leakage
 * detection against known sensitive strings.
 */
import type { NormalizedDesign, PageScan } from '../shared/types'

export function validateScan(raw: PageScan): string[] {
  const warnings: string[] = []
  if (!raw.metadata.url) warnings.push('Missing page URL.')
  if (raw.elements.length === 0) warnings.push('No elements were captured.')
  const joined = JSON.stringify(raw)
  if (/"password"\s*:/.test(joined) && /"value"\s*:\s*"[^"]+"/.test(joined)) {
    warnings.push('Possible sensitive field leakage.')
  }
  return warnings
}

export function validateNormalized(design: NormalizedDesign): string[] {
  const warnings: string[] = []
  if (design.tokens.colors.length === 0) warnings.push('No color tokens were inferred.')
  if (design.content.length === 0) warnings.push('No content blocks were captured.')
  return warnings
}

export function containsSensitiveValue(payload: unknown, secrets: string[]): boolean {
  const text = JSON.stringify(payload)
  return secrets.some((secret) => secret && text.includes(secret))
}
