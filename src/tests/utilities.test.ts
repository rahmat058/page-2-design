import { describe, expect, it } from 'vitest';
import { extractCssUrls } from '../content/css-urls';
import { parseSrcset, pickBestSrcsetUrl } from '../content/srcset';
import { mergeAssets } from '../content/asset-scanner';
import { orderContent } from '../content/content-scanner';
import {
  sanitizeFilename,
  buildAssetPath,
  zipDownloadName,
  assertSafeZipPath,
} from '../export/filename';
import { typographySignature } from '../content/typography-scanner';
import { frequencyTokens } from '../normalize/spacing';
import { escapeMarkdown, escapeTableCell } from '../normalize/markdown-escape';
import { calculateCoverage } from '../validation/coverage';
import { parseMessage, isMalformedMessage, createMessage } from '../shared/messages';
import { MESSAGE_SCHEMA_VERSION } from '../shared/constants';
import { sampleScan } from './fixtures';

describe('css url extraction', () => {
  it('extracts quoted and unquoted urls', () => {
    expect(extractCssUrls('url("https://a/x.png")')).toEqual(['https://a/x.png']);
    expect(extractCssUrls("url('/img.jpg'), linear-gradient(#000, #fff)")).toEqual(['/img.jpg']);
    expect(extractCssUrls('url(data:image/png;base64,aaa)')).toEqual(['data:image/png;base64,aaa']);
  });
});

describe('srcset parsing', () => {
  it('parses candidates and picks the largest', () => {
    const parsed = parseSrcset('a.png 1x, b.png 2x, c.png 640w');
    expect(parsed).toHaveLength(3);
    expect(pickBestSrcsetUrl('small.png 320w, large.png 1280w')).toBe('large.png');
  });
});

describe('filename sanitization', () => {
  it('removes traversal and illegal characters', () => {
    expect(sanitizeFilename('../a/b:c*')).not.toContain('..');
    expect(sanitizeFilename('../a/b:c*')).not.toContain('/');
    expect(zipDownloadName('www.Example.com', '2026-08-24T00:00:00.000Z')).toMatch(
      /example\.com-2026-08-24T00-00-00\.zip/,
    );
  });

  it('handles collisions and rejects unsafe zip paths', () => {
    const used = new Set<string>();
    const a = buildAssetPath('image', 'asset_1', 'image/png', 'https://x/a.png', used);
    const b = buildAssetPath('image', 'asset_1', 'image/png', 'https://x/b.png', used);
    expect(a).not.toBe(b);
    expect(() => assertSafeZipPath('../secret')).toThrow();
  });
});

describe('asset deduplication', () => {
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
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.elementIds).toEqual(['el_1', 'el_2']);
    expect(merged[0]?.alt).toBe('Hero');
  });
});

describe('typography grouping', () => {
  it('creates a stable signature', () => {
    const style = { 'font-family': 'Georgia', 'font-size': '16px', 'font-weight': '400' };
    expect(typographySignature(style)).toBe(typographySignature({ ...style }));
    expect(typographySignature(style)).not.toBe(
      typographySignature({ ...style, 'font-size': '18px' }),
    );
  });
});

describe('spacing frequency', () => {
  it('groups repeated values without inventing a scale', () => {
    const tokens = frequencyTokens(
      [
        { value: '24px', px: 24, properties: ['padding'], count: 3, elementIds: ['a'] },
        { value: '8px', px: 8, properties: ['gap'], count: 1, elementIds: ['b'] },
      ],
      'space',
      2,
    );
    expect(tokens[0]?.value).toBe('24px');
    expect(tokens.every((token) => token.nameInferred)).toBe(true);
  });
});

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
    ]);
    expect(ordered.map((item) => item.text)).toEqual(['A', 'B']);
    expect(ordered.map((item) => item.order)).toEqual([0, 1]);
  });
});

describe('markdown escaping', () => {
  it('escapes markdown and table cells', () => {
    expect(escapeMarkdown('a|b*c')).toContain('\\');
    expect(escapeTableCell('a|b\nc')).toBe('a\\|b c');
  });
});

describe('coverage', () => {
  it('counts captured artifacts and never claims a match score', () => {
    const coverage = calculateCoverage(sampleScan(), {
      screenshotAvailable: false,
      downloadedAssets: 0,
    });
    expect(coverage.relevantElements).toBe(1);
    expect(coverage.screenshotAvailable).toBe(false);
    expect(JSON.stringify(coverage)).not.toMatch(/95%|design match/i);
  });
});

describe('message validation', () => {
  it('accepts well-formed messages and rejects malformed ones', () => {
    const ok = createMessage({ type: 'PING', requestId: 'req_1' });
    expect(parseMessage(ok)?.type).toBe('PING');
    expect(isMalformedMessage({ type: 'PING' })).toBe(true);
    expect(isMalformedMessage({ schemaVersion: '0.0.0', type: 'PING', requestId: 'x' })).toBe(true);
    expect(
      isMalformedMessage({ schemaVersion: MESSAGE_SCHEMA_VERSION, type: 'NOPE', requestId: 'x' }),
    ).toBe(true);
  });
});

describe('swatch contrast', () => {
  it('treats translucent black as light text-on-swatch', async () => {
    const { isDarkHex } = await import('../normalize/colors');
    expect(isDarkHex('#0000001A')).toBe(false);
    expect(isDarkHex('#111111')).toBe(true);
    expect(isDarkHex('#f5f5f5')).toBe(false);
  });
});
