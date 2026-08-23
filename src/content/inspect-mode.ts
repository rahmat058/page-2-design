const BOX_ID = 'page2design-inspect-box';

let enabled = false;
let box: HTMLDivElement | null = null;

export function isInspectEnabled(): boolean {
  return enabled;
}

export function setInspectMode(next: boolean): void {
  enabled = next;
  if (!enabled) {
    window.removeEventListener('mousemove', onMove, true);
    window.removeEventListener('click', onClick, true);
    box?.remove();
    box = null;
    return;
  }
  ensureBox();
  window.addEventListener('mousemove', onMove, true);
  window.addEventListener('click', onClick, true);
}

function ensureBox(): HTMLDivElement {
  if (box?.isConnected) return box;
  box = document.createElement('div');
  box.id = BOX_ID;
  Object.assign(box.style, {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: '2147483645',
    border: '2px solid #7c5cfc',
    background: 'rgba(124, 92, 252, 0.12)',
    borderRadius: '4px',
    display: 'none',
  } as CSSStyleDeclaration);
  document.documentElement.appendChild(box);
  return box;
}

function onMove(event: MouseEvent): void {
  if (!enabled) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.id === 'page2design-overlay-root' || target.closest?.('#page2design-overlay-root')) {
    if (box) box.style.display = 'none';
    return;
  }
  const rect = target.getBoundingClientRect();
  const highlight = ensureBox();
  highlight.style.display = 'block';
  highlight.style.left = `${rect.left}px`;
  highlight.style.top = `${rect.top}px`;
  highlight.style.width = `${rect.width}px`;
  highlight.style.height = `${rect.height}px`;
}

function onClick(event: MouseEvent): void {
  if (!enabled) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.id === 'page2design-overlay-root' || target.closest?.('#page2design-overlay-root')) return;
  event.preventDefault();
  event.stopPropagation();
}
