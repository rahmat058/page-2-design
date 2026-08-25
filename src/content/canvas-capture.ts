/**
 * Captures a PNG data-URL snapshot of a canvas element for asset export when
 * the canvas is not tainted and stays under the size cap.
 */
import { hashString } from '../shared/utils'
import type { AssetRecord } from '../shared/types'

const MAX_CANVAS_DATA_CHARS = 1_500_000

export function captureCanvasAsset(el: HTMLCanvasElement, elementId: string): AssetRecord | null {
  try {
    const dataUrl = el.toDataURL('image/png')
    if (!dataUrl.startsWith('data:image/png') || dataUrl.length > MAX_CANVAS_DATA_CHARS) {
      return null
    }
    const id = `asset_${hashString(`${elementId}:${el.width}x${el.height}:${dataUrl.length}:${dataUrl.slice(0, 96)}:${dataUrl.slice(-96)}`)}`
    return {
      id,
      type: 'image',
      sourceUrl: `canvas:${elementId}`,
      resolvedUrl: dataUrl,
      localPath: `assets/images/${id}.png`,
      mimeType: 'image/png',
      intrinsicWidth: el.width || null,
      intrinsicHeight: el.height || null,
      renderedWidth: el.clientWidth || null,
      renderedHeight: el.clientHeight || null,
      elementIds: [elementId],
      sectionIds: [],
      downloadStatus: 'downloaded',
      failureReason: null,
      licenseReviewRequired: false,
      inlineSvg: null,
      alt: el.getAttribute('aria-label') || 'Captured canvas pixels',
    }
  } catch {
    return null
  }
}
