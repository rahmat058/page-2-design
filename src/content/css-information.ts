/**
 * Inventories page stylesheets from the content-script context: rule counts,
 * byte estimates, and blocked cross-origin sheet hrefs.
 */
import type { CssInformation } from '../shared/types'
import { emptyCssInformation } from '../shared/types'
import { countTopLevelCssRules } from '../shared/count-css-rules'

export async function readCssInformation(): Promise<CssInformation> {
  if (typeof document === 'undefined' || !document.styleSheets) return emptyCssInformation()

  const sheets = Array.from(document.styleSheets)
  const hrefs: string[] = []
  let styleRules = 0
  let cssBytes = 0
  const blocked: string[] = []

  for (const sheet of sheets) {
    if (sheet.href && !hrefs.includes(sheet.href)) hrefs.push(sheet.href)
    try {
      styleRules += sheet.cssRules.length
      if (!sheet.href) cssBytes += cssTextBytes(sheet)
    } catch {
      if (sheet.href) blocked.push(sheet.href)
    }
  }

  const timing = cssResourceTiming()
  const sized = new Set<string>()
  let loadTimeMs: number | null = null
  let totalDuration = 0
  let foundTiming = false
  for (const entry of timing) {
    const isCss = hrefs.includes(entry.name) || blocked.includes(entry.name) || entry.initiatorType === 'css'
    if (!isCss) continue
    foundTiming = true
    totalDuration += entry.duration
    const bytes = entry.decodedBodySize || entry.encodedBodySize || entry.transferSize || 0
    if (bytes > 0) {
      cssBytes += bytes
      sized.add(entry.name)
    }
  }
  if (foundTiming) loadTimeMs = Math.round(totalDuration)

  for (const sheet of sheets) {
    if (!sheet.href || sized.has(sheet.href) || blocked.includes(sheet.href)) continue
    try {
      cssBytes += cssTextBytes(sheet)
    } catch {
      /* Cross-origin stylesheet: rules are not readable. */
    }
  }

  const seen = new Set<string>()
  for (const href of blocked) {
    if (seen.has(href)) continue
    seen.add(href)
    const fetched = await fetchCssText(href)
    if (!fetched) continue
    if (!sized.has(href)) cssBytes += fetched.byteLength
    styleRules += countTopLevelCssRules(fetched.text)
  }

  return {
    styleRules,
    stylesheetCount: sheets.length,
    cssBytes,
    loadTimeMs,
  }
}

function cssTextBytes(sheet: CSSStyleSheet): number {
  let text = ''
  for (const rule of sheet.cssRules) text += rule.cssText
  return new TextEncoder().encode(text).length
}

function cssResourceTiming(): PerformanceResourceTiming[] {
  if (typeof performance === 'undefined' || typeof performance.getEntriesByType !== 'function') return []
  return performance.getEntriesByType('resource') as PerformanceResourceTiming[]
}

async function fetchCssText(url: string): Promise<{ text: string; byteLength: number } | null> {
  try {
    const response = await fetch(url, { credentials: 'omit' })
    if (!response.ok) return null
    const buffer = await response.arrayBuffer()
    if (buffer.byteLength > 4 * 1024 * 1024) return null
    return { text: new TextDecoder('utf-8').decode(buffer), byteLength: buffer.byteLength }
  } catch {
    return null
  }
}
