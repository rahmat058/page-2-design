/**
 * Asset preview URLs, byte fetch (page or service worker), and single/zip downloads.
 */
import JSZip from 'jszip'
import type { AssetRecord } from '../shared/types'
import { uniqueVisualAssets } from '../content/asset-scanner'
import { downloadAssets } from '../export/asset-downloader'
import { extensionFromMimeOrUrl, sanitizeFilename } from '../export/filename'
import { createRequestId } from '../shared/messages'
import { sendRuntime } from './chrome-api'

// ---------------------------------------------------------------------------
// Naming & preview
// ---------------------------------------------------------------------------

export function assetDownloadName(asset: AssetRecord): string {
  const ext = asset.inlineSvg ? 'svg' : extensionFromMimeOrUrl(asset.mimeType, asset.resolvedUrl, 'png')
  return `${sanitizeFilename(asset.id, 'asset')}.${ext}`
}

export function assetPreviewUrl(asset: AssetRecord): string | undefined {
  if (asset.inlineSvg) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(asset.inlineSvg)}`
  }
  if (asset.resolvedUrl.startsWith('http') || asset.resolvedUrl.startsWith('data:')) {
    return asset.resolvedUrl
  }
  return undefined
}

export function estimateAssetSize(asset: AssetRecord): string | null {
  if (asset.inlineSvg) return formatBytes(new Blob([asset.inlineSvg]).size)
  if (asset.resolvedUrl.startsWith('data:')) {
    const comma = asset.resolvedUrl.indexOf(',')
    if (comma > 0) return formatBytes(Math.round(((asset.resolvedUrl.length - comma - 1) * 3) / 4))
  }
  return null
}

export function isVisualAsset(asset: AssetRecord): boolean {
  return asset.type !== 'font'
}

// ---------------------------------------------------------------------------
// Fetch & object URLs
// ---------------------------------------------------------------------------

export async function fetchAssetBytes(
  url: string,
): Promise<{ bytes: Uint8Array | null; mimeType: string | null; error: string | null }> {
  if (url.startsWith('data:')) {
    const bytes = dataUrlToBytes(url)
    return { bytes, mimeType: mimeFromDataUrl(url), error: bytes ? null : 'Invalid data URL' }
  }
  try {
    const response = await fetch(url, { credentials: 'include' })
    if (response.ok) {
      const buffer = new Uint8Array(await response.arrayBuffer())
      return { bytes: buffer, mimeType: response.headers.get('content-type'), error: null }
    }
  } catch {
    /* try the service worker next */
  }
  const viaWorker = await sendRuntime({
    type: 'FETCH_ASSET',
    requestId: createRequestId(),
    payload: { url },
  })
  if (viaWorker?.type === 'ASSET_BYTES' && viaWorker.payload.base64) {
    return {
      bytes: base64ToBytes(viaWorker.payload.base64),
      mimeType: viaWorker.payload.mimeType,
      error: null,
    }
  }
  return {
    bytes: null,
    mimeType: null,
    error: viaWorker?.type === 'ASSET_BYTES' ? viaWorker.payload.error : 'Fetch failed',
  }
}

export async function objectUrlForAsset(asset: AssetRecord): Promise<string | null> {
  if (asset.inlineSvg) {
    return URL.createObjectURL(new Blob([asset.inlineSvg], { type: 'image/svg+xml' }))
  }
  if (asset.resolvedUrl.startsWith('data:')) return asset.resolvedUrl
  const result = await fetchAssetBytes(asset.resolvedUrl)
  if (!result.bytes) return null
  const type = result.mimeType || guessMime(asset)
  return URL.createObjectURL(new Blob([result.bytes as BlobPart], { type }))
}

// ---------------------------------------------------------------------------
// Downloads
// ---------------------------------------------------------------------------

export async function downloadSingleAsset(asset: AssetRecord): Promise<void> {
  const filename = assetDownloadName(asset)
  let url: string | null = null
  let revoke: string | null = null
  if (asset.inlineSvg) {
    url = URL.createObjectURL(new Blob([asset.inlineSvg], { type: 'image/svg+xml' }))
    revoke = url
  } else if (asset.resolvedUrl.startsWith('data:')) {
    url = asset.resolvedUrl
  } else {
    url = await objectUrlForAsset(asset)
    if (url && url.startsWith('blob:')) revoke = url
  }
  if (!url) throw new Error('Asset has no downloadable URL.')
  try {
    await chromeDownload(url, filename)
  } catch {
    triggerAnchorDownload(url, filename)
  } finally {
    if (revoke) revokeObjectUrlLater(revoke)
  }
}

export async function downloadAllImagesZip(assets: AssetRecord[], hostname: string | null): Promise<void> {
  const visual = uniqueVisualAssets(assets)
  const { files } = await downloadAssets(visual, new Set(visual.map((asset) => asset.id)), async (url) =>
    fetchAssetBytes(url),
  )
  const zip = new JSZip()
  const folder = zip.folder('images') ?? zip
  for (const [path, bytes] of files) {
    const name = path.split('/').pop() || path
    folder.file(name, bytes)
  }
  if (files.size === 0) throw new Error('No images could be downloaded.')
  const blob = await zip.generateAsync({ type: 'blob' })
  const filename = `${sanitizeFilename(hostname || 'page', 'page')}-images.zip`
  const url = URL.createObjectURL(blob)
  try {
    await chromeDownload(url, filename)
  } catch {
    triggerAnchorDownload(url, filename)
  } finally {
    revokeObjectUrlLater(url)
  }
}

/** Chrome downloads may still read the blob URL after `download()` resolves. */
export function revokeObjectUrlLater(url: string, delayMs = 4000): void {
  setTimeout(() => URL.revokeObjectURL(url), delayMs)
}

// ---------------------------------------------------------------------------
// Binary helpers
// ---------------------------------------------------------------------------

function chromeDownload(url: string, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!chrome.downloads?.download) {
      reject(new Error('Downloads API unavailable'))
      return
    }
    chrome.downloads.download({ url, filename, saveAs: false }, (id) => {
      if (chrome.runtime.lastError || typeof id !== 'number') {
        reject(new Error(chrome.runtime.lastError?.message ?? 'Download failed'))
        return
      }
      resolve()
    })
  })
}

function triggerAnchorDownload(url: string, filename: string): void {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

function dataUrlToBytes(dataUrl: string): Uint8Array | null {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) return null
  const header = dataUrl.slice(0, comma)
  const body = dataUrl.slice(comma + 1)
  try {
    const binary = header.includes(';base64') ? atob(body) : decodeURIComponent(body)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

function mimeFromDataUrl(dataUrl: string): string | null {
  const match = /^data:([^;,]+)/i.exec(dataUrl)
  return match?.[1] ?? null
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function guessMime(asset: AssetRecord): string {
  if (asset.mimeType) return asset.mimeType
  if (asset.type === 'svg' || asset.resolvedUrl.endsWith('.svg')) return 'image/svg+xml'
  return 'application/octet-stream'
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
