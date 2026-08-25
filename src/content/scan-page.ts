import { SCHEMA_VERSION, ELEMENT_CHUNK_SIZE } from '../shared/constants'
import { DomainError } from '../shared/errors'
import { createMessage, createRequestId } from '../shared/messages'
import { redactUrl } from '../shared/redact'
import type {
  ColorUsage,
  CompactFrameScan,
  CssVariableRecord,
  MediaQueryObservation,
  NumericUsage,
  PageScan,
  ScanOptions,
  ShadowUsage,
  TypographyUsage,
} from '../shared/types'
import { collectDocumentAssets, materializeBlobAssets, mergeAssets, resolveUrl } from './asset-scanner'
import { collectColors, colorUsages } from './color-scanner'
import { scanPseudos } from './pseudo-scanner'
import { orderContent } from './content-scanner'
import { scanDom } from './dom-scanner'
import { collectNumeric, numericUsages, shadowUsages } from './layout-scanner'
import { loadLazyContent } from './lazy-load'
import { createRuntime } from './scan-context'
import { readCssInformation } from './css-information'
import { associateSections, detectSections } from './section-detector'
import { collectTypography, typographyUsages } from './typography-scanner'
import { emptyCoverage } from '../shared/types'

export interface ScanTransport {
  send(message: unknown): void
  cancelled(): boolean
}

export async function runPageScan(options: ScanOptions, transport: ScanTransport, scanId: string): Promise<PageScan> {
  const runtime = createRuntime(options)
  const requestId = createRequestId()

  const emitProgress = (
    phase: PageScan extends never ? never : import('../shared/types').ScanPhase,
    message: string,
    counts: {
      elements: number
      textBlocks: number
      images: number
      colors: number
      typography: number
    },
    completedChunks = 0,
    totalChunks: number | null = null,
  ) => {
    transport.send(
      createMessage({
        type: 'SCAN_PROGRESS',
        requestId,
        scanId,
        payload: { phase, message, counts, completedChunks, totalChunks },
      }),
    )
  }

  emitProgress('preparing', 'Preparing scan', emptyCounts())

  if (typeof document.fonts?.ready !== 'undefined') {
    await Promise.race([document.fonts.ready, timeout(2000)])
  }

  let lazyLoad = {
    attempted: false,
    truncated: false,
    reason: null as string | null,
    finalScrollHeight: document.documentElement.scrollHeight,
  }

  if (options.loadLazyContent) {
    emitProgress('lazy-loading', 'Loading lazy content', emptyCounts())
    lazyLoad = await loadLazyContent(runtime, (message) => {
      if (transport.cancelled()) runtime.cancelled = true
      emitProgress('lazy-loading', message, emptyCounts())
    })
  }

  if (transport.cancelled()) {
    throw new DomainError('CANCELLED', 'Scan cancelled.', { recoverable: true })
  }

  emitProgress('scanning', 'Scanning rendered DOM', emptyCounts())

  const root = document.documentElement
  const syncCancel = () => {
    if (transport.cancelled()) runtime.cancelled = true
  }
  syncCancel()
  const dom = await scanDom(runtime, root)
  syncCancel()
  if (runtime.cancelled) {
    throw new DomainError('CANCELLED', 'Scan cancelled.', { recoverable: true })
  }

  const colorBucket = new Map<string, ColorUsage>()
  const typeBucket = new Map<string, TypographyUsage>()
  const spacingBucket = new Map<string, NumericUsage>()
  const radiusBucket = new Map<string, NumericUsage>()
  const shadowBucket = new Map<string, ShadowUsage>()

  for (const el of dom.elements) {
    const style = dom.styleRegistry[el.styleSignature] ?? {}
    collectColors(el.id, style, colorBucket, Math.max(1, el.bounds.width * el.bounds.height))
    collectTypography(el.id, style, el.directText, el.classNames, el.tagName, typeBucket)
    collectNumeric(el.id, style, spacingBucket, radiusBucket, shadowBucket)
  }

  const cssVariables = readCssVariables()

  const assets = mergeAssets([...dom.assets.values(), ...collectDocumentAssets()])
  await materializeBlobAssets(assets)
  assignAssetPaths(assets)

  const sections = detectSections(dom.elements, dom.styleRegistry)
  const elements = associateSections(dom.elements, sections)
  const content = orderContent(dom.content).map((block) => ({
    ...block,
    sectionId: elements.find((el) => el.id === block.elementId)?.sectionId ?? null,
  }))

  for (const section of sections) {
    const members = elements.filter((el) => el.sectionId === section.id)
    section.assetIds = [...new Set(members.flatMap((el) => el.assetIds))]
  }

  const metadata = readMetadata()
  const scan: PageScan = {
    schemaVersion: SCHEMA_VERSION,
    metadata,
    page: {
      viewportWidth: metadata.viewportWidth,
      viewportHeight: metadata.viewportHeight,
      documentWidth: metadata.scrollWidth,
      documentHeight: metadata.scrollHeight,
      devicePixelRatio: metadata.devicePixelRatio,
    },
    sections,
    elements,
    styleRegistry: dom.styleRegistry,
    assets,
    colors: colorUsages(colorBucket),
    typography: typographyUsages(typeBucket),
    spacing: numericUsages(spacingBucket),
    radii: numericUsages(radiusBucket),
    shadows: shadowUsages(shadowBucket),
    cssVariables,
    interactions: dom.interactions,
    content,
    pseudos: scanPseudos(root, dom.idMap),
    mediaQueries: readMediaQueries(runtime),
    cssInformation: await readCssInformation(),
    limitations: runtime.limitations,
    coverage: emptyCoverage(),
    lazyLoad,
    viewportSnapshots: [],
  }

  const chunks = chunkScan(scan)
  for (const chunk of chunks) {
    if (transport.cancelled()) {
      throw new DomainError('CANCELLED', 'Scan cancelled.', { recoverable: true })
    }
    transport.send(
      createMessage({
        type: 'SCAN_CHUNK',
        requestId,
        scanId,
        payload: chunk,
      }),
    )
    emitProgress(
      'scanning',
      `Transmitting scan chunk ${chunk.index + 1} of ${chunk.total}`,
      {
        elements: scan.elements.length,
        textBlocks: scan.content.length,
        images: scan.assets.length,
        colors: scan.colors.length,
        typography: scan.typography.length,
      },
      chunk.index + 1,
      chunk.total,
    )
    await timeout(0)
  }

  return scan
}

function emptyCounts() {
  return { elements: 0, textBlocks: 0, images: 0, colors: 0, typography: 0 }
}

function timeout(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readMetadata() {
  const { url, redacted } = redactUrl(location.href)
  const scheme = matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'no-preference'
  const og = readOpenGraph()
  return {
    url,
    urlRedacted: redacted,
    title: document.title,
    ogTitle: og.title,
    ogImage: og.image,
    ogUrl: og.url,
    language: document.documentElement.lang || document.documentElement.getAttribute('lang') || 'unknown',
    direction: (document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr') as 'ltr' | 'rtl',
    scannedAt: new Date().toISOString(),
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio || 1,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    documentBackground: getComputedStyle(document.body || document.documentElement).backgroundColor,
    colorScheme: scheme as 'light' | 'dark' | 'no-preference',
    restoredScrollX: window.scrollX,
    restoredScrollY: window.scrollY,
    hostname: location.hostname || 'page',
  }
}

function readOpenGraph(): { title: string; image: string; url: string } {
  const title =
    metaContent('meta[property="og:title"]') || metaContent('meta[name="twitter:title"]') || document.title.trim()
  const image =
    metaContent('meta[property="og:image"]') ||
    metaContent('meta[property="og:image:url"]') ||
    metaContent('meta[name="twitter:image"]') ||
    metaContent('meta[name="twitter:image:src"]') ||
    metaContent('meta[itemprop="image"]')
  const url =
    metaContent('meta[property="og:url"]') ||
    document.querySelector('link[rel="canonical"]')?.getAttribute('href')?.trim() ||
    location.href
  return {
    title,
    image: image ? resolveUrl(image) : '',
    url: url ? resolveUrl(url) : location.href,
  }
}

function metaContent(selector: string): string {
  return document.querySelector(selector)?.getAttribute('content')?.trim() || ''
}

function readCssVariables(): CssVariableRecord[] {
  const records: CssVariableRecord[] = []
  const root = getComputedStyle(document.documentElement)
  for (let i = 0; i < root.length; i += 1) {
    const name = root.item(i)
    if (name.startsWith('--')) {
      records.push({
        name,
        value: root.getPropertyValue(name).trim(),
        source: 'root',
        elementId: null,
      })
    }
  }
  return records.slice(0, 200)
}

function readMediaQueries(runtime: {
  addLimitation: (code: string, message: string) => void
}): MediaQueryObservation[] {
  const observations: MediaQueryObservation[] = []
  try {
    const sheets = document.styleSheets
    for (const sheet of sheets) {
      try {
        const rules = sheet.cssRules
        for (const rule of rules) {
          if (rule instanceof CSSMediaRule) {
            observations.push({
              raw: rule.conditionText,
              readable: true,
              notes: 'Read from stylesheet cssRules.',
            })
          }
        }
      } catch {
        runtime.addLimitation('CROSS_ORIGIN_STYLESHEET', 'A cross-origin stylesheet could not be read.')
        observations.push({
          raw: sheet.href ?? 'inline',
          readable: false,
          notes: 'Stylesheet cssRules were not accessible.',
        })
      }
    }
  } catch {
    runtime.addLimitation('MEDIA_QUERIES', 'Media queries could not be enumerated.')
  }
  return observations.slice(0, 80)
}

function assignAssetPaths(assets: import('../shared/types').AssetRecord[]): void {
  const used = new Set<string>()
  for (const asset of assets) {
    const folder =
      asset.type === 'svg'
        ? 'assets/svg'
        : asset.type === 'font'
          ? 'assets/fonts'
          : asset.type === 'icon' || asset.type === 'favicon'
            ? 'assets/icons'
            : 'assets/images'
    const ext = asset.type === 'svg' ? 'svg' : 'png'
    let path = `${folder}/${asset.id}.${ext}`
    let n = 2
    while (used.has(path)) {
      path = `${folder}/${asset.id}-${n}.${ext}`
      n += 1
    }
    used.add(path)
    asset.localPath = path
  }
}

function chunkScan(scan: PageScan) {
  const elementChunks: (typeof scan.elements)[] = []
  for (let i = 0; i < scan.elements.length; i += ELEMENT_CHUNK_SIZE) {
    elementChunks.push(scan.elements.slice(i, i + ELEMENT_CHUNK_SIZE))
  }
  const parts: { kind: string; index: number; total: number; data: unknown }[] = []
  parts.push({
    kind: 'meta',
    index: 0,
    total: 0,
    data: { metadata: scan.metadata, page: scan.page, lazyLoad: scan.lazyLoad, cssInformation: scan.cssInformation },
  })
  parts.push({ kind: 'sections', index: 0, total: 0, data: scan.sections })
  for (const chunk of elementChunks) {
    parts.push({ kind: 'elements', index: 0, total: 0, data: chunk })
  }
  parts.push({ kind: 'styles', index: 0, total: 0, data: scan.styleRegistry })
  parts.push({ kind: 'assets', index: 0, total: 0, data: scan.assets })
  parts.push({
    kind: 'tokens',
    index: 0,
    total: 0,
    data: {
      colors: scan.colors,
      typography: scan.typography,
      spacing: scan.spacing,
      radii: scan.radii,
      shadows: scan.shadows,
      cssVariables: scan.cssVariables,
    },
  })
  parts.push({
    kind: 'content',
    index: 0,
    total: 0,
    data: {
      content: scan.content,
      interactions: scan.interactions,
      limitations: scan.limitations,
      pseudos: scan.pseudos,
      mediaQueries: scan.mediaQueries,
    },
  })
  return parts.map((part, index) => ({ ...part, index, total: parts.length }))
}

export async function runFrameScan(): Promise<CompactFrameScan> {
  const runtime = createRuntime({
    loadLazyContent: false,
    contentScope: 'visible',
    includeNavigationAndFooter: true,
    includeHiddenStructural: false,
    captureExtraViewports: false,
    maxScanHeight: 8000,
    maxLazyLoadMs: 0,
  })
  // Soft cap for iframes: temporarily lower MAX via early stop after 400 by wrapping walk budget.
  const dom = await scanDom(runtime, document.documentElement)
  if (dom.elements.length > 400) {
    const keep = new Set(dom.elements.slice(0, 400).map((el) => el.id))
    dom.elements.length = 400
    dom.content = dom.content.filter((block) => keep.has(block.elementId))
    for (const asset of dom.assets.values()) {
      asset.elementIds = asset.elementIds.filter((id) => keep.has(id))
    }
    runtime.addLimitation('MAX_ELEMENTS', 'Iframe scan was truncated after 400 elements.')
  }
  const colorBucket = new Map<string, ColorUsage>()
  const typeBucket = new Map<string, TypographyUsage>()
  for (const el of dom.elements) {
    const style = dom.styleRegistry[el.styleSignature] ?? {}
    collectColors(el.id, style, colorBucket, Math.max(1, el.bounds.width * el.bounds.height))
    collectTypography(el.id, style, el.directText, el.classNames, el.tagName, typeBucket)
  }
  return {
    href: location.href,
    title: document.title,
    frameIdHint: location.pathname || location.href,
    elements: dom.elements,
    content: orderContent(dom.content),
    assets: mergeAssets([...dom.assets.values()]),
    colors: colorUsages(colorBucket),
    typography: typographyUsages(typeBucket),
    limitations: runtime.limitations,
  }
}
