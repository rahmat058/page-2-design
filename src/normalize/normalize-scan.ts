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
    const gradient = usage.source === 'gradient';
    const css = gradient ? (usage.original[0] ?? parsed.rgba) : parsed.rgba;
    const role = gradient ? 'gradient' : inferColorRole(parsed.hex, usage.properties);
    tokens.push({
      id: `color_${tokens.length + 1}`,
      name: `${role}-${tokens.length + 1}`,
      nameInferred: true,
      hex: opaqueHex(parsed.hex),
      rgba: parsed.rgba,
      hsl: parsed.hsl,
      oklch: parsed.oklch,
      original: usage.original,
      count: usage.count,
      area: usage.area || usage.count,
      properties: usage.properties,
      elementIds: usage.elementIds,
      role,
      roleInferred: true,
      nearDuplicates: [],
      kind: gradient ? 'gradient' : 'solid',
      css,
    });
  }
  return finalizePalette(tokens);
}

function finalizePalette(tokens: ColorToken[]): ColorToken[] {
  const solids = tokens.filter((token) => token.kind !== 'gradient');
  const gradients = uniqueGradients(tokens.filter((token) => token.kind === 'gradient'));
  const sorted = [...solids].sort((a, b) => (b.area || b.count) - (a.area || a.count) || b.count - a.count);
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
      host.area = (host.area || 0) + (token.area || 0);
      host.elementIds = [...new Set([...host.elementIds, ...token.elementIds])];
      host.properties = [...new Set([...host.properties, ...token.properties])];
      host.original = [...new Set([...host.original, ...token.original])];
      continue;
    }
    clustered.push({ ...token, elementIds: [...token.elementIds] });
  }

  const ranked = [...gradients, ...clustered].sort(
    (a, b) => (b.area || b.count) - (a.area || a.count) || b.count - a.count || a.hex.localeCompare(b.hex),
  );
  return ranked.slice(0, 32).map((token, index) => ({
    ...token,
    id: `color_${index + 1}`,
    name: token.kind === 'gradient' ? gradientLabel(token.css) : `${token.role}-${index + 1}`,
    nearDuplicates: [],
  }));
}

function uniqueGradients(tokens: ColorToken[]): ColorToken[] {
  const map = new Map<string, ColorToken>();
  for (const token of tokens) {
    const key = token.css.replace(/\s+/g, ' ');
    const existing = map.get(key);
    if (existing) {
      existing.count += token.count;
      existing.area = (existing.area || 0) + (token.area || 0);
      existing.elementIds = [...new Set([...existing.elementIds, ...token.elementIds])];
      continue;
    }
    map.set(key, { ...token, css: key });
  }
  return [...map.values()];
}

function gradientLabel(css: string): string {
  if (/radial-gradient/i.test(css)) return 'Radial gradient';
  if (/conic-gradient/i.test(css)) return 'Conic gradient';
  return 'Linear gradient';
}

function opaqueHex(hex: string): string {
  if (/^#[0-9a-f]{8}$/i.test(hex) && hex.slice(7).toUpperCase() === 'FF') return hex.slice(0, 7).toUpperCase();
  return hex.toUpperCase();
}

function sameSwatch(
  a: NonNullable<ReturnType<typeof parseColor>>,
  b: NonNullable<ReturnType<typeof parseColor>>,
): boolean {
  if (Math.abs(a.a - b.a) > 0.08) return false;
  return colorDistance(a, b) < 6;
}
