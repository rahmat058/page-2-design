import { SCHEMA_VERSION } from '../shared/constants';
import type { ColorToken, NormalizedDesign, PageScan } from '../shared/types';
import { parseColor, inferColorRole, colorDistance, isFullyTransparent } from './colors';
import { inferComponents } from './components';
import { normalizeSections } from './sections';
import { frequencyTokens } from './spacing';
import { groupTypography } from './typography';
import { calculateCoverage } from '../validation/coverage';
import { orderContent } from '../content/content-scanner';
import { buildAssetPath } from '../export/filename';

export function normalizeScan(raw: PageScan): NormalizedDesign {
  const colorTokens = groupColors(raw);
  const typeTokens = groupTypography(raw.typography);
  const spacing = frequencyTokens(raw.spacing, 'space');
  const radii = frequencyTokens(raw.radii, 'radius', 1);
  const shadows = raw.shadows.map((shadow, index) => ({
    id: `shadow_${index + 1}`,
    name: `shadow-${index + 1}`,
    nameInferred: true,
    value: shadow.value,
    px: null,
    count: shadow.count,
    properties: shadow.properties,
  }));

  const usedPaths = new Set<string>();
  const assets = raw.assets.map((asset) => ({
    ...asset,
    localPath:
      asset.localPath ||
      buildAssetPath(asset.type, asset.id, asset.mimeType, asset.resolvedUrl, usedPaths),
  }));

  const sections = normalizeSections(raw.sections, colorTokens, typeTokens);
  const components = inferComponents(raw.elements, raw.styleRegistry);
  const content = orderContent(raw.content);
  const coverage = calculateCoverage(raw, { screenshotAvailable: false });

  const limitations = [...raw.limitations];
  if (!raw.page.viewportWidth) {
    limitations.push({
      code: 'VIEWPORT',
      message: 'Viewport metrics were missing from the raw scan.',
      severity: 'warning',
    });
  }
  const capturedViewports = raw.viewportSnapshots.filter((item) => item.captured);
  if (capturedViewports.length <= 1) {
    limitations.push({
      code: 'SINGLE_VIEWPORT',
      message:
        'Only one viewport snapshot was captured. Extra breakpoint resize may have been skipped or failed.',
      severity: 'info',
    });
  }
  if (raw.lazyLoad.truncated) {
    limitations.push({
      code: 'LAZY_TRUNCATED',
      message: raw.lazyLoad.reason ?? 'Lazy-content loading was truncated.',
      severity: 'warning',
    });
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    metadata: raw.metadata,
    sections,
    components,
    tokens: {
      colors: colorTokens,
      typography: typeTokens,
      spacing,
      radii,
      shadows,
    },
    assets,
    responsive:
      raw.viewportSnapshots.length > 0
        ? raw.viewportSnapshots.map((shot) => ({
            viewportWidth: shot.viewportWidth,
            viewportHeight: shot.viewportHeight,
            captured: shot.captured,
            label: shot.name,
            mediaQueries: raw.mediaQueries,
            matchingMedia: shot.matchingMedia,
            sections: shot.sections,
            notes: shot.notes,
          }))
        : [
            {
              viewportWidth: raw.page.viewportWidth,
              viewportHeight: raw.page.viewportHeight,
              captured: true,
              label: 'current',
              mediaQueries: raw.mediaQueries,
              notes: 'Measured from the active tab at scan time.',
            },
          ],
    content,
    limitations,
    coverage,
    page: raw.page,
    styleRegistry: raw.styleRegistry,
  };
}

function groupColors(raw: PageScan): ColorToken[] {
  const tokens: ColorToken[] = [];
  for (const usage of raw.colors) {
    if (usage.source === 'variable' || usage.source === 'outline' || usage.source === 'shadow') {
      continue;
    }
    const parsed = parseColor(usage.canonicalHex) ?? parseColor(usage.canonicalRgba);
    if (!parsed) continue;
    if (isFullyTransparent(parsed) || parsed.a < 0.08) continue;
    const role = inferColorRole(parsed.hex, usage.properties);
    tokens.push({
      id: `color_${tokens.length + 1}`,
      name: `${role}-${tokens.length + 1}`,
      nameInferred: true,
      hex: parsed.hex,
      rgba: parsed.rgba,
      hsl: parsed.hsl,
      oklch: parsed.oklch,
      original: usage.original,
      count: usage.count,
      properties: usage.properties,
      elementIds: usage.elementIds,
      role,
      roleInferred: true,
      nearDuplicates: [],
    });
  }
  return finalizePalette(tokens);
}

function finalizePalette(tokens: ColorToken[]): ColorToken[] {
  const sorted = [...tokens].sort((a, b) => b.count - a.count);
  const clustered: ColorToken[] = [];
  for (const token of sorted) {
    const parsed = parseColor(token.hex);
    if (!parsed) continue;
    const host = clustered.find((item) => {
      const other = parseColor(item.hex);
      return other ? sameSwatch(parsed, other) : false;
    });
    if (host) {
      host.count += token.count;
      host.elementIds = [...new Set([...host.elementIds, ...token.elementIds])];
      host.properties = [...new Set([...host.properties, ...token.properties])];
      host.original = [...new Set([...host.original, ...token.original])];
      continue;
    }
    clustered.push({ ...token, elementIds: [...token.elementIds] });
  }

  const ranked = clustered.sort((a, b) => b.count - a.count);
  const floor = Math.max(2, Math.floor((ranked[0]?.count ?? 2) * 0.015));
  const kept = ranked.filter((token, index) => {
    if (index < 10) return true;
    if (token.role === 'border' || token.role === 'shadow' || token.role === 'transparent') {
      return token.count >= Math.max(4, floor);
    }
    return token.count >= floor;
  });

  return kept.slice(0, 28).map((token, index) => {
    const nearDuplicates = kept
      .filter((other) => other !== token)
      .filter((other) => {
        const a = parseColor(token.hex);
        const b = parseColor(other.hex);
        return a && b ? colorDistance(a, b) < 18 : false;
      })
      .map((other) => other.id);
    return {
      ...token,
      id: `color_${index + 1}`,
      name: `${token.role}-${index + 1}`,
      nearDuplicates,
    };
  });
}

function sameSwatch(a: NonNullable<ReturnType<typeof parseColor>>, b: NonNullable<ReturnType<typeof parseColor>>): boolean {
  if (Math.abs(a.a - b.a) > 0.18) return false;
  return colorDistance(a, b) < 22;
}
