/**
 * Serializes normalized design slices into JSON reference payloads
 * (tokens, layout, scan summary, asset manifest, limitations).
 */
import { SCHEMA_VERSION } from '../shared/constants'
import { publicUrlFromAssetPath } from '../export/package-paths'
import type { NormalizedDesign, PageScan } from '../shared/types'

export function designTokensJson(design: NormalizedDesign): unknown {
  return {
    schemaVersion: SCHEMA_VERSION,
    colors: design.tokens.colors,
    typography: design.tokens.typography,
    spacing: design.tokens.spacing,
    radii: design.tokens.radii,
    shadows: design.tokens.shadows,
  }
}

export function layoutJson(design: NormalizedDesign): unknown {
  return {
    schemaVersion: SCHEMA_VERSION,
    page: design.page,
    sections: design.sections,
    components: design.components,
    responsive: design.responsive,
  }
}

export function scanJson(raw: PageScan): unknown {
  return {
    schemaVersion: SCHEMA_VERSION,
    metadata: raw.metadata,
    page: raw.page,
    coverage: raw.coverage,
    lazyLoad: raw.lazyLoad,
    elementCount: raw.elements.length,
    sections: raw.sections,
    limitations: raw.limitations,
  }
}

export function assetManifestJson(design: NormalizedDesign): unknown {
  return {
    schemaVersion: SCHEMA_VERSION,
    assets: design.assets.map((asset) => ({
      id: asset.id,
      type: asset.type,
      localPath: asset.localPath,
      publicPath: publicUrlFromAssetPath(asset.localPath),
      sourceUrl: asset.sourceUrl,
      resolvedUrl: asset.resolvedUrl,
      mimeType: asset.mimeType,
      downloadStatus: asset.downloadStatus,
      failureReason: asset.failureReason,
      licenseReviewRequired: asset.licenseReviewRequired,
      dimensions: {
        intrinsic: [asset.intrinsicWidth, asset.intrinsicHeight],
        rendered: [asset.renderedWidth, asset.renderedHeight],
      },
    })),
  }
}

export function limitationsJson(design: NormalizedDesign): unknown {
  return {
    schemaVersion: SCHEMA_VERSION,
    limitations: design.limitations,
    coverage: design.coverage,
  }
}

export function prettyJson(value: unknown): string {
  try {
    return `${JSON.stringify(value, null, 2)}\n`
  } catch (error) {
    return `${JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2)}\n`
  }
}
