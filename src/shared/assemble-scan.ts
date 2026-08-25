import { SCHEMA_VERSION } from './constants'
import { emptyCoverage, emptyCssInformation } from './types'
import type { PageScan } from './types'

export function assembleScan(chunks: { kind: string; data: unknown }[]): PageScan {
  const scan: PageScan = {
    schemaVersion: SCHEMA_VERSION,
    metadata: {
      url: '',
      urlRedacted: false,
      title: '',
      ogTitle: '',
      ogImage: '',
      ogUrl: '',
      language: 'unknown',
      direction: 'ltr',
      scannedAt: new Date().toISOString(),
      viewportWidth: 0,
      viewportHeight: 0,
      devicePixelRatio: 1,
      scrollWidth: 0,
      scrollHeight: 0,
      documentBackground: '',
      colorScheme: 'no-preference',
      restoredScrollX: 0,
      restoredScrollY: 0,
      hostname: 'page',
    },
    page: {
      viewportWidth: 0,
      viewportHeight: 0,
      documentWidth: 0,
      documentHeight: 0,
      devicePixelRatio: 1,
    },
    sections: [],
    elements: [],
    styleRegistry: {},
    assets: [],
    colors: [],
    typography: [],
    spacing: [],
    radii: [],
    shadows: [],
    cssVariables: [],
    interactions: [],
    content: [],
    pseudos: [],
    mediaQueries: [],
    cssInformation: emptyCssInformation(),
    limitations: [],
    coverage: emptyCoverage(),
    lazyLoad: { attempted: false, truncated: false, reason: null, finalScrollHeight: 0 },
    viewportSnapshots: [],
  }

  for (const chunk of chunks) {
    const data = chunk.data as Record<string, unknown>
    if (chunk.kind === 'meta') {
      Object.assign(scan, {
        metadata: data.metadata,
        page: data.page,
        lazyLoad: data.lazyLoad,
        cssInformation: data.cssInformation ?? emptyCssInformation(),
      })
    } else if (chunk.kind === 'sections') {
      scan.sections = chunk.data as PageScan['sections']
    } else if (chunk.kind === 'elements') {
      scan.elements.push(...(chunk.data as PageScan['elements']))
    } else if (chunk.kind === 'styles') {
      Object.assign(scan.styleRegistry, chunk.data as PageScan['styleRegistry'])
    } else if (chunk.kind === 'assets') {
      scan.assets.push(...(chunk.data as PageScan['assets']))
    } else if (chunk.kind === 'tokens') {
      if (Array.isArray(data.colors)) scan.colors.push(...(data.colors as PageScan['colors']))
      if (Array.isArray(data.typography)) scan.typography.push(...(data.typography as PageScan['typography']))
      if (Array.isArray(data.spacing)) scan.spacing.push(...(data.spacing as PageScan['spacing']))
      if (Array.isArray(data.radii)) scan.radii.push(...(data.radii as PageScan['radii']))
      if (Array.isArray(data.shadows)) scan.shadows.push(...(data.shadows as PageScan['shadows']))
      if (Array.isArray(data.cssVariables)) {
        scan.cssVariables.push(...(data.cssVariables as PageScan['cssVariables']))
      }
    } else if (chunk.kind === 'content') {
      if (Array.isArray(data.content)) {
        scan.content.push(...(data.content as PageScan['content']))
      }
      if (data.interactions) scan.interactions = data.interactions as PageScan['interactions']
      if (data.limitations) scan.limitations = data.limitations as PageScan['limitations']
      if (data.pseudos) scan.pseudos = data.pseudos as PageScan['pseudos']
      if (data.mediaQueries) scan.mediaQueries = data.mediaQueries as PageScan['mediaQueries']
    }
  }
  return scan
}
