/**
 * Extracts ordered text/content blocks from elements, respecting contentScope
 * (main vs full page) and skipping sensitive form fields.
 */
import { isSensitiveInput } from '../shared/redact'
import type { ContentBlock, ContentScope } from '../shared/types'
import type { ScanRuntime } from './scan-context'

export function collectContentFromElement(
  el: Element,
  elementId: string,
  runtime: ScanRuntime,
  startOrder: number,
): ContentBlock[] {
  if (isSensitiveInput(el)) return []

  const tag = el.tagName.toLowerCase()
  const blocks: ContentBlock[] = []
  const inMain = Boolean(el.closest('main'))
  const inChrome = Boolean(el.closest('header, nav, footer'))

  if (runtime.options.contentScope === 'main' && !inMain && !inChrome) {
    if (!['main', 'header', 'nav', 'footer'].includes(tag)) {
      /* keep headings that may live outside main */
      if (!/^h[1-6]$/.test(tag)) return []
    }
  }
  if (!runtime.options.includeNavigationAndFooter && inChrome) return []

  const push = (kind: ContentBlock['kind'], text: string, extra?: Partial<ContentBlock>) => {
    const cleaned = text.replace(/\s+/g, ' ').trim()
    if (!cleaned) return
    blocks.push({
      id: `c_${elementId}_${blocks.length}`,
      kind,
      level: extra?.level ?? headingLevel(tag),
      text: cleaned.slice(0, 1000),
      href: extra?.href ?? null,
      elementId,
      sectionId: null,
      order: startOrder + blocks.length,
    })
  }

  if (/^h[1-6]$/.test(tag)) {
    push('heading', el.textContent ?? '', { level: headingLevel(tag) })
  } else if (tag === 'p') {
    push('paragraph', directishText(el))
  } else if (tag === 'li') {
    push('list-item', directishText(el))
  } else if (tag === 'ul' || tag === 'ol') {
    push('list', `${tag} (${el.children.length} items)`)
  } else if (tag === 'a') {
    const href = (el as HTMLAnchorElement).href || el.getAttribute('href')
    push('link', el.textContent ?? href ?? '', { href: href ?? null })
  } else if (tag === 'button' || el.getAttribute('role') === 'button') {
    push('button', el.textContent ?? el.getAttribute('aria-label') ?? '')
  } else if (tag === 'nav') {
    push('navigation', el.getAttribute('aria-label') || 'Navigation')
  } else if (tag === 'label') {
    push('label', el.textContent ?? '')
  } else if (tag === 'input' || tag === 'textarea') {
    const placeholder = el.getAttribute('placeholder')
    if (placeholder) push('placeholder', placeholder)
  } else if (tag === 'table') {
    push('table', summarizeTable(el))
  } else if (tag === 'img') {
    const alt = el.getAttribute('alt')
    if (alt) push('image-alt', alt)
  }

  const aria = el.getAttribute('aria-label')
  if (aria && !blocks.some((b) => b.text === aria)) {
    push('aria', aria)
  }

  return blocks
}

export function orderContent(blocks: ContentBlock[]): ContentBlock[] {
  return [...blocks].sort((a, b) => a.order - b.order).map((block, index) => ({ ...block, order: index }))
}

function headingLevel(tag: string): number | null {
  const m = /^h([1-6])$/.exec(tag)
  return m ? Number(m[1]) : null
}

function directishText(el: Element): string {
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function summarizeTable(el: Element): string {
  const captions = el.querySelector('caption')?.textContent?.trim()
  const rows = el.querySelectorAll('tr').length
  const cols = el.querySelector('tr')?.children.length ?? 0
  return [captions, `${rows} rows × ${cols} columns`].filter(Boolean).join(' — ')
}

export function filterContentByScope(blocks: ContentBlock[], _scope: ContentScope): ContentBlock[] {
  return orderContent(blocks)
}
