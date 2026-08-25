/**
 * Maps live media elements (video, iframe, canvas, embeds) to static image or
 * sized-placeholder substitutions for the rebuild package.
 */
import type { AssetRecord, MediaSubstitution, MediaSubstitutionKind, ScannedElement } from '../shared/types'
import { publicUrlFromAssetPath } from '../export/package-paths'

const MEDIA_TAGS = new Set<string>(['video', 'iframe', 'canvas', 'cal-inline'])

/**
 * Video, embeds, and canvas can't be replayed from a static scan, and rebuilding an embed's inner
 * markup produces a broken imitation of someone else's UI. Each one becomes a still image when we
 * captured pixels, or a correctly sized placeholder when we could not.
 */
export function collectMediaSubstitutions(elements: ScannedElement[], assets: AssetRecord[]): MediaSubstitution[] {
  const assetById = new Map(assets.map((asset) => [asset.id, asset]))

  return elements
    .filter((el) => MEDIA_TAGS.has(el.tagName) && el.visibility.visible)
    .map((el) => {
      const kind = kindOf(el.tagName)
      const poster = el.assetIds
        .map((id) => assetById.get(id))
        .find((asset) => asset && (asset.type === 'image' || asset.type === 'video-poster'))
      const source = el.attributes.src ?? null

      return {
        elementId: el.id,
        sectionId: el.sectionId,
        kind,
        bounds: el.bounds,
        posterSrc:
          kind === 'iframe' || kind === 'embed' ? null : poster ? publicUrlFromAssetPath(poster.localPath) : null,
        origin: hostOf(source),
        label: labelFor(el, kind, source),
        aspectRatio: aspectRatioOf(el.bounds.width, el.bounds.height),
      }
    })
}

export function hostOf(url: string | null): string | null {
  if (!url) return null
  try {
    return new URL(url, 'https://example.invalid').hostname || null
  } catch {
    return null
  }
}

export function aspectRatioOf(width: number, height: number): string {
  if (!width || !height) return 'auto'
  const ratio = width / height
  const known: Array<[string, number]> = [
    ['16/9', 16 / 9],
    ['4/3', 4 / 3],
    ['3/2', 3 / 2],
    ['1/1', 1],
    ['9/16', 9 / 16],
    ['21/9', 21 / 9],
  ]
  const match = known.find(([, value]) => Math.abs(ratio - value) < 0.03)
  return match ? match[0] : `${Math.round(width)}/${Math.round(height)}`
}

function kindOf(tagName: string): MediaSubstitutionKind {
  if (tagName === 'cal-inline') return 'embed'
  return tagName as MediaSubstitutionKind
}

function labelFor(el: ScannedElement, kind: MediaSubstitutionKind, source: string | null): string {
  const explicit = el.attributes.title || el.attributes['aria-label']
  if (explicit) return explicit.slice(0, 120)
  const host = hostOf(source)
  if (kind === 'iframe' || kind === 'embed') {
    if (el.tagName === 'cal-inline' || host?.includes('cal.com')) {
      return host ? `Calendar embed (${host})` : 'Calendar embed'
    }
    return host ? `${host} embed` : 'Embedded frame'
  }
  if (kind === 'video') return 'Video'
  return 'Canvas graphic'
}
