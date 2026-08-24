import { ASSET_FETCH_CONCURRENCY, MAX_ASSET_BYTES, MAX_ASSETS, MAX_TOTAL_ASSET_BYTES } from '../shared/constants'
import type { AssetRecord } from '../shared/types'
import { buildAssetPath, extensionFromMimeOrUrl } from './filename'

export interface FetchedAsset {
  id: string
  bytes: Uint8Array | null
  mimeType: string | null
  error: string | null
}

export type AssetFetchFn = (
  url: string,
) => Promise<{ bytes: Uint8Array | null; mimeType: string | null; error: string | null }>

export async function downloadAssets(
  assets: AssetRecord[],
  selectedIds: Set<string>,
  fetchAsset: AssetFetchFn,
): Promise<{ assets: AssetRecord[]; files: Map<string, Uint8Array> }> {
  const files = new Map<string, Uint8Array>()
  const usedPaths = new Set<string>()
  let totalBytes = 0
  const selected = assets.filter((asset) => selectedIds.has(asset.id)).slice(0, MAX_ASSETS)

  const updated: AssetRecord[] = assets.map((asset) => ({ ...asset }))
  const byId = new Map(updated.map((asset) => [asset.id, asset]))

  const queue = selected.filter((asset) => !asset.inlineSvg && !asset.resolvedUrl.startsWith('data:'))
  for (const asset of selected) {
    const record = byId.get(asset.id)
    if (!record) continue
    record.localPath = buildAssetPath(record.type, record.id, record.mimeType, record.resolvedUrl, usedPaths)
    if (record.inlineSvg) {
      files.set(record.localPath, new TextEncoder().encode(record.inlineSvg))
      record.downloadStatus = 'downloaded'
      record.mimeType = 'image/svg+xml'
    } else if (record.resolvedUrl.startsWith('data:')) {
      const bytes = dataUrlToBytes(record.resolvedUrl)
      if (bytes) {
        files.set(record.localPath, bytes)
        record.downloadStatus = 'downloaded'
        record.failureReason = null
      }
    }
  }

  for (let i = 0; i < queue.length; i += ASSET_FETCH_CONCURRENCY) {
    const batch = queue.slice(i, i + ASSET_FETCH_CONCURRENCY)
    await Promise.all(
      batch.map(async (asset) => {
        const record = byId.get(asset.id)
        if (!record) return
        if (record.resolvedUrl.startsWith('inline:')) return
        const result = await fetchAsset(record.resolvedUrl)
        if (!result.bytes || result.error) {
          record.downloadStatus = 'failed'
          record.failureReason = result.error ?? 'Download failed'
          return
        }
        if (result.bytes.byteLength > MAX_ASSET_BYTES) {
          record.downloadStatus = 'failed'
          record.failureReason = 'Exceeded per-asset size limit'
          return
        }
        if (totalBytes + result.bytes.byteLength > MAX_TOTAL_ASSET_BYTES) {
          record.downloadStatus = 'failed'
          record.failureReason = 'Exceeded total asset budget'
          return
        }
        totalBytes += result.bytes.byteLength
        record.mimeType = result.mimeType ?? record.mimeType
        const ext = extensionFromMimeOrUrl(record.mimeType, record.resolvedUrl, 'bin')
        if (!record.localPath.endsWith(`.${ext}`) && record.type !== 'svg') {
          record.localPath = record.localPath.replace(/\.[a-z0-9]+$/i, `.${ext}`)
        }
        files.set(record.localPath, result.bytes)
        record.downloadStatus = 'downloaded'
        record.failureReason = null
      }),
    )
  }

  for (const asset of updated) {
    if (!selectedIds.has(asset.id) && asset.downloadStatus === 'pending') {
      asset.downloadStatus = 'skipped'
    }
  }

  return { assets: updated, files }
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export function dataUrlToBytes(dataUrl: string): Uint8Array | null {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) return null
  const header = dataUrl.slice(0, comma)
  const body = dataUrl.slice(comma + 1)
  try {
    if (/;base64/i.test(header)) return base64ToBytes(body)
    const decoded = decodeURIComponent(body)
    const bytes = new Uint8Array(decoded.length)
    for (let i = 0; i < decoded.length; i += 1) bytes[i] = decoded.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}
