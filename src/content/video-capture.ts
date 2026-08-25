/**
 * Captures a still frame from `<video>` when poster is missing, for rebuild as a static image asset.
 */
import { hashString } from '../shared/utils'
import type { AssetRecord } from '../shared/types'

const MAX_FRAME_DATA_CHARS = 1_500_000
const MAX_FRAME_WIDTH = 1600
const HAVE_CURRENT_DATA = 2

/**
 * A rebuilt page should not autoplay someone else's video, so every `<video>` becomes a still image.
 * Prefer the poster; fall back to the frame on screen. Cross-origin frames taint the canvas and
 * `toDataURL` throws, which is the signal to fall back to a sized placeholder instead.
 */
export function captureVideoFrameAsset(el: HTMLVideoElement, elementId: string): AssetRecord | null {
  try {
    const width = el.videoWidth
    const height = el.videoHeight
    if (!width || !height) return null
    if (el.readyState < HAVE_CURRENT_DATA) return null

    const scale = Math.min(1, MAX_FRAME_WIDTH / width)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(Math.round(width * scale), 1)
    canvas.height = Math.max(Math.round(height * scale), 1)

    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(el, 0, 0, canvas.width, canvas.height)

    const dataUrl = canvas.toDataURL('image/png')
    if (!dataUrl.startsWith('data:image/png') || dataUrl.length > MAX_FRAME_DATA_CHARS) return null

    const id = `asset_${hashString(`${elementId}:${canvas.width}x${canvas.height}:${dataUrl.length}:${dataUrl.slice(0, 96)}:${dataUrl.slice(-96)}`)}`
    return {
      id,
      type: 'video-poster',
      sourceUrl: `video-frame:${elementId}`,
      resolvedUrl: dataUrl,
      localPath: `assets/images/${id}.png`,
      mimeType: 'image/png',
      intrinsicWidth: canvas.width,
      intrinsicHeight: canvas.height,
      renderedWidth: el.clientWidth || null,
      renderedHeight: el.clientHeight || null,
      elementIds: [elementId],
      sectionIds: [],
      downloadStatus: 'downloaded',
      failureReason: null,
      licenseReviewRequired: false,
      inlineSvg: null,
      alt: el.getAttribute('aria-label') || el.getAttribute('title') || 'Video still frame',
    }
  } catch {
    return null
  }
}
