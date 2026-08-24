import type { PseudoRecord } from '../shared/types'
import { extractCssUrls } from './css-urls'
import { pickComputedStyle } from './style-utils'

export function scanPseudos(root: Element, idMap: WeakMap<Element, string>, limit = 400): PseudoRecord[] {
  const records: PseudoRecord[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
  let node = walker.currentNode as Element | null
  let count = 0
  while (node && count < limit) {
    const elementId = idMap.get(node)
    if (elementId) {
      for (const pseudo of ['::before', '::after'] as const) {
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
