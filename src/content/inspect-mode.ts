import { colorIsExact, isFullyTransparent, parseColor } from '../normalize/colors'
import { createMessage, createRequestId, type InspectedElement } from '../shared/messages'

const BOX_ID = 'page2design-inspect-box'
const CARD_ID = 'page2design-inspect-card'
const HIT_ID = 'page2design-color-hit'

let enabled = false
let allowContextMenu = false
let box: HTMLDivElement | null = null
let activeKey: string | null = null
let hitIndex = -1
let inspectRaf = 0
let pendingEl: Element | null = null
let lastEl: Element | null = null
let lockedEl: Element | null = null
let cardHost: HTMLDivElement | null = null
let lastCardKey: string | null = null
let lastHoverEl: Element | null = null

export function isInspectEnabled(): boolean {
  return enabled
}

export function setInspectMode(next: boolean, contextMenu?: boolean): void {
  if (typeof contextMenu === 'boolean') allowContextMenu = contextMenu
  if (next === enabled) {
    if (enabled) refreshHoverCard()
    return
  }
  enabled = next
  if (!enabled) {
    window.removeEventListener('mousemove', onMove, true)
    window.removeEventListener('click', onClick, true)
    box?.remove()
    box = null
    hideHoverCard(true)
    clearColorHit()
    activeKey = null
    hitIndex = -1
    pendingEl = null
    lastEl = null
    lockedEl = null
    lastHoverEl = null
    if (inspectRaf) {
      cancelAnimationFrame(inspectRaf)
      inspectRaf = 0
    }
    return
  }
  ensureBox()
  window.addEventListener('mousemove', onMove, true)
  window.addEventListener('click', onClick, true)
  refreshHoverCard()
}

export function setInspectContextMenu(next: boolean): void {
  allowContextMenu = next
  if (!next) {
    hideHoverCard(false)
    return
  }
  refreshHoverCard()
}

function ensureBox(): HTMLDivElement {
  if (box?.isConnected) return box
  box = document.createElement('div')
  box.id = BOX_ID
  Object.assign(box.style, {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: '2147483645',
    border: '2px solid #ff93ab',
    background: 'rgba(255, 147, 171, 0.12)',
    borderRadius: '4px',
    display: 'none',
  } as CSSStyleDeclaration)
  document.documentElement.appendChild(box)
  return box
}

function onMove(event: MouseEvent): void {
  if (!enabled) return
  const target = event.target
  if (!(target instanceof Element)) return
  if (isOverlay(target)) {
    if (box) box.style.display = 'none'
    hideHoverCard(false)
    return
  }
  const rect = target.getBoundingClientRect()
  lastHoverEl = target
  const highlight = ensureBox()
  highlight.style.display = 'block'
  highlight.style.left = `${rect.left}px`
  highlight.style.top = `${rect.top}px`
  highlight.style.width = `${rect.width}px`
  highlight.style.height = `${rect.height}px`
  if (allowContextMenu) {
    try {
      showHoverCard(target, rect)
    } catch {
      /* page CSS or CSP should not break inspect */
    }
  } else {
    hideHoverCard(false)
  }
  if (lockedEl) return
  scheduleInspect(target, false)
}

function onClick(event: MouseEvent): void {
  if (!enabled) return
  const target = event.target
  if (!(target instanceof Element)) return
  if (isOverlay(target)) return
  if (!allowContextMenu) {
    event.preventDefault()
    event.stopPropagation()
  }
  if (lockedEl === target) {
    lockedEl = null
    emitInspect(target, false)
    return
  }
  lockedEl = target
  emitInspect(target, true)
}

function scheduleInspect(el: Element, locked: boolean): void {
  pendingEl = el
  if (inspectRaf) return
  inspectRaf = requestAnimationFrame(() => {
    inspectRaf = 0
    if (pendingEl) emitInspect(pendingEl, locked)
  })
}

function emitInspect(el: Element, locked: boolean): void {
  if (!locked && (lockedEl || el === lastEl)) return
  lastEl = el
  try {
    const sending = chrome.runtime.sendMessage(
      createMessage({
        type: 'INSPECT_ELEMENT',
        requestId: createRequestId(),
        payload: describeElement(el, locked),
      }),
    )
    if (sending && typeof sending.catch === 'function') sending.catch(() => {})
  } catch {
    /* panel may be closed */
  }
}

function describeElement(el: Element, locked: boolean): InspectedElement {
  const style = getComputedStyle(el)
  const rect = el.getBoundingClientRect()
  const tag = el.tagName.toLowerCase()
  const color = rgbToHex(style.color)
  const html = el.outerHTML
  return {
    label: elementLabel(el),
    kind: classifyKind(el, tag),
    text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 140),
    width: Math.round(rect.width * 10) / 10,
    height: Math.round(rect.height * 10) / 10,
    locked,
    box: {
      margin: readSides(style, 'margin'),
      border: readSides(style, 'border', 'Width'),
      padding: readSides(style, 'padding'),
    },
    typography: {
      fontFamily: style.fontFamily || '—',
      fontSize: style.fontSize || '—',
      lineHeight: style.lineHeight || 'normal',
      fontWeight: weightLabel(style.fontWeight),
      letterSpacing: style.letterSpacing === 'normal' ? 'normal' : style.letterSpacing,
      color,
    },
    background: effectiveBackground(el),
    borderRadius: style.borderTopLeftRadius || '0px',
    code: html.length > 4000 ? `${html.slice(0, 4000)}…` : html,
  }
}

function readSides(
  style: CSSStyleDeclaration,
  prefix: 'margin' | 'border' | 'padding',
  suffix = '',
): { top: number; right: number; bottom: number; left: number } {
  const read = (side: string) => {
    const raw = style.getPropertyValue(`${prefix}-${side}${suffix ? `-${suffix.toLowerCase()}` : ''}`)
    const n = Number.parseFloat(raw)
    return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0
  }
  return { top: read('top'), right: read('right'), bottom: read('bottom'), left: read('left') }
}

function elementLabel(el: Element): string {
  const tag = el.tagName.toLowerCase()
  const className = typeof el.className === 'string' ? el.className.trim() : ''
  if (!className) return tag
  const classes = className
    .split(/\s+/)
    .filter((c) => !c.startsWith('page2design-'))
    .slice(0, 5)
    .map((c) => `.${c}`)
    .join('')
  return `${tag}${classes}`
}

function classifyKind(el: Element, tag: string): string {
  if (['img', 'svg', 'picture', 'video', 'canvas'].includes(tag)) return 'Image'
  if (tag === 'a') return 'Link'
  if (tag === 'button' || (tag === 'input' && ['button', 'submit', 'reset'].includes((el as HTMLInputElement).type)))
    return 'Button'
  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) return 'Heading'
  if (['input', 'textarea', 'select'].includes(tag)) return 'Input'
  if (['p', 'span', 'strong', 'em', 'li', 'label', 'small', 'blockquote', 'b', 'i', 'code'].includes(tag)) return 'Text'
  return 'Container'
}

function weightLabel(value: string): string {
  const n = value === 'normal' ? '400' : value === 'bold' ? '700' : value.trim()
  const names: Record<string, string> = {
    '100': 'Thin',
    '200': 'Extra Light',
    '300': 'Light',
    '400': 'Regular',
    '500': 'Medium',
    '600': 'Semi Bold',
    '700': 'Bold',
    '800': 'Extra Bold',
    '900': 'Black',
  }
  return names[n] ? `${names[n]} (${n})` : n
}

function rgbToHex(value: string): string {
  const parsed = parseColor(value)
  if (!parsed) return value
  const hex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${hex(parsed.r)}${hex(parsed.g)}${hex(parsed.b)}`.toUpperCase()
}

function effectiveBackground(el: Element): string | null {
  let node: Element | null = el
  let depth = 0
  while (node && depth < 30) {
    const style = getComputedStyle(node)
    if (/gradient\(/i.test(style.backgroundImage)) return null
    const parsed = parseColor(style.backgroundColor)
    if (parsed && !isFullyTransparent(parsed)) return rgbToHex(style.backgroundColor)
    node = node.parentElement
    depth += 1
  }
  return null
}

export function highlightColorOnPage(payload: {
  hex?: string | null
  css?: string | null
  typography?: {
    fontFamily: string
    fontSize: string
    fontWeight: string
    lineHeight: string
  } | null
}): { index: number; total: number; done: boolean } {
  const key = payload.typography
    ? `type:${payload.typography.fontFamily}|${payload.typography.fontSize}|${payload.typography.fontWeight}|${payload.typography.lineHeight}`
    : (payload.css || payload.hex || '').replace(/\s+/g, ' ').trim()
  if (!key) {
    clearColorHit()
    activeKey = null
    hitIndex = -1
    return { index: 0, total: 0, done: true }
  }

  const hits = payload.typography ? collectTypeHits(payload.typography) : collectExactHits(payload)
  if (hits.length === 0) {
    clearColorHit()
    activeKey = null
    hitIndex = -1
    return { index: 0, total: 0, done: true }
  }

  if (activeKey !== key) {
    activeKey = key
    hitIndex = 0
  } else {
    hitIndex += 1
    if (hitIndex >= hits.length) {
      clearColorHit()
      activeKey = null
      hitIndex = -1
      return { index: 0, total: hits.length, done: true }
    }
  }

  paintHit(hits[hitIndex] as Element)
  return { index: hitIndex, total: hits.length, done: false }
}

function collectTypeHits(token: {
  fontFamily: string
  fontSize: string
  fontWeight: string
  lineHeight: string
}): Element[] {
  const hits: Element[] = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT)
  while (walker.nextNode() && hits.length < 200) {
    const el = walker.currentNode as Element
    if (el.id?.startsWith('page2design-')) continue
    if (isOverlay(el)) continue
    if (!el.textContent?.trim()) continue
    const style = getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue
    if (!typeMatches(style, token)) continue
    const rect = el.getBoundingClientRect()
    if (rect.width < 2 && rect.height < 2) continue
    hits.push(el)
  }
  return hits
}

function typeMatches(
  style: CSSStyleDeclaration,
  token: { fontFamily: string; fontSize: string; fontWeight: string; lineHeight: string },
): boolean {
  if (normalizeFamily(style.fontFamily) !== normalizeFamily(token.fontFamily)) return false
  if (normalizePx(style.fontSize) !== normalizePx(token.fontSize)) return false
  if (normalizeWeight(style.fontWeight) !== normalizeWeight(token.fontWeight)) return false
  if (normalizePx(style.lineHeight) !== normalizePx(token.lineHeight)) return false
  return true
}

function normalizeFamily(stack: string): string {
  return stack.split(',')[0]?.replace(/['"]/g, '').trim().toLowerCase() || stack.toLowerCase()
}

function normalizePx(value: string): string {
  const n = Number.parseFloat(value)
  if (!Number.isFinite(n)) return value.trim().toLowerCase()
  return `${Math.round(n * 10) / 10}`
}

function normalizeWeight(value: string): string {
  if (value === 'normal') return '400'
  if (value === 'bold') return '700'
  return value.trim()
}

function collectExactHits(payload: { hex?: string | null; css?: string | null }): Element[] {
  const gradient = payload.css && /gradient\(/i.test(payload.css) ? payload.css.replace(/\s+/g, ' ').trim() : null
  const hits: Element[] = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT)
  while (walker.nextNode() && hits.length < 200) {
    const el = walker.currentNode as Element
    if (el.id?.startsWith('page2design-')) continue
    if (isOverlay(el)) continue
    const style = getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue
    const match = gradient
      ? style.backgroundImage.replace(/\s+/g, ' ').trim() === gradient
      : Boolean(
          payload.hex &&
          [style.color, style.backgroundColor, style.borderTopColor, style.fill, style.stroke].some((value) =>
            colorIsExact(value, payload.hex as string),
          ),
        )
    if (!match) continue
    const rect = el.getBoundingClientRect()
    if (rect.width < 2 && rect.height < 2) continue
    hits.push(el)
  }
  return hits
}

function paintHit(el: Element): void {
  el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
  window.requestAnimationFrame(() => {
    const rect = el.getBoundingClientRect()
    clearColorHit()
    const mark = document.createElement('div')
    mark.id = HIT_ID
    Object.assign(mark.style, {
      position: 'fixed',
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      border: '2px solid #7c5cfc',
      background: 'rgba(124, 92, 252, 0.12)',
      borderRadius: '4px',
      pointerEvents: 'none',
      zIndex: '2147483644',
    } as CSSStyleDeclaration)
    document.documentElement.appendChild(mark)
  })
}

function clearColorHit(): void {
  document.getElementById(HIT_ID)?.remove()
  document.getElementById('page2design-color-hits')?.remove()
}

function isOverlay(el: Element): boolean {
  return Boolean(
    el.closest?.('#page2design-overlay-root') ||
      el.id === 'page2design-overlay-root' ||
      el.id === BOX_ID ||
      el.id === CARD_ID ||
      el.id === HIT_ID,
  )
}

function hideHoverCard(remove: boolean): void {
  lastCardKey = null
  if (remove) {
    cardHost?.remove()
    cardHost = null
    return
  }
  if (cardHost) cardHost.style.setProperty('display', 'none', 'important')
}

function refreshHoverCard(): void {
  if (!enabled || !allowContextMenu || !lastHoverEl?.isConnected) return
  try {
    showHoverCard(lastHoverEl, lastHoverEl.getBoundingClientRect())
  } catch {
    /* ignore */
  }
}

function showHoverCard(el: Element, rect: DOMRect): void {
  const host = ensureCard()
  const style = getComputedStyle(el)
  const color = rgbToHex(style.color)
  const background = effectiveBackground(el) || 'transparent'
  const family = primaryFont(style.fontFamily)
  const width = Math.round(rect.width * 10) / 10
  const height = Math.round(rect.height * 10) / 10
  const label = elementLabel(el)
  const kind = classifyKind(el, el.tagName.toLowerCase())
  const key = `${kind}|${label}|${width}|${height}|${color}|${background}|${family}|${style.fontSize}`
  if (key !== lastCardKey) {
    lastCardKey = key
    setText(host, 'p2d-kind', kind)
    setText(host, 'p2d-label', label)
    setText(host, 'p2d-size', `${formatPx(width)} × ${formatPx(height)}`)
    setText(host, 'p2d-text-hex', color)
    setText(host, 'p2d-bg-hex', background)
    setText(host, 'p2d-font', family)
    setText(host, 'p2d-font-size', style.fontSize)
    const textSwatch = host.querySelector('[data-p2d="text-swatch"]') as HTMLElement | null
    const bgSwatch = host.querySelector('[data-p2d="bg-swatch"]') as HTMLElement | null
    if (textSwatch) textSwatch.style.setProperty('background', color, 'important')
    if (bgSwatch) bgSwatch.style.setProperty('background', background === 'transparent' ? '#ffffff' : background, 'important')
  }
  host.style.setProperty('display', 'block', 'important')
  const cardW = host.offsetWidth || 300
  const cardH = host.offsetHeight || 180
  const gap = 10
  let left = rect.left
  let top = rect.bottom + gap
  if (top + cardH > window.innerHeight - 8) top = rect.top - cardH - gap
  if (top < 8) top = 8
  if (left + cardW > window.innerWidth - 8) left = window.innerWidth - cardW - 8
  if (left < 8) left = 8
  host.style.setProperty('left', `${Math.round(left)}px`, 'important')
  host.style.setProperty('top', `${Math.round(top)}px`, 'important')
}

function setText(host: HTMLElement, key: string, value: string): void {
  const node = host.querySelector(`[data-p2d="${key}"]`)
  if (node) node.textContent = value
}

function important(el: HTMLElement, styles: Record<string, string>): void {
  for (const [name, value] of Object.entries(styles)) {
    el.style.setProperty(name, value, 'important')
  }
}

function ensureCard(): HTMLDivElement {
  if (cardHost?.isConnected) return cardHost
  cardHost = document.createElement('div')
  cardHost.id = CARD_ID
  cardHost.setAttribute('data-page2design', 'inspect-card')
  important(cardHost, {
    position: 'fixed',
    left: '0px',
    top: '0px',
    'z-index': '2147483647',
    'pointer-events': 'none',
    display: 'none',
    width: '300px',
    'max-width': 'min(300px, calc(100vw - 16px))',
    'box-sizing': 'border-box',
    margin: '0',
    padding: '0',
    overflow: 'hidden',
    border: '1px solid #edf0f3',
    'border-radius': '14px',
    background: '#ffffff',
    'box-shadow': '0 18px 40px rgb(10 10 10 / 0.16), 0 0 0 1px rgb(255 147 171 / 0.18)',
    color: '#0a0a0a',
    font: '12px/1.4 "Segoe UI", system-ui, sans-serif',
  })

  const accent = document.createElement('div')
  important(accent, {
    height: '3px',
    background: 'linear-gradient(90deg, #ff93ab, #ff9c7f)',
  })

  const body = document.createElement('div')
  important(body, { padding: '12px 14px 10px' })

  const meta = document.createElement('div')
  important(meta, {
    display: 'flex',
    'align-items': 'center',
    gap: '8px',
    'margin-bottom': '8px',
  })
  const kind = document.createElement('span')
  kind.dataset.p2d = 'p2d-kind'
  important(kind, {
    'flex-shrink': '0',
    'border-radius': '999px',
    background: '#ff93ab',
    padding: '2px 8px',
    color: '#ffffff',
    'font-weight': '700',
    'font-size': '10px',
    'letter-spacing': '0.02em',
  })
  const size = document.createElement('span')
  size.dataset.p2d = 'p2d-size'
  important(size, {
    'margin-left': 'auto',
    'flex-shrink': '0',
    'border-radius': '6px',
    background: '#0a0a0a',
    padding: '3px 8px',
    color: '#ffffff',
    'font-weight': '650',
    'font-size': '11px',
    'font-variant-numeric': 'tabular-nums',
    'letter-spacing': '0.02em',
  })
  meta.append(kind, size)

  const label = document.createElement('div')
  label.dataset.p2d = 'p2d-label'
  important(label, {
    'margin-bottom': '10px',
    color: '#0a0a0a',
    'font-weight': '700',
    'font-size': '13px',
    'line-height': '1.35',
    'word-break': 'break-word',
    'overflow-wrap': 'anywhere',
    'white-space': 'normal',
  })

  const colorRow = propRow()
  colorRow.append(swatch('text-swatch'), valueText('p2d-text-hex'), keyLabel('Text color'))

  const bgRow = propRow()
  bgRow.append(swatch('bg-swatch'), valueText('p2d-bg-hex'), keyLabel('Background'))

  const fontRow = propRow()
  fontRow.append(valueText('p2d-font'), keyLabel('Font family'))

  const sizeRow = propRow(true)
  sizeRow.append(valueText('p2d-font-size'), keyLabel('Font size'))

  body.append(meta, label, colorRow, bgRow, fontRow, sizeRow)
  cardHost.append(accent, body)
  document.documentElement.appendChild(cardHost)
  return cardHost
}

function propRow(last = false): HTMLDivElement {
  const el = document.createElement('div')
  important(el, {
    display: 'flex',
    'align-items': 'center',
    gap: '8px',
    padding: '8px 0',
    'border-bottom': last ? '0' : '1px solid #edf0f3',
  })
  return el
}

function valueText(key: string): HTMLSpanElement {
  const el = document.createElement('span')
  el.dataset.p2d = key
  important(el, {
    flex: '1',
    'min-width': '0',
    color: '#0a0a0a',
    'font-weight': '650',
    'font-size': '12px',
    'word-break': 'break-word',
    'overflow-wrap': 'anywhere',
    'white-space': 'normal',
  })
  return el
}

function keyLabel(label: string): HTMLSpanElement {
  const el = document.createElement('span')
  el.textContent = label
  important(el, {
    'flex-shrink': '0',
    color: '#2e2a42',
    'font-size': '11px',
  })
  return el
}

function swatch(key: string): HTMLSpanElement {
  const el = document.createElement('span')
  el.dataset.p2d = key
  important(el, {
    'flex-shrink': '0',
    width: '16px',
    height: '16px',
    border: '1px solid rgb(10 10 10 / 0.12)',
    'border-radius': '4px',
    background: '#ffffff',
    'box-shadow': 'inset 0 0 0 1px rgb(255 255 255 / 0.4)',
  })
  return el
}

function primaryFont(stack: string): string {
  return stack.split(',')[0]?.replace(/['"]/g, '').trim() || stack
}

function formatPx(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value)
}
