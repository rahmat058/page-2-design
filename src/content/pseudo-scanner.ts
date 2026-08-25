import { DOM_SCAN_YIELD_EVERY, MAX_PSEUDOS, MAX_PSEUDO_STYLE_QUERIES } from '../shared/constants'
import type { PseudoRecord } from '../shared/types'
import { extractCssUrls } from './css-urls'
import { yieldToMain } from './scan-context'
import { pickComputedStyle } from './style-utils'

export async function scanPseudos(
  root: Element,
  idMap: WeakMap<Element, string>,
  limit = MAX_PSEUDOS,
): Promise<PseudoRecord[]> {
  const records: PseudoRecord[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
  let node = walker.currentNode as Element | null
  let count = 0
  let styleQueries = 0
  let visited = 0

  while (node && count < limit && styleQueries < MAX_PSEUDO_STYLE_QUERIES) {
    visited += 1
    if (visited % DOM_SCAN_YIELD_EVERY === 0) {
      await yieldToMain()
    }

    const elementId = idMap.get(node)
    if (elementId) {
      for (const pseudo of ['::before', '::after'] as const) {
        if (count >= limit || styleQueries >= MAX_PSEUDO_STYLE_QUERIES) break
        styleQueries += 1
        const style = getComputedStyle(node, pseudo)
        const content = style.content
        if (!content || content === 'none' || content === 'normal') continue
        const display = style.display
        if (display === 'none') continue
        records.push({
          elementId,
          pseudo,
          content,
          bounds: {
            x: 0,
            y: 0,
            width: Number.parseFloat(style.width) || 0,
            height: Number.parseFloat(style.height) || 0,
          },
          styles: pickComputedStyle(style),
          colors: [style.color, style.backgroundColor, style.borderColor].filter(Boolean),
          assetUrls: extractCssUrls(style.backgroundImage).concat(extractCssUrls(style.content)),
        })
        count += 1
      }
    }
    node = walker.nextNode() as Element | null
  }
  return records
}
