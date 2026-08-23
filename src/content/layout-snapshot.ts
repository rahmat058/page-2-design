import type { LayoutSnapshot, ViewportSectionSnapshot } from '../shared/types';

export function captureLayoutSnapshot(label: string): LayoutSnapshot {
  const matching = readMatchingMedia();
  const sections = snapshotSections();
  return {
    name: label,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    documentWidth: document.documentElement.scrollWidth,
    documentHeight: document.documentElement.scrollHeight,
    devicePixelRatio: window.devicePixelRatio || 1,
    captured: true,
    matchingMedia: matching,
    sections,
    notes: `Measured at ${window.innerWidth}×${window.innerHeight}.`,
  };
}

function readMatchingMedia(): string[] {
  const matches: string[] = [];
  try {
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule instanceof CSSMediaRule && window.matchMedia(rule.conditionText).matches) {
            matches.push(rule.conditionText);
          }
        }
      } catch {
        /* cross-origin sheet */
      }
    }
  } catch {
    /* ignore */
  }
  return [...new Set(matches)].slice(0, 40);
}

function snapshotSections(): ViewportSectionSnapshot[] {
  const roots = document.querySelectorAll('header, nav, main, footer, aside, section, article');
  return [...roots].slice(0, 40).map((el, index) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return {
      id: el.id || `${el.tagName.toLowerCase()}-${index + 1}`,
      name: el.getAttribute('aria-label') || el.id || el.tagName.toLowerCase(),
      bounds: {
        x: Math.round(rect.left + window.scrollX),
        y: Math.round(rect.top + window.scrollY),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      layoutMode: style.display || 'block',
      containerWidth: Math.round(rect.width) || null,
    };
  });
}
