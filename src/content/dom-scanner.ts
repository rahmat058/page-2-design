import { SAFE_ATTRIBUTES, SKIP_TAGS } from '../shared/constants';
import { isSensitiveInput } from '../shared/redact';
import type { AssetRecord, ScannedElement } from '../shared/types';
import { collectAssetsFromElement } from './asset-scanner';
import { captureCanvasAsset } from './canvas-capture';
import { collectContentFromElement } from './content-scanner';
import { collectInteractions } from './layout-scanner';
import { idFor, type ScanRuntime } from './scan-context';
import { isCustomElement, openShadowRoot } from './shadow';
import { documentBounds, isVisible, pickComputedStyle, styleSignature } from './style-utils';
import type { ContentBlock, InteractionRecord } from '../shared/types';

export interface DomScanResult {
  elements: ScannedElement[];
  styleRegistry: Record<string, Record<string, string>>;
  assets: Map<string, AssetRecord>;
  content: ContentBlock[];
  interactions: InteractionRecord[];
  idMap: WeakMap<Element, string>;
}

export function scanDom(runtime: ScanRuntime, root: Element): DomScanResult {
  const elements: ScannedElement[] = [];
  const styleRegistry: Record<string, Record<string, string>> = {};
  const assets = new Map<string, AssetRecord>();
  const content: ContentBlock[] = [];
  const interactions: InteractionRecord[] = [];
  const assigned = new WeakMap<Element, string>();

  const walk = (el: Element, parentId: string | null, childIndex: number) => {
    if (runtime.cancelled) return;
    if (SKIP_TAGS.has(el.tagName)) return;
    if (el.id?.startsWith('page2design-')) return;

    const shadowRoot = openShadowRoot(el);
    if (!shadowRoot && isCustomElement(el) && !el.shadowRoot) {
      runtime.addLimitation(
        'SHADOW_DOM',
        `Could not open a shadow root on <${el.tagName.toLowerCase()}>.`,
        'warning',
      );
    }

    const computed = getComputedStyle(el);
    const visibility = isVisible(el, computed);
    const includeHidden = runtime.options.includeHiddenStructural;
    if (!visibility.visible) {
      if (computed.display === 'none' && !(includeHidden && isStructural(el))) {
        return;
      }
      if (!includeHidden && !isStructural(el) && visibility.reason !== 'visibility:hidden') {
        let indexHidden = 0;
        for (const child of el.children) {
          walk(child, parentId, indexHidden);
          indexHidden += 1;
        }
        return;
      }
    }

    const id = idFor(runtime);
    assigned.set(el, id);
    const picked = pickComputedStyle(computed);
    const signature = styleSignature(picked);
    styleRegistry[signature] = picked;

    const attrs = safeAttributes(el);
    const elementAssets = collectAssetsFromElement(el, id, computed);
    for (const asset of elementAssets) {
      const existing = assets.get(asset.id);
      if (existing) {
        existing.elementIds.push(id);
      } else {
        assets.set(asset.id, asset);
      }
    }

    const blocks = collectContentFromElement(el, id, runtime, content.length);
    content.push(...blocks);
    interactions.push(...collectInteractions(el, id));

    if (el instanceof HTMLCanvasElement) {
      const canvasAsset = captureCanvasAsset(el, id);
      if (canvasAsset) {
        const existing = assets.get(canvasAsset.id);
        if (existing) existing.elementIds.push(id);
        else assets.set(canvasAsset.id, canvasAsset);
        elementAssets.push(canvasAsset);
      } else {
        runtime.addLimitation(
          'CANVAS',
          `Canvas pixels on ${id} could not be read (likely tainted or empty).`,
          'warning',
        );
      }
    }

    elements.push({
      id,
      parentId,
      childIndex,
      tagName: el.tagName.toLowerCase(),
      attributes: attrs,
      elementId: el.id || null,
      classNames: [...el.classList],
      role: el.getAttribute('role'),
      visibility,
      bounds: documentBounds(el),
      styleSignature: signature,
      directText: directText(el),
      sectionId: null,
      assetIds: elementAssets.map((a) => a.id),
    });

    let index = 0;
    for (const child of el.children) {
      walk(child, id, index);
      index += 1;
    }

    if (shadowRoot) {
      for (const child of shadowRoot.children) {
        walk(child, id, index);
        index += 1;
      }
    }

    if (el instanceof HTMLIFrameElement) {
      try {
        const doc = el.contentDocument;
        if (doc?.documentElement) {
          walk(doc.documentElement, id, index);
        } else {
          runtime.addLimitation(
            'CROSS_ORIGIN_IFRAME',
            `Iframe ${el.src || el.id || id} will be scanned from its own frame when host access allows.`,
            'info',
          );
        }
      } catch {
        runtime.addLimitation(
          'CROSS_ORIGIN_IFRAME',
          `Iframe ${el.src || el.id || id} is cross-origin in this document.`,
          'info',
        );
      }
    }
  };

  walk(root, null, 0);
  return { elements, styleRegistry, assets, content, interactions, idMap: assigned };
}

function isStructural(el: Element): boolean {
  return /^(HEADER|NAV|MAIN|FOOTER|ASIDE|SECTION|ARTICLE)$/.test(el.tagName);
}

function safeAttributes(el: Element): Record<string, string> {
  const out: Record<string, string> = {};
  if (isSensitiveInput(el)) {
    return out;
  }
  for (const attr of el.attributes) {
    const name = attr.name.toLowerCase();
    if (name === 'value' || name === 'checked') continue;
    if (name.startsWith('on')) continue;
    if (name === 'style') continue;
    if (!SAFE_ATTRIBUTES.has(name) && !name.startsWith('aria-') && !name.startsWith('data-src')) {
      continue;
    }
    out[name] = attr.value.slice(0, 500);
  }
  return out;
}

function directText(el: Element): string {
  let text = '';
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? '';
    }
  }
  return text.replace(/\s+/g, ' ').trim().slice(0, 400);
}
