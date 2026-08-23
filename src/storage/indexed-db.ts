import { DB_NAME, DB_VERSION, INCOMPLETE_SCAN_MS, STALE_SCAN_MS } from '../shared/constants';
import type { NormalizedDesign, PageScan, ScanPhase } from '../shared/types';

export interface ScanRecord {
  id: string;
  createdAt: number;
  status: ScanPhase;
  raw: PageScan | null;
  normalized: NormalizedDesign | null;
}

export interface BlobRecord {
  id: string;
  scanId: string;
  kind: 'screenshot' | 'asset';
  mimeType: string;
  bytes: ArrayBuffer;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('scans')) {
        db.createObjectStore('scans', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('blobs')) {
        const blobs = db.createObjectStore('blobs', { keyPath: 'id' });
        blobs.createIndex('byScan', 'scanId');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function putScan(record: ScanRecord): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('scans', 'readwrite');
  tx.objectStore('scans').put(record);
  await txDone(tx);
}

export async function getScan(id: string): Promise<ScanRecord | null> {
  const db = await openDb();
  const tx = db.transaction('scans', 'readonly');
  const record = await requestToPromise(tx.objectStore('scans').get(id));
  return (record as ScanRecord | undefined) ?? null;
}

export async function putBlob(record: BlobRecord): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('blobs', 'readwrite');
  tx.objectStore('blobs').put(record);
  await txDone(tx);
}

export async function getBlobsForScan(scanId: string): Promise<BlobRecord[]> {
  const db = await openDb();
  const tx = db.transaction('blobs', 'readonly');
  const index = tx.objectStore('blobs').index('byScan');
  const values = await requestToPromise(index.getAll(scanId));
  return (values as BlobRecord[]) ?? [];
}

export async function deleteScanData(scanId: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(['scans', 'blobs'], 'readwrite');
  tx.objectStore('scans').delete(scanId);
  const index = tx.objectStore('blobs').index('byScan');
  const blobs = (await requestToPromise(index.getAll(scanId))) as BlobRecord[];
  for (const blob of blobs) {
    tx.objectStore('blobs').delete(blob.id);
  }
  await txDone(tx);
}

export async function clearAllScans(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(['scans', 'blobs'], 'readwrite');
  tx.objectStore('scans').clear();
  tx.objectStore('blobs').clear();
  await txDone(tx);
}

export async function purgeStaleScans(now = Date.now()): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(['scans', 'blobs'], 'readwrite');
  const scans = (await requestToPromise(tx.objectStore('scans').getAll())) as ScanRecord[];
  for (const scan of scans) {
    const age = now - scan.createdAt;
    const incomplete = scan.status !== 'ready' && scan.status !== 'complete';
    if (age > STALE_SCAN_MS || (incomplete && age > INCOMPLETE_SCAN_MS)) {
      tx.objectStore('scans').delete(scan.id);
      const blobs = (await requestToPromise(
        tx.objectStore('blobs').index('byScan').getAll(scan.id),
      )) as BlobRecord[];
      for (const blob of blobs) {
        tx.objectStore('blobs').delete(blob.id);
      }
    }
  }
  await txDone(tx);
}
