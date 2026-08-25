/**
 * Depth-first DOM walker that builds ScannedElement records, style signatures,
 * content blocks, interactions, and per-element assets within the scan budget.
 */
import { SAFE_ATTRIBUTES, SKIP_TAGS, MAX_ELEMENTS, DOM_SCAN_YIELD_EVERY } from '../shared/constants'
import { isSensitiveInput } from '../shared/redact'
import type { AssetRecord, ContentBlock, InteractionRecord, ScannedElement } from '../shared/types'
import { collectAssetsFromElement } from './asset-scanner'
import { captureCanvasAsset } from './canvas-capture'
import { collectContentFromElement } from './content-scanner'
import { collectInteractions } from './layout-scanner'
import { idFor, yieldToMain, type ScanRuntime } from './scan-context'
import {
  classNamesOf,
  isDecorativeSvg,
  isIgnoredHost,
  isMarqueeClone,
  isOpaqueEmbedTag,
  isStructuralTag,
  isSwiperClone,
  marqueeKindIndex,
  skipHiddenSubtree,
  skipShadowWalk,
} from './scan-filters'
import { openShadowRoot } from './shadow'
import { pickComputedStyle, styleSignature, visibilityAndBounds } from './style-utils'
import { captureVideoFrameAsset } from './video-capture'

// ---------------------------------------------------------------------------
// DOM walk
// ---------------------------------------------------------------------------

export interface DomScanResult {
  elements: ScannedElement[]
  styleRegistry: Record<string, Record<string, string>>
  assets: Map<string, AssetRecord>
  content: ContentBlock[]
  interactions: InteractionRecord[]
  idMap: WeakMap<Element, string>
}

export async function scanDom(runtime: ScanRuntime, root: Element): Promise<DomScanResult> {
  const elements: ScannedElement[] = []
  const styleRegistry: Record<string, Record<string, string>> = {}
  const assets = new Map<string, AssetRecord>()
  const content: ContentBlock[] = []
  const interactions: InteractionRecord[] = []
  const assigned = new WeakMap<Element, string>()
  const swiperSeen = new WeakMap<Element, Set<string>>()
  const classIndexCache = new WeakMap<Element, Map<string, Map<Element, number>>>()
  let visited = 0
  let truncated = false

  const walk = async (el: Element, parentId: string | null, childIndex: number) => {
    if (runtime.cancelled || truncated) return
    if (elements.length >= MAX_ELEMENTS) {
      truncated = true
      runtime.addLimitation('MAX_ELEMENTS', `Scan truncated after ${MAX_ELEMENTS} elements.`)
      return
    }
    if (SKIP_TAGS.has(el.tagName)) return
    if (
      isIgnoredHost({
        id: el.id,
        tagName: el.tagName,
        attributes: { 'data-react-aria-top-layer': el.getAttribute('data-react-aria-top-layer') },
      })
    ) {
      return
    }

    visited += 1
    if (visited % DOM_SCAN_YIELD_EVERY === 0) {
      await yieldToMain()
      if (runtime.cancelled) return
    }

    const computed = getComputedStyle(el)
    const { visibility, bounds } = visibilityAndBounds(el, computed)
    const includeHidden = runtime.options.includeHiddenStructural
    if (skipHiddenSubtree(visibility.visible, includeHidden, isStructuralTag(el.tagName))) {
      return
    }

    const id = idFor(runtime)
    assigned.set(el, id)
    const picked = pickComputedStyle(computed)
    const signature = styleSignature(picked)
    styleRegistry[signature] = picked

    const attrs = safeAttributes(el)
    peekCalEmbedSrc(el, attrs)
    const elementAssets = collectAssetsFromElement(el, id, computed)
    for (const asset of elementAssets) {
      const existing = assets.get(asset.id)
      if (existing) {
        existing.elementIds.push(id)
      } else {
        assets.set(asset.id, asset)
      }
    }

    const blocks = collectContentFromElement(el, id, runtime, content.length)
    content.push(...blocks)
    interactions.push(...collectInteractions(el, id))

    if (el instanceof HTMLCanvasElement) {
      const canvasAsset = captureCanvasAsset(el, id)
      if (canvasAsset) {
        const existing = assets.get(canvasAsset.id)
        if (existing) existing.elementIds.push(id)
        else assets.set(canvasAsset.id, canvasAsset)
        elementAssets.push(canvasAsset)
      } else {
        runtime.addLimitation(
          'CANVAS',
          `Canvas pixels on ${id} could not be read (likely tainted or empty).`,
          'warning',
        )
      }
    }

    if (el instanceof HTMLVideoElement && elementAssets.length === 0) {
      const frameAsset = captureVideoFrameAsset(el, id)
      if (frameAsset) {
        const existing = assets.get(frameAsset.id)
        if (existing) existing.elementIds.push(id)
        else assets.set(frameAsset.id, frameAsset)
        elementAssets.push(frameAsset)
      } else {
        runtime.addLimitation(
          'VIDEO',
          `<video> on ${id} has no poster and its frame could not be read. Rebuild it as a sized placeholder.`,
          'warning',
        )
      }
    }

    elements.push({
      id,
      parentId,
      childIndex,
      tagName: el.tagName.toLowerCase(),
      attributes: attrs,
      elementId: el.id || null,
      classNames: classNamesOf(el),
      role: el.getAttribute('role'),
      visibility,
      bounds,
      styleSignature: signature,
      directText: directText(el),
      sectionId: null,
      assetIds: elementAssets.map((a) => a.id),
    })

    const opaque = isOpaqueEmbedTag(el.tagName)
    const particleSvg = isDecorativeSvg(el.tagName, el.querySelectorAll('circle').length)
    if (opaque || particleSvg) return

    let index = 0
    for (const child of el.children) {
      if (runtime.cancelled || truncated) return
      if (shouldSkipChild(el, child, swiperSeen, classIndexCache)) continue
      await walk(child, id, index)
      index += 1
    }

    if (!skipShadowWalk(el.tagName)) {
      const shadowRoot = openShadowRoot(el)
      if (shadowRoot) {
        for (const child of shadowRoot.children) {
          if (runtime.cancelled || truncated) return
          await walk(child, id, index)
          index += 1
        }
      }
    }
  }

  await walk(root, null, 0)
  return { elements, styleRegistry, assets, content, interactions, idMap: assigned }
}

// ---------------------------------------------------------------------------
// Walk helpers / filters
// ---------------------------------------------------------------------------

function shouldSkipChild(
  parent: Element,
  child: Element,
  swiperSeen: WeakMap<Element, Set<string>>,
  classIndexCache: WeakMap<Element, Map<string, Map<Element, number>>>,
): boolean {
  const parentClasses = classNamesOf(parent)
  const childClasses = classNamesOf(child)
  const kindIndex = marqueeKindIndex(parentClasses, childClasses, {
    marquee: indexAmongClassCached(parent, child, 'rfm-marquee', classIndexCache),
    child: indexAmongClassCached(parent, child, 'rfm-child', classIndexCache),
  })
  if (isMarqueeClone(parentClasses, childClasses, kindIndex)) return true

  if (parentClasses.includes('swiper-wrapper') && childClasses.includes('swiper-slide')) {
    let seen = swiperSeen.get(parent)
    if (!seen) {
      seen = new Set()
      swiperSeen.set(parent, seen)
    }
    return isSwiperClone(seen, child.getAttribute('data-swiper-slide-index'))
  }
  return false
}

/** Build class→index maps once per parent instead of O(n) filter per child. */
function indexAmongClassCached(
  parent: Element,
  child: Element,
  token: string,
  cache: WeakMap<Element, Map<string, Map<Element, number>>>,
): number {
  let byToken = cache.get(parent)
  if (!byToken) {
    byToken = new Map()
    cache.set(parent, byToken)
  }
  let indexes = byToken.get(token)
  if (!indexes) {
    indexes = new Map()
    let i = 0
    for (const node of parent.children) {
      if (classNamesOf(node).includes(token)) {
        indexes.set(node, i)
        i += 1
      }
    }
    byToken.set(token, indexes)
  }
  return indexes.get(child) ?? -1
}

/** Copy the inner calendar iframe URL onto the host so the placeholder can label it. */
function peekCalEmbedSrc(el: Element, attrs: Record<string, string>): void {
  if (el.tagName.toLowerCase() !== 'cal-inline' || attrs.src) return
  const src = el.querySelector('iframe')?.getAttribute('src')
  if (src) attrs.src = src.slice(0, 500)
}

function safeAttributes(el: Element): Record<string, string> {
  const out: Record<string, string> = {}
  if (isSensitiveInput(el)) {
    return out
  }
  for (const attr of el.attributes) {
    const name = attr.name.toLowerCase()
    if (name === 'value' || name === 'checked') continue
    if (name.startsWith('on')) continue
    if (name === 'style') continue
    if (!SAFE_ATTRIBUTES.has(name) && !name.startsWith('aria-') && !name.startsWith('data-src')) {
      continue
    }
    out[name] = attr.value.slice(0, 500)
  }
  return out
}

function directText(el: Element): string {
  let text = ''
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? ''
    }
  }
  return text.replace(/\s+/g, ' ').trim().slice(0, 400)
}
