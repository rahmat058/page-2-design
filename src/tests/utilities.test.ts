import { describe, expect, it } from 'vitest'
import { extractCssUrls } from '../content/css-urls'
import { parseSrcset, pickBestSrcsetUrl } from '../content/srcset'
import { isPlaceholderAssetUrl, mergeAssets } from '../content/asset-scanner'
import { orderContent } from '../content/content-scanner'
import {
  contentKindLabel,
  copyContentPlain,
  groupContentBySection,
  panelContentBlocks,
} from '../sidepanel/content-groups'
import type { AssetRecord } from '../shared/types'
import { sanitizeFilename, buildAssetPath, zipDownloadName, assertSafeZipPath } from '../export/filename'
import { publicUrlFromAssetPath } from '../export/package-paths'
import { typographySignature } from '../content/typography-scanner'
import { frequencyTokens } from '../normalize/spacing'
import { escapeMarkdown, escapeTableCell } from '../normalize/markdown-escape'
import { formatCssBytes, formatCssLoadTime } from '../shared/css-format'
import { countStyleRulesInCss } from '../shared/count-css-rules'
import { calculateCoverage } from '../validation/coverage'
import { parseMessage, isMalformedMessage, createMessage } from '../shared/messages'
import { MESSAGE_SCHEMA_VERSION } from '../shared/constants'
import { sampleScan } from './fixtures'
import { assembleScan } from '../shared/assemble-scan'
import { isAllowedAssetFetchUrl } from '../shared/asset-fetch-policy'

describe('css url extraction', () => {
  it('extracts quoted and unquoted urls', () => {
    expect(extractCssUrls('url("https://a/x.png")')).toEqual(['https://a/x.png'])
    expect(extractCssUrls("url('/img.jpg'), linear-gradient(#000, #fff)")).toEqual(['/img.jpg'])
    expect(extractCssUrls('url(data:image/png;base64,aaa)')).toEqual(['data:image/png;base64,aaa'])
  })
})

describe('srcset parsing', () => {
  it('parses candidates and picks the largest', () => {
    const parsed = parseSrcset('a.png 1x, b.png 2x, c.png 640w')
    expect(parsed).toHaveLength(3)
    expect(pickBestSrcsetUrl('small.png 320w, large.png 1280w')).toBe('large.png')
  })
})

describe('filename sanitization', () => {
  it('removes traversal and illegal characters', () => {
    expect(sanitizeFilename('../a/b:c*')).not.toContain('..')
    expect(sanitizeFilename('../a/b:c*')).not.toContain('/')
    expect(zipDownloadName('www.Example.com', '2026-08-24T00:00:00.000Z')).toMatch(
      /example\.com-2026-08-24T00-00-00\.zip/,
    )
  })

  it('handles collisions and rejects unsafe zip paths', () => {
    const used = new Set<string>()
    const a = buildAssetPath('image', 'asset_1', 'image/png', 'https://x/a.png', used)
    const b = buildAssetPath('image', 'asset_1', 'image/png', 'https://x/b.png', used)
    expect(a).not.toBe(b)
    expect(a).toBe('assets/images/asset_1.png')
    expect(() => assertSafeZipPath('../secret')).toThrow()
  })
})

describe('public asset URLs', () => {
  it('maps ZIP assets/ paths to public/ URLs', () => {
    expect(publicUrlFromAssetPath('assets/images/hero.png')).toBe('/images/hero.png')
    expect(publicUrlFromAssetPath('assets/icons/mark.svg')).toBe('/icons/mark.svg')
    expect(publicUrlFromAssetPath('assets/svg/logo.svg')).toBe('/svg/logo.svg')
  })
})

describe('asset deduplication', () => {
  it('treats lazy GIF shells and trackers as placeholders', () => {
    expect(isPlaceholderAssetUrl('/nstatic/images/placeholder-image.gif')).toBe(true)
    expect(isPlaceholderAssetUrl('https://cdn.example/loading.gif')).toBe(true)
    expect(isPlaceholderAssetUrl('https://www.facebook.com/tr?id=1&ev=PageView')).toBe(true)
    expect(isPlaceholderAssetUrl('https://rokbucket.rokomari.io/ProductNew20190903/130X186/ring-light.jpg')).toBe(false)
  })

  it('merges the same resolved identity', () => {
    const merged = mergeAssets([
      {
        id: 'asset_1',
        type: 'image',
        sourceUrl: 'a.png',
        resolvedUrl: 'https://x/a.png',
        localPath: '',
        mimeType: null,
        intrinsicWidth: null,
        intrinsicHeight: null,
        renderedWidth: null,
        renderedHeight: null,
        elementIds: ['el_1'],
        sectionIds: [],
        downloadStatus: 'pending',
        failureReason: null,
        licenseReviewRequired: false,
        inlineSvg: null,
        alt: null,
      },
      {
        id: 'asset_1',
        type: 'image',
        sourceUrl: './a.png',
        resolvedUrl: 'https://x/a.png',
        localPath: '',
        mimeType: null,
        intrinsicWidth: 10,
        intrinsicHeight: 10,
        renderedWidth: null,
        renderedHeight: null,
        elementIds: ['el_2'],
        sectionIds: [],
        downloadStatus: 'pending',
        failureReason: null,
        licenseReviewRequired: false,
        inlineSvg: null,
        alt: 'Hero',
      },
    ])
    expect(merged).toHaveLength(1)
    expect(merged[0]?.elementIds).toEqual(['el_1', 'el_2'])
    expect(merged[0]?.alt).toBe('Hero')
  })

  it('keeps one tile when urls differ only by query, hash, or id', () => {
    const merged = mergeAssets([
      sampleAsset({
        id: 'asset_a',
        resolvedUrl: 'https://cdn.example/riley.png?w=200',
        elementIds: ['el_1'],
      }),
      sampleAsset({
        id: 'asset_b',
        resolvedUrl: 'https://cdn.example/riley.png?w=800#hero',
        elementIds: ['el_2'],
        intrinsicWidth: 800,
        intrinsicHeight: 200,
      }),
    ])
    expect(merged).toHaveLength(1)
    expect(merged[0]?.elementIds).toEqual(['el_1', 'el_2'])
    expect(merged[0]?.intrinsicWidth).toBe(800)
  })

  it('keeps optimizer urls that point at different files', () => {
    const merged = mergeAssets([
      sampleAsset({
        id: 'asset_a',
        resolvedUrl: 'https://site.example/_next/image?url=%2Fhero.png&w=640',
        elementIds: ['el_1'],
      }),
      sampleAsset({
        id: 'asset_b',
        resolvedUrl: 'https://site.example/_next/image?url=%2Flogo.png&w=640',
        elementIds: ['el_2'],
      }),
    ])
    expect(merged).toHaveLength(2)
  })
})

describe('typography grouping', () => {
  it('creates a stable signature', () => {
    const style = { 'font-family': 'Georgia', 'font-size': '16px', 'font-weight': '400' }
    expect(typographySignature(style)).toBe(typographySignature({ ...style }))
    expect(typographySignature(style)).not.toBe(typographySignature({ ...style, 'font-size': '18px' }))
  })
})

describe('spacing frequency', () => {
  it('groups repeated values without inventing a scale', () => {
    const tokens = frequencyTokens(
      [
        { value: '24px', px: 24, properties: ['padding'], count: 3, elementIds: ['a'] },
        { value: '8px', px: 8, properties: ['gap'], count: 1, elementIds: ['b'] },
      ],
      'space',
      2,
    )
    expect(tokens[0]?.value).toBe('24px')
    expect(tokens.every((token) => token.nameInferred)).toBe(true)
  })
})

describe('content section grouping', () => {
  it('groups blocks under named sections and keeps leftovers last', () => {
    const groups = groupContentBySection(
      [
        {
          id: 'c2',
          kind: 'paragraph',
          level: null,
          text: 'Body',
          href: null,
          elementId: 'el_2',
          sectionId: 'sec_main',
          order: 2,
        },
        {
          id: 'c1',
          kind: 'heading',
          level: 1,
          text: 'Hello',
          href: null,
          elementId: 'el_1',
          sectionId: 'sec_header',
          order: 1,
        },
        {
          id: 'c3',
          kind: 'link',
          level: null,
          text: 'Orphan',
          href: 'https://example.com',
          elementId: 'el_3',
          sectionId: null,
          order: 3,
        },
      ],
      [
        { id: 'sec_header', name: 'Header' },
        { id: 'sec_main', name: 'Main' },
      ],
    )
    expect(groups.map((group) => group.name)).toEqual(['Header', 'Main', 'Other'])
    expect(groups[0]?.blocks[0]?.text).toBe('Hello')
    expect(copyContentPlain(groups)).toContain('# Header')
    expect(contentKindLabel(groups[0]!.blocks[0]!)).toBe('Heading 1')
  })

  it('omits image alt from the content tab', () => {
    const visible = panelContentBlocks([
      {
        id: 'c1',
        kind: 'heading',
        level: 1,
        text: 'Hello',
        href: null,
        elementId: 'el_1',
        sectionId: 'sec_header',
        order: 1,
      },
      {
        id: 'c2',
        kind: 'image-alt',
        level: null,
        text: 'Hero photo',
        href: null,
        elementId: 'el_2',
        sectionId: 'sec_header',
        order: 2,
      },
    ])
    expect(visible).toHaveLength(1)
    expect(visible[0]?.kind).toBe('heading')
    expect(groupContentBySection(visible, [{ id: 'sec_header', name: 'Header' }])[0]?.blocks).toHaveLength(1)
  })
})

describe('content ordering', () => {
  it('sorts by order and reindexes', () => {
    const ordered = orderContent([
      {
        id: 'b',
        kind: 'paragraph',
        level: null,
        text: 'B',
        href: null,
        elementId: '2',
        sectionId: null,
        order: 5,
      },
      {
        id: 'a',
        kind: 'heading',
        level: 1,
        text: 'A',
        href: null,
        elementId: '1',
        sectionId: null,
        order: 1,
      },
    ])
    expect(ordered.map((item) => item.text)).toEqual(['A', 'B'])
    expect(ordered.map((item) => item.order)).toEqual([0, 1])
  })
})

describe('markdown escaping', () => {
  it('escapes markdown and table cells', () => {
    expect(escapeMarkdown('a|b*c')).toContain('\\')
    expect(escapeTableCell('a|b\nc')).toBe('a\\|b c')
  })
})

describe('css information format', () => {
  it('formats file size and load time like the overview panel', () => {
    expect(formatCssBytes(220)).toBe('220B')
    expect(formatCssBytes(118784)).toBe('116kb')
    expect(formatCssLoadTime(1000)).toBe('1.0s')
    expect(formatCssLoadTime(null)).toBe('—')
  })

  it('counts top-level cssRules the way CSS Peeper does', () => {
    expect(countStyleRulesInCss('.a { color: red } .b { color: blue }')).toBe(2)
    expect(
      countStyleRulesInCss('@media (min-width: 1px) { .a { color: red } .b { color: blue } } .c { margin: 0 }'),
    ).toBe(2)
    expect(countStyleRulesInCss('@font-face { font-family: Test; src: url(a.woff2) } .a { font-family: Test }')).toBe(2)
  })

  it('keeps css information from the meta scan chunk', () => {
    const sample = sampleScan()
    const scan = assembleScan([
      {
        kind: 'meta',
        data: {
          metadata: sample.metadata,
          page: sample.page,
          lazyLoad: sample.lazyLoad,
          cssInformation: { styleRules: 220, stylesheetCount: 3, cssBytes: 118784, loadTimeMs: 1300 },
        },
      },
    ])
    expect(scan.cssInformation).toEqual({
      styleRules: 220,
      stylesheetCount: 3,
      cssBytes: 118784,
      loadTimeMs: 1300,
    })
  })
})

describe('asset fetch policy', () => {
  const page = 'https://www.rokomari.com/'

  it('allows same-site CDN hosts and data URLs', () => {
    expect(isAllowedAssetFetchUrl('https://www.rokomari.com/nstatic/a.png', page)).toBe(true)
    expect(isAllowedAssetFetchUrl('https://rokbucket.rokomari.io/ProductNew/a.jpg', page)).toBe(true)
    expect(isAllowedAssetFetchUrl('data:image/png;base64,aaa', page)).toBe(true)
  })

  it('blocks unrelated third-party hosts', () => {
    expect(isAllowedAssetFetchUrl('https://evil.example/track.gif', page)).toBe(false)
    expect(isAllowedAssetFetchUrl('https://www.facebook.com/tr?id=1', page)).toBe(false)
  })
})

describe('coverage', () => {
  it('counts captured artifacts and never claims a match score', () => {
    const coverage = calculateCoverage(sampleScan(), {
      screenshotAvailable: false,
      downloadedAssets: 0,
    })
    expect(coverage.relevantElements).toBe(1)
    expect(coverage.screenshotAvailable).toBe(false)
    expect(JSON.stringify(coverage)).not.toMatch(/95%|design match/i)
  })
})

describe('message validation', () => {
  it('accepts well-formed messages and rejects malformed ones', () => {
    const ok = createMessage({ type: 'PING', requestId: 'req_1' })
    expect(parseMessage(ok)?.type).toBe('PING')
    expect(isMalformedMessage({ type: 'PING' })).toBe(true)
    expect(isMalformedMessage({ schemaVersion: '0.0.0', type: 'PING', requestId: 'x' })).toBe(true)
    expect(isMalformedMessage({ schemaVersion: MESSAGE_SCHEMA_VERSION, type: 'NOPE', requestId: 'x' })).toBe(true)
  })
})

describe('swatch contrast', () => {
  it('treats translucent black as light text-on-swatch', async () => {
    const { isDarkHex } = await import('../normalize/colors')
    expect(isDarkHex('#0000001A')).toBe(false)
    expect(isDarkHex('#111111')).toBe(true)
    expect(isDarkHex('#f5f5f5')).toBe(false)
  })
})

function sampleAsset(partial: Partial<AssetRecord> & Pick<AssetRecord, 'id' | 'resolvedUrl'>): AssetRecord {
  return {
    type: 'image',
    sourceUrl: partial.resolvedUrl,
    localPath: '',
    mimeType: null,
    intrinsicWidth: null,
    intrinsicHeight: null,
    renderedWidth: null,
    renderedHeight: null,
    elementIds: ['el_1'],
    sectionIds: [],
    downloadStatus: 'pending',
    failureReason: null,
    licenseReviewRequired: false,
    inlineSvg: null,
    alt: null,
    ...partial,
  }
}
