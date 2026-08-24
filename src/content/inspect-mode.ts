import { colorIsExact } from '../normalize/colors';

const BOX_ID = 'page2design-inspect-box';
const HIT_ID = 'page2design-color-hit';

let enabled = false;
let box: HTMLDivElement | null = null;
let activeKey: string | null = null;
let hitIndex = -1;

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
    clearColorHit();
    activeKey = null;
    hitIndex = -1;
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
  if (isOverlay(target)) {
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
  if (isOverlay(target)) return;
  event.preventDefault();
  event.stopPropagation();
}

export function highlightColorOnPage(payload: {
  hex?: string | null;
  css?: string | null;
  typography?: {
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    lineHeight: string;
  } | null;
}): { index: number; total: number; done: boolean } {
  const key = payload.typography
    ? `type:${payload.typography.fontFamily}|${payload.typography.fontSize}|${payload.typography.fontWeight}|${payload.typography.lineHeight}`
    : (payload.css || payload.hex || '').replace(/\s+/g, ' ').trim();
  if (!key) {
    clearColorHit();
    activeKey = null;
    hitIndex = -1;
    return { index: 0, total: 0, done: true };
  }

  const hits = payload.typography
    ? collectTypeHits(payload.typography)
    : collectExactHits(payload);
  if (hits.length === 0) {
    clearColorHit();
    activeKey = null;
    hitIndex = -1;
    return { index: 0, total: 0, done: true };
  }

  if (activeKey !== key) {
    activeKey = key;
    hitIndex = 0;
  } else {
    hitIndex += 1;
    if (hitIndex >= hits.length) {
      clearColorHit();
      activeKey = null;
      hitIndex = -1;
      return { index: 0, total: hits.length, done: true };
    }
  }

  paintHit(hits[hitIndex] as Element);
  return { index: hitIndex, total: hits.length, done: false };
}

function collectTypeHits(token: {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
}): Element[] {
  const hits: Element[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode() && hits.length < 200) {
    const el = walker.currentNode as Element;
    if (el.id?.startsWith('page2design-')) continue;
    if (isOverlay(el)) continue;
    if (!el.textContent?.trim()) continue;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
    if (!typeMatches(style, token)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 && rect.height < 2) continue;
    hits.push(el);
  }
  return hits;
}

function typeMatches(
  style: CSSStyleDeclaration,
  token: { fontFamily: string; fontSize: string; fontWeight: string; lineHeight: string },
): boolean {
  if (normalizeFamily(style.fontFamily) !== normalizeFamily(token.fontFamily)) return false;
  if (normalizePx(style.fontSize) !== normalizePx(token.fontSize)) return false;
  if (normalizeWeight(style.fontWeight) !== normalizeWeight(token.fontWeight)) return false;
  if (normalizePx(style.lineHeight) !== normalizePx(token.lineHeight)) return false;
  return true;
}

function normalizeFamily(stack: string): string {
  return stack.split(',')[0]?.replace(/['"]/g, '').trim().toLowerCase() || stack.toLowerCase();
}

function normalizePx(value: string): string {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return value.trim().toLowerCase();
  return `${Math.round(n * 10) / 10}`;
}

function normalizeWeight(value: string): string {
  if (value === 'normal') return '400';
  if (value === 'bold') return '700';
  return value.trim();
}

function collectExactHits(payload: { hex?: string | null; css?: string | null }): Element[] {
  const gradient =
    payload.css && /gradient\(/i.test(payload.css) ? payload.css.replace(/\s+/g, ' ').trim() : null;
  const hits: Element[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode() && hits.length < 200) {
    const el = walker.currentNode as Element;
    if (el.id?.startsWith('page2design-')) continue;
    if (isOverlay(el)) continue;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
    const match = gradient
      ? style.backgroundImage.replace(/\s+/g, ' ').trim() === gradient
      : Boolean(
          payload.hex &&
            [style.color, style.backgroundColor, style.borderTopColor, style.fill, style.stroke].some(
              (value) => colorIsExact(value, payload.hex as string),
            ),
        );
    if (!match) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 && rect.height < 2) continue;
    hits.push(el);
  }
  return hits;
}

function paintHit(el: Element): void {
  el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  window.requestAnimationFrame(() => {
    const rect = el.getBoundingClientRect();
    clearColorHit();
    const mark = document.createElement('div');
    mark.id = HIT_ID;
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
    } as CSSStyleDeclaration);
    document.documentElement.appendChild(mark);
  });
}

function clearColorHit(): void {
  document.getElementById(HIT_ID)?.remove();
  document.getElementById('page2design-color-hits')?.remove();
}

function isOverlay(el: Element): boolean {
  return Boolean(el.closest?.('#page2design-overlay-root') || el.id === 'page2design-overlay-root');
}
