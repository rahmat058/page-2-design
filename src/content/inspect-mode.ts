import { colorIsExact, isFullyTransparent, parseColor } from '../normalize/colors'
import { createMessage, createRequestId, type InspectedElement } from '../shared/messages'

const BOX_ID = 'page2design-inspect-box'
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

export function isInspectEnabled(): boolean {
  return enabled
}

export function setInspectMode(next: boolean): void {
  enabled = next
  if (!enabled) {
    window.removeEventListener('mousemove', onMove, true)
    window.removeEventListener('click', onClick, true)
    box?.remove()
    box = null
    clearColorHit()
    activeKey = null
    hitIndex = -1
    pendingEl = null
    lastEl = null
    lockedEl = null
    if (inspectRaf) {
      cancelAnimationFrame(inspectRaf)
      inspectRaf = 0
    }
    return
  }
  ensureBox()
  window.addEventListener('mousemove', onMove, true)
  window.addEventListener('click', onClick, true)
}

export function setInspectContextMenu(next: boolean): void {
  allowContextMenu = next
}

function ensureBox(): HTMLDivElement {
  if (box?.isConnected) return box
  box = document.createElement('div')
  box.id = BOX_ID
  Object.assign(box.style, {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: '2147483645',
    border: '2px solid #7c5cfc',
    background: 'rgba(124, 92, 252, 0.12)',
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
    return
  }
  const rect = target.getBoundingClientRect()
  const highlight = ensureBox()
  highlight.style.display = 'block'
  highlight.style.left = `${rect.left}px`
  highlight.style.top = `${rect.top}px`
  highlight.style.width = `${rect.width}px`
  highlight.style.height = `${rect.height}px`
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
    .slice(0, 2)
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
  return Boolean(el.closest?.('#page2design-overlay-root') || el.id === 'page2design-overlay-root')
}
