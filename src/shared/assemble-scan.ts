import { SCHEMA_VERSION } from './constants'
import { emptyCoverage } from './types'
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
      })
    } else if (chunk.kind === 'sections') {
      scan.sections = chunk.data as PageScan['sections']
    } else if (chunk.kind === 'elements') {
      scan.elements.push(...(chunk.data as PageScan['elements']))
    } else if (chunk.kind === 'styles') {
      scan.styleRegistry = chunk.data as PageScan['styleRegistry']
    } else if (chunk.kind === 'assets') {
      scan.assets = chunk.data as PageScan['assets']
    } else if (chunk.kind === 'tokens') {
      Object.assign(scan, data)
    } else if (chunk.kind === 'content') {
      Object.assign(scan, data)
    }
  }
  return scan
}
