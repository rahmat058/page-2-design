const HOST_ID = 'page2design-overlay-root'
const PANEL_WIDTH = 336
const MARGIN = 12

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
    height: `min(680px, calc(100vh - ${MARGIN * 2}px))`,
    zIndex: '2147483646',
    pointerEvents: 'auto',
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
    }
    if (data?.source !== 'page2design') return
    if (data.type === 'close') {
      window.removeEventListener('message', onMessage)
      closeOverlay()
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
      host.style.willChange = 'auto'
      drag = null
    }
  }
  window.addEventListener('message', onMessage)

  document.documentElement.appendChild(host)
}

function placeHost(host: HTMLElement, nextLeft: number, nextTop: number): void {
  const maxLeft = Math.max(MARGIN, window.innerWidth - PANEL_WIDTH - MARGIN)
  const maxTop = Math.max(MARGIN, window.innerHeight - 120)
  const left = Math.min(Math.max(MARGIN, nextLeft), maxLeft)
  const top = Math.min(Math.max(MARGIN, nextTop), maxTop)
  host.style.right = 'auto'
  host.style.left = `${Math.round(left)}px`
  host.style.top = `${Math.round(top)}px`
}
