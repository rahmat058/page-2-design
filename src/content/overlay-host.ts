/**
 * Mounts the floating side-panel iframe overlay in the page and positions /
 * resizes the host around the viewport margin.
 */
import { OVERLAY_WIDTH } from '../shared/constants'

const HOST_ID = 'page2design-overlay-root'
const PANEL_WIDTH = OVERLAY_WIDTH
const MARGIN = 12
const SIZE_TRANSITION = 'width 0.38s cubic-bezier(0.22, 1, 0.36, 1), left 0.38s cubic-bezier(0.22, 1, 0.36, 1)'

export function isOverlayHost(node: EventTarget | null): boolean {
  return node instanceof Node && Boolean((node as Element).closest?.(`#${HOST_ID}`))
}

export function overlayIsOpen(): boolean {
  return Boolean(document.getElementById(HOST_ID))
}

export function closeOverlay(): void {
  document.getElementById(HOST_ID)?.remove()
}

export function toggleOverlay(): void {
  if (window !== window.top) return
  if (overlayIsOpen()) {
    closeOverlay()
    return
  }
  mountOverlay()
}

function mountOverlay(): void {
  const host = document.createElement('div')
  host.id = HOST_ID
  host.setAttribute('data-page2design', 'overlay')
  Object.assign(host.style, {
    all: 'initial',
    position: 'fixed',
    top: `${MARGIN}px`,
    right: `${MARGIN}px`,
    width: `${PANEL_WIDTH}px`,
    height: `calc(100vh - ${MARGIN * 2}px)`,
    maxHeight: '680px',
    zIndex: '2147483646',
    pointerEvents: 'auto',
    transition: SIZE_TRANSITION,
    boxSizing: 'border-box',
  } as CSSStyleDeclaration)

  const shadow = host.attachShadow({ mode: 'closed' })
  const wrap = document.createElement('div')
  wrap.setAttribute('part', 'panel')
  wrap.style.cssText = [
    'position:absolute',
    'inset:0',
    'border-radius:16px',
    'overflow:hidden',
    'box-shadow:0 16px 48px rgba(16,18,27,0.22)',
    'background:#fff',
  ].join(';')

  const frame = document.createElement('iframe')
  frame.title = 'Page2Design'
  frame.src = chrome.runtime.getURL('sidepanel.html')
  frame.allow = 'clipboard-write'
  frame.style.cssText = 'display:block;width:100%;height:100%;border:0;background:#fff;'
  wrap.appendChild(frame)
  shadow.appendChild(wrap)

  let drag: { left: number; top: number; screenX: number; screenY: number } | null = null

  const onMessage = (event: MessageEvent) => {
    const data = event.data as {
      source?: string
      type?: string
      screenX?: number
      screenY?: number
      width?: number
    }
    if (data?.source !== 'page2design') return
    if (data.type === 'close') {
      window.removeEventListener('message', onMessage)
      closeOverlay()
      return
    }
    if (data.type === 'resize') {
      resizeHost(host, Number(data.width) || PANEL_WIDTH)
      return
    }
    if (data.type === 'dragstart') {
      const rect = host.getBoundingClientRect()
      drag = {
        left: rect.left,
        top: rect.top,
        screenX: Number(data.screenX) || 0,
        screenY: Number(data.screenY) || 0,
      }
      host.style.transition = 'none'
      host.style.willChange = 'left, top'
      return
    }
    if (data.type === 'move' && drag) {
      const left = drag.left + ((Number(data.screenX) || 0) - drag.screenX)
      const top = drag.top + ((Number(data.screenY) || 0) - drag.screenY)
      placeHost(host, left, top)
      return
    }
    if (data.type === 'dragend') {
      host.style.transition = SIZE_TRANSITION
      host.style.willChange = 'auto'
      drag = null
    }
  }
  window.addEventListener('message', onMessage)

  document.documentElement.appendChild(host)
}

function resizeHost(host: HTMLElement, nextWidth: number): void {
  const width = Math.min(Math.max(nextWidth, PANEL_WIDTH), Math.max(PANEL_WIDTH, window.innerWidth - MARGIN * 2))
  const prev = host.getBoundingClientRect()
  host.style.width = `${Math.round(width)}px`
  if (host.style.left && host.style.left !== 'auto') {
    const delta = width - prev.width
    const left = Number.parseFloat(host.style.left) - delta
    const maxLeft = Math.max(MARGIN, window.innerWidth - width - MARGIN)
    host.style.left = `${Math.round(Math.min(Math.max(MARGIN, left), maxLeft))}px`
  }
}

function placeHost(host: HTMLElement, nextLeft: number, nextTop: number): void {
  const width = host.getBoundingClientRect().width || PANEL_WIDTH
  const maxLeft = Math.max(MARGIN, window.innerWidth - width - MARGIN)
  const maxTop = Math.max(MARGIN, window.innerHeight - 120)
  const left = Math.min(Math.max(MARGIN, nextLeft), maxLeft)
  const top = Math.min(Math.max(MARGIN, nextTop), maxTop)
  host.style.right = 'auto'
  host.style.left = `${Math.round(left)}px`
  host.style.top = `${Math.round(top)}px`
}
