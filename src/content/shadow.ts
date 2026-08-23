export function openShadowRoot(el: Element): ShadowRoot | null {
  try {
    const pierce = chrome.dom?.openOrClosedShadowRoot;
    if (typeof pierce === 'function' && el instanceof HTMLElement) {
      return pierce(el) ?? el.shadowRoot;
    }
  } catch {
    /* API unavailable or the host has no shadow root */
  }
  return el.shadowRoot;
}

export function isCustomElement(el: Element): boolean {
  return el.tagName.includes('-') || Boolean(el.getAttribute('is'));
}
