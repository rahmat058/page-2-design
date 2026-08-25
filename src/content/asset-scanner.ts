import { hashString } from '../shared/utils'
import type { AssetRecord, AssetType } from '../shared/types'
import { extractCssUrls } from './css-urls'
import { parseSrcset, pickBestSrcsetUrl } from './srcset'
import { sanitizeSvg } from './svg-sanitize'

export function collectAssetsFromElement(el: Element, elementId: string, computed: CSSStyleDeclaration): AssetRecord[] {
  const found: AssetRecord[] = []
  const tag = el.tagName.toLowerCase()

  if (tag === 'img') {
    const img = el as HTMLImageElement
    const extra = {
      intrinsicWidth: img.naturalWidth || null,
      intrinsicHeight: img.naturalHeight || null,
      renderedWidth: img.clientWidth || null,
      renderedHeight: img.clientHeight || null,
      alt: img.alt || el.getAttribute('alt'),
    }
    const urls = imageUrlsFromElement(el, img)
    for (const url of urls) found.push(makeAsset('image', url, elementId, extra))
  }

  if (tag === 'source') {
    const srcset = el.getAttribute('srcset')
    const urls = srcset ? parseSrcset(srcset).map((candidate) => candidate.url) : [el.getAttribute('src')]
    const best = srcset ? pickBestSrcsetUrl(srcset) : null
    for (const url of [best, ...urls]) {
      if (url) found.push(makeAsset('image', url, elementId, {}))
    }
  }

  if (tag === 'video') {
    const poster = (el as HTMLVideoElement).poster || el.getAttribute('poster')
    if (poster) found.push(makeAsset('video-poster', poster, elementId, {}))
  }

  if (tag === 'object') {
    const data = el.getAttribute('data')
    if (data) found.push(makeAsset(guessType(data, 'image'), data, elementId, {}))
  }

  if (tag === 'embed') {
    const src = el.getAttribute('src')
    if (src) found.push(makeAsset(guessType(src, 'image'), src, elementId, {}))
  }

  if (tag === 'input' && (el.getAttribute('type') ?? '').toLowerCase() === 'image') {
    const src = el.getAttribute('src')
    if (src) found.push(makeAsset('image', src, elementId, { alt: el.getAttribute('alt') }))
  }

  if (tag === 'image') {
    const href = el.getAttribute('href') || el.getAttribute('xlink:href')
    if (href && !href.startsWith('#')) found.push(makeAsset('image', href, elementId, {}))
  }

  if (tag === 'use') {
    const href = el.getAttribute('href') || el.getAttribute('xlink:href')
    if (href?.startsWith('#')) {
      const symbol = document.getElementById(href.slice(1))
      if (symbol) {
        const wrap = wrapSymbolAsSvg(symbol)
        if (wrap) found.push(inlineSvgAsset(wrap, elementId, el))
      }
    } else if (href) {
      found.push(makeAsset('icon', href, elementId, {}))
    }
  }

  if (tag === 'link') {
    const rel = (el.getAttribute('rel') ?? '').toLowerCase()
    const href = el.getAttribute('href')
    if (href && (rel.includes('icon') || rel.includes('apple-touch') || rel === 'mask-icon')) {
      found.push(makeAsset('favicon', href, elementId, {}))
    }
  }

  if (tag === 'svg') {
    const size = svgSize(el)
    const hiddenSprite = (size.width ?? 0) <= 2 && (size.height ?? 0) <= 2 && Boolean(el.querySelector('symbol'))
    if (!hiddenSprite) {
      const markup = serializeSvg(el)
      const id = `asset_${hashString(markup)}`
      found.push({
        id,
        type: 'svg',
        sourceUrl: `inline:${id}`,
        resolvedUrl: `inline:${id}`,
        localPath: `assets/svg/${id}.svg`,
        mimeType: 'image/svg+xml',
        intrinsicWidth: null,
        intrinsicHeight: null,
        renderedWidth: size.width,
        renderedHeight: size.height,
        elementIds: [elementId],
        sectionIds: [],
        downloadStatus: 'downloaded',
        failureReason: null,
        licenseReviewRequired: false,
        inlineSvg: markup,
        alt: el.getAttribute('aria-label') || el.querySelector('title')?.textContent || null,
      })
    }
  }

  for (const prop of [
    'background-image',
    'mask-image',
    '-webkit-mask-image',
    'list-style-image',
    'border-image-source',
    'content',
    'cursor',
  ]) {
    const type =
      prop.includes('mask') || prop === 'content' || prop === 'cursor'
        ? 'icon'
        : prop.includes('background')
          ? 'background'
          : 'other'
    for (const url of extractCssUrls(computed.getPropertyValue(prop) || '')) {
      found.push(makeAsset(guessType(url, type), url, elementId, {}))
    }
  }

  const lazy = el.getAttribute('data-src') || el.getAttribute('data-lazy-src')
  if (lazy && tag !== 'img') {
    found.push(makeAsset('image', lazy, elementId, {}))
  }

  return found
}

export function collectDocumentAssets(): AssetRecord[] {
  const extras: AssetRecord[] = []
  for (const meta of document.querySelectorAll(
    'meta[property="og:image"], meta[name="twitter:image"], meta[itemprop="image"]',
  )) {
    const content = meta.getAttribute('content')
    if (content) extras.push(makeAsset('image', content, 'document', {}))
  }
  for (const link of document.querySelectorAll(
    'link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"], link[rel="mask-icon"], link[rel="fluid-icon"]',
  )) {
    const href = link.getAttribute('href')
    if (href) extras.push(makeAsset('favicon', href, 'document', {}))
  }
  // DOM elements already contributed assets during scanDom — do not re-walk the tree with getComputedStyle.
  extras.push(...collectStylesheetAssets())
  return extras
}

function collectStylesheetAssets(): AssetRecord[] {
  const found: AssetRecord[] = []
  const props = [
    'background-image',
    'mask-image',
    '-webkit-mask-image',
    'list-style-image',
    'border-image-source',
    'content',
    'cursor',
  ]
  for (const sheet of document.styleSheets) {
    let rules: CSSRuleList
    try {
      rules = sheet.cssRules
    } catch {
      continue
    }
    for (const rule of rules) {
      if (!(rule instanceof CSSStyleRule)) continue
      for (const prop of props) {
        const type = prop.includes('mask') || prop === 'content' || prop === 'cursor' ? 'icon' : 'background'
        for (const url of extractCssUrls(rule.style.getPropertyValue(prop) || '')) {
          found.push(makeAsset(guessType(url, type), url, 'stylesheet', {}))
        }
      }
    }
  }
  return found
}

function wrapSymbolAsSvg(symbol: Element): string | null {
  const viewBox = symbol.getAttribute('viewBox') || '0 0 24 24'
  const inner = symbol.innerHTML
  if (!inner.trim()) return null
  return sanitizeSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${inner}</svg>`)
}

function inlineSvgAsset(markup: string, elementId: string, el: Element): AssetRecord {
  const id = `asset_${hashString(markup)}`
  return {
    id,
    type: 'svg',
    sourceUrl: `inline:${id}`,
    resolvedUrl: `inline:${id}`,
    localPath: `assets/svg/${id}.svg`,
    mimeType: 'image/svg+xml',
    intrinsicWidth: null,
    intrinsicHeight: null,
    renderedWidth: Math.round(el.getBoundingClientRect().width) || null,
    renderedHeight: Math.round(el.getBoundingClientRect().height) || null,
    elementIds: [elementId],
    sectionIds: [],
    downloadStatus: 'downloaded',
    failureReason: null,
    licenseReviewRequired: false,
    inlineSvg: markup,
    alt: el.getAttribute('aria-label') || null,
  }
}

function imageUrlsFromElement(el: Element, img: HTMLImageElement): string[] {
  const urls: string[] = []
  const push = (value: string | null | undefined) => {
    if (value) urls.push(value)
  }
  push(img.currentSrc)
  push(img.src)
  push(el.getAttribute('src'))
  push(el.getAttribute('data-src'))
  const srcset = el.getAttribute('srcset') || el.getAttribute('data-srcset')
  if (srcset) {
    push(pickBestSrcsetUrl(srcset))
    for (const candidate of parseSrcset(srcset)) push(candidate.url)
  }
  return [...new Set(urls)]
}

function guessType(url: string, fallback: AssetType): AssetType {
  const lower = url.toLowerCase()
  if (lower.includes('.svg') || lower.startsWith('data:image/svg')) return 'svg'
  if (lower.includes('favicon') || lower.endsWith('.ico')) return 'favicon'
  if (/\.(png|jpe?g|gif|webp|avif|bmp)(\?|$)/i.test(lower) || lower.startsWith('data:image')) {
    return fallback === 'icon' ? 'icon' : fallback === 'background' ? 'background' : 'image'
  }
  return fallback
}

function makeAsset(type: AssetType, rawUrl: string, elementId: string, extra: Partial<AssetRecord>): AssetRecord {
  const resolved = resolveUrl(rawUrl)
  const id = `asset_${hashString(canonicalizeAssetUrl(resolved))}`
  return {
    id,
    type,
    sourceUrl: rawUrl,
    resolvedUrl: resolved,
    localPath: '',
    mimeType: null,
    intrinsicWidth: extra.intrinsicWidth ?? null,
    intrinsicHeight: extra.intrinsicHeight ?? null,
    renderedWidth: extra.renderedWidth ?? null,
    renderedHeight: extra.renderedHeight ?? null,
    elementIds: [elementId],
    sectionIds: [],
    downloadStatus: 'pending',
    failureReason: null,
    licenseReviewRequired: type === 'font',
    inlineSvg: extra.inlineSvg ?? null,
    alt: extra.alt ?? null,
  }
}

export function resolveUrl(url: string): string {
  try {
    return new URL(url, document.baseURI).toString()
  } catch {
    return url
  }
}

/** Same visual file even when cache-busters or srcset widths differ. Distinct optimizer `url=` targets stay separate. */
export function assetIdentityKey(asset: AssetRecord): string {
  if (asset.inlineSvg) return `svg:${hashString(asset.inlineSvg.replace(/\s+/g, ' ').trim())}`
  return `url:${canonicalizeAssetUrl(asset.resolvedUrl || asset.sourceUrl)}`
}

const SIZE_QUERY_KEYS = new Set([
  'w',
  'h',
  'width',
  'height',
  'dpr',
  'q',
  'quality',
  'fit',
  'crop',
  'auto',
  'format',
  'fm',
  'cs',
  'ixlib',
  'ixid',
])
const CACHE_QUERY_KEYS = new Set(['v', 'ver', 'version', 't', 'ts', '_', 'cb', 'cache', 'hash', 'rev'])

export function canonicalizeAssetUrl(url: string, depth = 0): string {
  const raw = url.trim()
  if (!raw) return ''
  if (raw.startsWith('data:')) return raw.replace(/\s+/g, '')
  if (raw.startsWith('blob:') || raw.startsWith('inline:')) return raw
  try {
    const parsed = new URL(raw)
    parsed.hash = ''
    const nested = parsed.searchParams.get('url') || parsed.searchParams.get('src') || parsed.searchParams.get('image')
    const optimizer = /\/_next\/image|\/cdn-cgi\/image|\/image\/fetch/i.test(parsed.pathname)
    if (nested && depth < 3 && (optimizer || parsed.searchParams.has('url'))) {
      try {
        const decoded = decodeURIComponent(nested)
        const inner =
          decoded.startsWith('http') || decoded.startsWith('data:') || decoded.startsWith('blob:')
            ? decoded
            : new URL(decoded, parsed.origin).toString()
        if (inner !== raw) return canonicalizeAssetUrl(inner, depth + 1)
      } catch {
        /* keep the outer URL */
      }
    }
    const kept: Array<[string, string]> = []
    parsed.searchParams.forEach((value, key) => {
      const lower = key.toLowerCase()
      if (SIZE_QUERY_KEYS.has(lower) || CACHE_QUERY_KEYS.has(lower)) return
      kept.push([key, value])
    })
    kept.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]))
    const path = parsed.pathname.replace(/\/+$/, '') || '/'
    const query = kept.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')
    return `${parsed.protocol}//${parsed.host.toLowerCase()}${path}${query ? `?${query}` : ''}`
  } catch {
    return raw.split('#')[0] ?? raw
  }
}

function svgSize(el: Element): { width: number | null; height: number | null } {
  try {
    const box = el instanceof SVGGraphicsElement ? el.getBBox() : el.getBoundingClientRect()
    return {
      width: Math.round(box.width) || null,
      height: Math.round(box.height) || null,
    }
  } catch {
    const rect = el.getBoundingClientRect()
    return {
      width: Math.round(rect.width) || null,
      height: Math.round(rect.height) || null,
    }
  }
}

function serializeSvg(el: Element): string {
  const clone = el.cloneNode(true) as Element
  if (!clone.getAttribute('xmlns')) {
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  }
  for (const use of [...clone.querySelectorAll('use')]) {
    const href = use.getAttribute('href') || use.getAttribute('xlink:href')
    if (!href?.startsWith('#')) continue
    const target = document.getElementById(href.slice(1))
    if (!target) continue
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    group.innerHTML = target.innerHTML
    use.replaceWith(group)
  }
  return sanitizeSvg(new XMLSerializer().serializeToString(clone))
}

export async function materializeBlobAssets(assets: AssetRecord[]): Promise<void> {
  await Promise.all(
    assets.map(async (asset) => {
      if (!asset.resolvedUrl.startsWith('blob:')) return
      try {
        const response = await fetch(asset.resolvedUrl)
        const blob = await response.blob()
        const dataUrl = await blobToDataUrl(blob)
        asset.resolvedUrl = dataUrl
        asset.sourceUrl = dataUrl
        asset.mimeType = blob.type || asset.mimeType
        asset.downloadStatus = 'downloaded'
      } catch {
        /* leave the original blob URL */
      }
    }),
  )
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export function mergeAssets(list: AssetRecord[]): AssetRecord[] {
  const map = new Map<string, AssetRecord>()
  for (const asset of list) {
    const key = assetIdentityKey(asset)
    const incoming = { ...asset, elementIds: [...asset.elementIds] }
    const existing = map.get(key)
    if (!existing) {
      map.set(key, incoming)
      continue
    }
    map.set(key, mergeAssetPair(existing, incoming))
  }
  return [...map.values()]
}

function mergeAssetPair(a: AssetRecord, b: AssetRecord): AssetRecord {
  const takeB = assetRank(b) > assetRank(a)
  const keep = { ...(takeB ? b : a) }
  const drop = takeB ? a : b
  keep.elementIds = [...new Set([...a.elementIds, ...b.elementIds])]
  keep.sectionIds = [...new Set([...a.sectionIds, ...b.sectionIds])]
  if (!keep.inlineSvg) keep.inlineSvg = drop.inlineSvg
  if (!keep.alt) keep.alt = drop.alt
  if ((drop.intrinsicWidth ?? 0) > (keep.intrinsicWidth ?? 0)) {
    keep.intrinsicWidth = drop.intrinsicWidth
    keep.intrinsicHeight = drop.intrinsicHeight
  }
  if (!keep.mimeType) keep.mimeType = drop.mimeType
  if (widthHint(drop.resolvedUrl) > widthHint(keep.resolvedUrl)) {
    keep.sourceUrl = drop.sourceUrl
    keep.resolvedUrl = drop.resolvedUrl
  }
  if (keep.downloadStatus !== 'downloaded' && drop.downloadStatus === 'downloaded') {
    keep.sourceUrl = drop.sourceUrl
    keep.resolvedUrl = drop.resolvedUrl
    keep.mimeType = drop.mimeType || keep.mimeType
    keep.downloadStatus = drop.downloadStatus
  }
  return keep
}

function assetRank(asset: AssetRecord): number {
  const area =
    (asset.intrinsicWidth ?? 0) * (asset.intrinsicHeight ?? 0) ||
    (asset.renderedWidth ?? 0) * (asset.renderedHeight ?? 0)
  const downloaded = asset.downloadStatus === 'downloaded' ? 1_000_000_000 : 0
  return area + downloaded + widthHint(asset.resolvedUrl)
}

function widthHint(url: string): number {
  try {
    const parsed = new URL(url)
    const value = Number(parsed.searchParams.get('w') || parsed.searchParams.get('width') || 0)
    return Number.isFinite(value) ? value : 0
  } catch {
    return 0
  }
}

export function uniqueVisualAssets(list: AssetRecord[]): AssetRecord[] {
  return mergeAssets(list).filter((asset) => asset.type !== 'font')
}
