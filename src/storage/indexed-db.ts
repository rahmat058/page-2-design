import { DB_NAME, DB_VERSION, INCOMPLETE_SCAN_MS, MAX_STORED_SCANS, STALE_SCAN_MS } from '../shared/constants'
import type { AssetRecord, NormalizedDesign, PageScan, ScanPhase } from '../shared/types'

export interface ScanRecord {
  id: string
  createdAt: number
  status: ScanPhase
  raw: PageScan | null
  normalized: NormalizedDesign | null
}

export interface BlobRecord {
  id: string
  scanId: string
  kind: 'screenshot' | 'asset'
  mimeType: string
  bytes: ArrayBuffer
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('scans')) {
        db.createObjectStore('scans', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('blobs')) {
        const blobs = db.createObjectStore('blobs', { keyPath: 'id' })
        blobs.createIndex('byScan', 'scanId')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withDb<T>(fn: (db: IDBDatabase) => Promise<T>): Promise<T> {
  const db = await openDb()
  try {
    return await fn(db)
  } finally {
    db.close()
  }
}

/** Drop heavy duplicates from durable storage; UI keeps in-memory full scan for export. */
export function slimScanForStorage(raw: PageScan): PageScan {
  return {
    ...raw,
    styleRegistry: {},
    assets: raw.assets.map(slimAssetForStorage),
  }
}

function slimAssetForStorage(asset: AssetRecord): AssetRecord {
  let resolvedUrl = asset.resolvedUrl
  let sourceUrl = asset.sourceUrl
  let inlineSvg = asset.inlineSvg
  if (resolvedUrl.startsWith('data:') && resolvedUrl.length > 2048) {
    resolvedUrl = `${resolvedUrl.slice(0, 96)}…`
  }
  if (sourceUrl.startsWith('data:') && sourceUrl.length > 2048) {
    sourceUrl = `${sourceUrl.slice(0, 96)}…`
  }
  if (inlineSvg && inlineSvg.length > 32_000) {
    inlineSvg = `${inlineSvg.slice(0, 512)}…`
  }
  return { ...asset, resolvedUrl, sourceUrl, inlineSvg }
}

export async function putScan(record: ScanRecord): Promise<void> {
  await withDb(async (db) => {
    const stored: ScanRecord = {
      ...record,
      raw: record.raw ? slimScanForStorage(record.raw) : null,
    }
    const tx = db.transaction('scans', 'readwrite')
    tx.objectStore('scans').put(stored)
    await txDone(tx)
  })
  await enforceScanQuota()
}

export async function getScan(id: string): Promise<ScanRecord | null> {
  return withDb(async (db) => {
    const tx = db.transaction('scans', 'readonly')
    const record = await requestToPromise(tx.objectStore('scans').get(id))
    return (record as ScanRecord | undefined) ?? null
  })
}

export async function putBlob(record: BlobRecord): Promise<void> {
  await withDb(async (db) => {
    const tx = db.transaction('blobs', 'readwrite')
    tx.objectStore('blobs').put(record)
    await txDone(tx)
  })
}

export async function getBlobsForScan(scanId: string): Promise<BlobRecord[]> {
  return withDb(async (db) => {
    const tx = db.transaction('blobs', 'readonly')
    const index = tx.objectStore('blobs').index('byScan')
    const values = await requestToPromise(index.getAll(scanId))
    return (values as BlobRecord[]) ?? []
  })
}

export async function deleteScanData(scanId: string): Promise<void> {
  await withDb(async (db) => {
    const tx = db.transaction(['scans', 'blobs'], 'readwrite')
    tx.objectStore('scans').delete(scanId)
    const index = tx.objectStore('blobs').index('byScan')
    const blobs = (await requestToPromise(index.getAll(scanId))) as BlobRecord[]
    for (const blob of blobs) {
      tx.objectStore('blobs').delete(blob.id)
    }
    await txDone(tx)
  })
}

export async function clearAllScans(): Promise<void> {
  await withDb(async (db) => {
    const tx = db.transaction(['scans', 'blobs'], 'readwrite')
    tx.objectStore('scans').clear()
    tx.objectStore('blobs').clear()
    await txDone(tx)
  })
}

export async function purgeStaleScans(now = Date.now()): Promise<void> {
  await withDb(async (db) => {
    const tx = db.transaction(['scans', 'blobs'], 'readwrite')
    const scans = (await requestToPromise(tx.objectStore('scans').getAll())) as ScanRecord[]
    for (const scan of scans) {
      const age = now - scan.createdAt
      const incomplete = scan.status !== 'ready' && scan.status !== 'complete'
      if (age > STALE_SCAN_MS || (incomplete && age > INCOMPLETE_SCAN_MS)) {
        tx.objectStore('scans').delete(scan.id)
        const blobs = (await requestToPromise(tx.objectStore('blobs').index('byScan').getAll(scan.id))) as BlobRecord[]
        for (const blob of blobs) {
          tx.objectStore('blobs').delete(blob.id)
        }
      }
    }
    await txDone(tx)
  })
  await enforceScanQuota()
}

/** Keep only the newest MAX_STORED_SCANS records. */
export async function enforceScanQuota(): Promise<void> {
  await withDb(async (db) => {
    const tx = db.transaction(['scans', 'blobs'], 'readwrite')
    const scans = (await requestToPromise(tx.objectStore('scans').getAll())) as ScanRecord[]
    if (scans.length <= MAX_STORED_SCANS) {
      await txDone(tx)
      return
    }
    scans.sort((a, b) => b.createdAt - a.createdAt)
    const drop = scans.slice(MAX_STORED_SCANS)
    for (const scan of drop) {
      tx.objectStore('scans').delete(scan.id)
      const blobs = (await requestToPromise(tx.objectStore('blobs').index('byScan').getAll(scan.id))) as BlobRecord[]
      for (const blob of blobs) {
        tx.objectStore('blobs').delete(blob.id)
      }
    }
    await txDone(tx)
  })
}
