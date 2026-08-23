import { hashString } from '../shared/utils';
import type { AssetRecord, AssetType } from '../shared/types';
import { extractCssUrls } from './css-urls';
import { parseSrcset, pickBestSrcsetUrl } from './srcset';
import { sanitizeSvg } from './svg-sanitize';

export function collectAssetsFromElement(
  el: Element,
  elementId: string,
  computed: CSSStyleDeclaration,
): AssetRecord[] {
  const found: AssetRecord[] = [];
  const tag = el.tagName.toLowerCase();

  if (tag === 'img') {
    const img = el as HTMLImageElement;
    const resolved =
      img.currentSrc || img.src || el.getAttribute('src') || el.getAttribute('data-src');
    if (resolved) {
      found.push(
        makeAsset('image', resolved, elementId, {
          intrinsicWidth: img.naturalWidth || null,
          intrinsicHeight: img.naturalHeight || null,
          renderedWidth: img.clientWidth || null,
          renderedHeight: img.clientHeight || null,
          alt: img.alt || el.getAttribute('alt'),
        }),
      );
    }
    const srcset = el.getAttribute('srcset');
    if (srcset) {
      for (const candidate of parseSrcset(srcset)) {
        found.push(makeAsset('image', candidate.url, elementId, { alt: img.alt || null }));
      }
    }
  }

  if (tag === 'source') {
    const srcset = el.getAttribute('srcset');
    const best = srcset ? pickBestSrcsetUrl(srcset) : el.getAttribute('src');
    if (best) found.push(makeAsset('image', best, elementId, {}));
  }

  if (tag === 'video') {
    const poster = (el as HTMLVideoElement).poster || el.getAttribute('poster');
    if (poster) found.push(makeAsset('video-poster', poster, elementId, {}));
  }

  if (tag === 'link') {
    const rel = (el.getAttribute('rel') ?? '').toLowerCase();
    const href = el.getAttribute('href');
    if (href && (rel.includes('icon') || rel === 'apple-touch-icon')) {
      found.push(makeAsset('favicon', href, elementId, {}));
    }
  }

  if (tag === 'svg') {
    const markup = sanitizeSvg(el.outerHTML);
    const id = `asset_${hashString(markup)}`;
    found.push({
      id,
      type: 'svg',
      sourceUrl: `inline:${id}`,
      resolvedUrl: `inline:${id}`,
      localPath: `assets/svg/${id}.svg`,
      mimeType: 'image/svg+xml',
      intrinsicWidth: null,
      intrinsicHeight: null,
      renderedWidth:
        el instanceof SVGGraphicsElement ? Math.round(el.getBBox?.().width || 0) || null : null,
      renderedHeight:
        el instanceof SVGGraphicsElement ? Math.round(el.getBBox?.().height || 0) || null : null,
      elementIds: [elementId],
      sectionIds: [],
      downloadStatus: 'downloaded',
      failureReason: null,
      licenseReviewRequired: false,
      inlineSvg: markup,
      alt: el.getAttribute('aria-label') || el.querySelector('title')?.textContent || null,
    });
  }

  const bg = computed.backgroundImage;
  for (const url of extractCssUrls(bg)) {
    found.push(makeAsset('background', url, elementId, {}));
  }
  for (const url of extractCssUrls(computed.maskImage || computed.getPropertyValue('mask-image'))) {
    found.push(makeAsset('other', url, elementId, {}));
  }
  for (const url of extractCssUrls(computed.getPropertyValue('content'))) {
    found.push(makeAsset('icon', url, elementId, {}));
  }

  const lazy = el.getAttribute('data-src') || el.getAttribute('data-lazy-src');
  if (lazy && tag !== 'img') {
    found.push(makeAsset('image', lazy, elementId, {}));
  }

  return found;
}

export function collectDocumentAssets(): AssetRecord[] {
  const extras: AssetRecord[] = [];
  const og = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
  if (og) extras.push(makeAsset('image', og, 'document', {}));
  const icon = document.querySelector('link[rel~="icon"]')?.getAttribute('href');
  if (icon) extras.push(makeAsset('favicon', icon, 'document', {}));
  return extras;
}

function makeAsset(
  type: AssetType,
  rawUrl: string,
  elementId: string,
  extra: Partial<AssetRecord>,
): AssetRecord {
  const resolved = resolveUrl(rawUrl);
  const id = `asset_${hashString(resolved)}`;
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
  };
}

export function resolveUrl(url: string): string {
  try {
    return new URL(url, document.baseURI).toString();
  } catch {
    return url;
  }
}

export function mergeAssets(list: AssetRecord[]): AssetRecord[] {
  const map = new Map<string, AssetRecord>();
  for (const asset of list) {
    const existing = map.get(asset.id);
    if (!existing) {
      map.set(asset.id, { ...asset, elementIds: [...asset.elementIds] });
      continue;
    }
    existing.elementIds = [...new Set([...existing.elementIds, ...asset.elementIds])];
    if (!existing.inlineSvg && asset.inlineSvg) existing.inlineSvg = asset.inlineSvg;
    if (!existing.alt && asset.alt) existing.alt = asset.alt;
    if (!existing.intrinsicWidth && asset.intrinsicWidth) {
      existing.intrinsicWidth = asset.intrinsicWidth;
      existing.intrinsicHeight = asset.intrinsicHeight;
    }
  }
  return [...map.values()];
}
