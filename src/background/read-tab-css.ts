/**
 * Privileged CSS inventory for a tab: injects inspect-css.js and optionally
 * fetches stylesheet bodies the content script could not read cross-origin.
 */
import type { CssInformation } from '../shared/types'
import { emptyCssInformation } from '../shared/types'
import { countTopLevelCssRules } from '../shared/count-css-rules'

interface PageCssSnapshot {
  stylesheetCount: number
  styleRules: number
  cssBytes: number
  loadTimeMs: number | null
  blockedHrefs: string[]
  sizedHrefs: string[]
}

export async function readTabCssInformation(tabId: number): Promise<CssInformation> {
  try {
    const injected = await chrome.scripting.executeScript({
      target: { tabId },
      files: ['inspect-css.js'],
    })
    const snap = injected?.[0]?.result as PageCssSnapshot | undefined
    if (!snap || typeof snap !== 'object' || !('stylesheetCount' in snap)) return emptyCssInformation()

    let { styleRules, cssBytes } = snap
    const { stylesheetCount, loadTimeMs } = snap
    const sizedHrefs = new Set(snap.sizedHrefs)
    const seen = new Set<string>()

    for (const href of snap.blockedHrefs) {
      if (!href || seen.has(href)) continue
      seen.add(href)
      const fetched = await fetchCss(href)
      if (!fetched) continue
      if (!sizedHrefs.has(href)) cssBytes += fetched.byteLength
      styleRules += countTopLevelCssRules(fetched.text)
    }

    return { styleRules, stylesheetCount, cssBytes, loadTimeMs }
  } catch {
    return emptyCssInformation()
  }
}

async function fetchCss(url: string): Promise<{ text: string; byteLength: number } | null> {
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
