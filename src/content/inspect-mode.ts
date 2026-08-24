import { colorLooksLike } from '../normalize/colors';

const BOX_ID = 'page2design-inspect-box';
const HITS_ID = 'page2design-color-hits';

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
    clearColorHits();
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

export function highlightColorOnPage(hex: string | null): void {
  clearColorHits();
  if (!hex) return;
  const layer = document.createElement('div');
  layer.id = HITS_ID;
  Object.assign(layer.style, {
    position: 'fixed',
    inset: '0',
    pointerEvents: 'none',
    zIndex: '2147483644',
  } as CSSStyleDeclaration);
  document.documentElement.appendChild(layer);

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  let marked = 0;
  while (walker.nextNode() && marked < 80) {
    const el = walker.currentNode as Element;
    if (el.id?.startsWith('page2design-')) continue;
    if (el.closest?.('#page2design-overlay-root')) continue;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
    const hits = [
      style.color,
      style.backgroundColor,
      style.borderTopColor,
      style.fill,
      style.stroke,
    ];
    if (!hits.some((value) => colorLooksLike(value, hex))) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    const mark = document.createElement('div');
    Object.assign(mark.style, {
      position: 'fixed',
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      border: '2px solid #7c5cfc',
      background: 'rgba(124, 92, 252, 0.12)',
      borderRadius: '4px',
    } as CSSStyleDeclaration);
    layer.appendChild(mark);
    marked += 1;
  }
}

function clearColorHits(): void {
  document.getElementById(HITS_ID)?.remove();
}
