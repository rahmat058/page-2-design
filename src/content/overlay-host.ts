const HOST_ID = 'page2design-overlay-root';
const PANEL_WIDTH = 336;
const MARGIN = 12;

export function isOverlayHost(node: EventTarget | null): boolean {
  return node instanceof Node && Boolean((node as Element).closest?.(`#${HOST_ID}`));
}

export function overlayIsOpen(): boolean {
  return Boolean(document.getElementById(HOST_ID));
}

export function closeOverlay(): void {
  document.getElementById(HOST_ID)?.remove();
}

export function toggleOverlay(): void {
  if (window !== window.top) return;
  if (overlayIsOpen()) {
    closeOverlay();
    return;
  }
  mountOverlay();
}

function mountOverlay(): void {
  const host = document.createElement('div');
  host.id = HOST_ID;
  host.setAttribute('data-page2design', 'overlay');
  Object.assign(host.style, {
    all: 'initial',
    position: 'fixed',
    top: `${MARGIN}px`,
    right: `${MARGIN}px`,
    width: `${PANEL_WIDTH}px`,
    height: `min(560px, calc(100vh - ${MARGIN * 2}px))`,
    zIndex: '2147483646',
    pointerEvents: 'auto',
  } as CSSStyleDeclaration);

  const shadow = host.attachShadow({ mode: 'closed' });
  const wrap = document.createElement('div');
  wrap.setAttribute('part', 'panel');
  wrap.style.cssText = [
    'position:absolute',
    'inset:0',
    'border-radius:16px',
    'overflow:hidden',
    'box-shadow:0 16px 48px rgba(16,18,27,0.22)',
    'background:#fff',
  ].join(';');

  const frame = document.createElement('iframe');
  frame.title = 'Page2Design';
  frame.src = chrome.runtime.getURL('sidepanel.html');
  frame.allow = 'clipboard-write';
  frame.style.cssText = 'display:block;width:100%;height:100%;border:0;background:#fff;';
  wrap.appendChild(frame);
  shadow.appendChild(wrap);

  const onMessage = (event: MessageEvent) => {
    const data = event.data as { source?: string; type?: string; dx?: number; dy?: number };
    if (data?.source !== 'page2design') return;
    if (data.type === 'close') {
      window.removeEventListener('message', onMessage);
      closeOverlay();
      return;
    }
    if (data.type === 'move') {
      moveHost(host, Number(data.dx) || 0, Number(data.dy) || 0);
    }
  };
  window.addEventListener('message', onMessage);

  document.documentElement.appendChild(host);
}

function moveHost(host: HTMLElement, dx: number, dy: number): void {
  const rect = host.getBoundingClientRect();
  let left = rect.left + dx;
  let top = rect.top + dy;
  const maxLeft = Math.max(MARGIN, window.innerWidth - PANEL_WIDTH - MARGIN);
  const maxTop = Math.max(MARGIN, window.innerHeight - 120);
  left = Math.min(Math.max(MARGIN, left), maxLeft);
  top = Math.min(Math.max(MARGIN, top), maxTop);
  host.style.right = 'auto';
  host.style.left = `${left}px`;
  host.style.top = `${top}px`;
}
