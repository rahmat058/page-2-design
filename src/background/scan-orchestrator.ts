import { createMessage, createRequestId, parseMessage } from '../shared/messages'
import { DomainError, serializeError } from '../shared/errors'
import { assembleScan } from '../shared/assemble-scan'
import {
  extraViewportsToCapture,
  matchingMediaAtWidth,
  scrollPositions,
  stitchCanvasSize,
  VIEWPORT_PRESETS,
} from '../shared/viewports'
import { MAX_SCAN_HEIGHT } from '../shared/constants'
import { normalizeScan } from '../normalize/normalize-scan'
import { mergeFrameScan } from '../normalize/merge-frames'
import { calculateCoverage } from '../validation/coverage'
import { putScan, purgeStaleScans } from '../storage/indexed-db'
import type { ExtensionMessage, ScanChunkMessage } from '../shared/messages'
import type { CompactFrameScan, LayoutSnapshot, ScanOptions } from '../shared/types'
import { DEFAULT_SCAN_OPTIONS } from '../shared/types'

const RESTRICTED = /^(chrome|chrome-extension|edge|about|devtools|https:\/\/chrome\.google\.com\/webstore)/i

interface Session {
  scanId: string
  tabId: number
  cancelled: boolean
  chunks: ScanChunkMessage['payload'][]
  options: ScanOptions
}

const sessions = new Map<string, Session>()

export function getSession(scanId: string): Session | undefined {
  return sessions.get(scanId)
}

export function isRestrictedUrl(url: string | undefined): boolean {
  if (!url) return true
  return RESTRICTED.test(url)
}

export async function identifyActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  if (!tab?.id) {
    return { tabId: null, url: null, title: null, hostname: null, restricted: true }
  }
  const url = tab.url ?? null
  let hostname: string | null = null
  try {
    hostname = url ? new URL(url).hostname : null
  } catch {
    hostname = null
  }
  return {
    tabId: tab.id,
    url,
    title: tab.title ?? null,
    hostname,
    restricted: isRestrictedUrl(url ?? undefined),
  }
}

export async function startScan(scanId: string, options: ScanOptions): Promise<void> {
  const tab = await identifyActiveTab()
  if (!tab.tabId) {
    throw new DomainError('NO_ACTIVE_TAB', 'No active tab was found.')
  }
  if (tab.restricted) {
    throw new DomainError('RESTRICTED_URL', 'This page cannot be scanned.')
  }

  sessions.set(scanId, {
    scanId,
    tabId: tab.tabId,
    cancelled: false,
    chunks: [],
    options: { ...DEFAULT_SCAN_OPTIONS, ...options },
  })
  await putScan({
    id: scanId,
    createdAt: Date.now(),
    status: 'preparing',
    raw: null,
    normalized: null,
  })

  await ensureContentScript(tab.tabId)
  await chrome.tabs.sendMessage(
    tab.tabId,
    createMessage({
      type: 'START_SCAN',
      requestId: createRequestId(),
      scanId,
      payload: options,
    }),
  )
}

export async function cancelScan(scanId: string): Promise<void> {
  const session = sessions.get(scanId)
  if (session) {
    session.cancelled = true
    try {
      await chrome.tabs.sendMessage(
        session.tabId,
        createMessage({ type: 'CANCEL_SCAN', requestId: createRequestId(), scanId }),
      )
    } catch {
      /* tab may already be gone */
    }
  }
  await putScan({
    id: scanId,
    createdAt: Date.now(),
    status: 'cancelled',
    raw: null,
    normalized: null,
  })
}

export function acceptChunk(message: ScanChunkMessage): void {
  const session = sessions.get(message.scanId)
  if (!session || session.cancelled) return
  session.chunks.push(message.payload)
}

export async function completeScan(scanId: string): Promise<void> {
  const session = sessions.get(scanId)
  if (!session) {
    throw new DomainError('SCAN_FAILED', 'Scan session was lost.')
  }
  let raw = assembleScan(session.chunks)
  raw = await mergeCrossOriginFrames(session.tabId, raw)
  if (session.options.captureExtraViewports) {
    raw.viewportSnapshots = await captureExtraViewports(
      session.tabId,
      raw.page.viewportWidth,
      raw.mediaQueries.map((item) => item.raw),
    )
  } else {
    raw.viewportSnapshots = [
      {
        name: 'current',
        viewportWidth: raw.page.viewportWidth,
        viewportHeight: raw.page.viewportHeight,
        documentWidth: raw.page.documentWidth,
        documentHeight: raw.page.documentHeight,
        devicePixelRatio: raw.page.devicePixelRatio,
        captured: true,
        matchingMedia: raw.mediaQueries.filter((item) => item.readable).map((item) => item.raw),
        sections: [],
        notes: 'Current viewport only. Extra breakpoint capture was disabled.',
      },
    ]
  }
  raw.coverage = calculateCoverage(raw)
  const normalized = normalizeScan(raw)
  normalized.coverage = calculateCoverage(raw)
  await putScan({
    id: scanId,
    createdAt: Date.now(),
    status: 'ready',
    raw,
    normalized,
  })
  sessions.delete(scanId)
}

export async function captureScreenshots(_scanId: string): Promise<{
  viewport: string | null
  fullPage: string | null
  truncated: boolean
  error: string | null
}> {
  const tab = await identifyActiveTab()
  if (!tab.tabId || tab.restricted) {
    return { viewport: null, fullPage: null, truncated: false, error: 'No capturable tab.' }
  }
  const tabId = tab.tabId
  try {
    await setMotionPaused(tabId, true)
    const metrics = await readScrollMetrics(tabId)
    const windowId = (await chrome.tabs.get(tabId)).windowId
    await scrollTab(tabId, metrics.scrollX, 0)
    await delay(80)
    const viewport = await chrome.tabs.captureVisibleTab(windowId, { format: 'png' })
    const positions = scrollPositions(metrics.scrollHeight, metrics.innerHeight, MAX_SCAN_HEIGHT)
    const tiles: { y: number; dataUrl: string }[] = []
    for (const y of positions) {
      await scrollTab(tabId, metrics.scrollX, y)
      await delay(90)
      tiles.push({ y, dataUrl: await chrome.tabs.captureVisibleTab(windowId, { format: 'png' }) })
    }
    await scrollTab(tabId, metrics.scrollX, metrics.scrollY)
    await setMotionPaused(tabId, false)
    const fullPage = await stitchTiles(tiles, metrics.innerWidth, metrics.scrollHeight, metrics.dpr)
    return {
      viewport,
      fullPage: fullPage.dataUrl,
      truncated: fullPage.truncated,
      error: null,
    }
  } catch (error) {
    try {
      await setMotionPaused(tabId, false)
    } catch {
      /* ignore */
    }
    return {
      viewport: null,
      fullPage: null,
      truncated: false,
      error: error instanceof Error ? error.message : 'Screenshot capture failed.',
    }
  }
}

export async function fetchAssetBytes(
  url: string,
  tabId?: number,
): Promise<{ base64: string | null; mimeType: string | null; error: string | null }> {
  try {
    const response = await fetch(url, { credentials: 'include' })
    if (!response.ok) {
      return fallbackContentFetch(url, tabId, `HTTP ${response.status}`)
    }
    const blob = await response.blob()
    if (blob.size > 8 * 1024 * 1024) {
      return { base64: null, mimeType: blob.type || null, error: 'Asset exceeded 8MB limit' }
    }
    return {
      base64: arrayBufferToBase64(await blob.arrayBuffer()),
      mimeType: blob.type || null,
      error: null,
    }
  } catch {
    return fallbackContentFetch(url, tabId, 'Host fetch failed')
  }
}

async function fallbackContentFetch(
  url: string,
  tabId: number | undefined,
  previous: string,
): Promise<{ base64: string | null; mimeType: string | null; error: string | null }> {
  if (!tabId) return { base64: null, mimeType: null, error: previous }
  try {
    const response = (await chrome.tabs.sendMessage(
      tabId,
      createMessage({
        type: 'FETCH_ASSET',
        requestId: createRequestId(),
        payload: { url },
      }),
    )) as ExtensionMessage | undefined
    if (response?.type === 'ASSET_BYTES' && response.payload.base64) {
      return response.payload
    }
    return {
      base64: null,
      mimeType: null,
      error: response?.type === 'ASSET_BYTES' ? response.payload.error : previous,
    }
  } catch {
    return { base64: null, mimeType: null, error: previous }
  }
}

async function mergeCrossOriginFrames(tabId: number, raw: ReturnType<typeof assembleScan>) {
  const frames = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: () => ({ href: location.href, isTop: window === window.top }),
  })
  let merged = raw
  let index = 0
  for (const frame of frames) {
    if (!frame.result || frame.result.isTop) continue
    try {
      const response = (await chrome.tabs.sendMessage(
        tabId,
        createMessage({ type: 'SCAN_FRAME', requestId: createRequestId() }),
        { frameId: frame.frameId },
      )) as ExtensionMessage | undefined
      const compact =
        response?.type === 'SCAN_FRAME' ? (response.payload?.frame as CompactFrameScan | undefined) : undefined
      if (compact) {
        merged = mergeFrameScan(merged, compact, index)
        index += 1
      }
    } catch {
      merged.limitations.push({
        code: 'CROSS_ORIGIN_IFRAME',
        message: `Could not scan iframe ${frame.result.href}.`,
        severity: 'warning',
      })
    }
  }
  return merged
}

async function captureExtraViewports(
  tabId: number,
  currentWidth: number,
  mediaQueries: string[],
): Promise<LayoutSnapshot[]> {
  const snapshots: LayoutSnapshot[] = []
  const current = await requestLayoutSnapshot(tabId, 'current')
  if (current) snapshots.push(current)

  const extras = extraViewportsToCapture(currentWidth, VIEWPORT_PRESETS)
  for (const preset of extras) {
    snapshots.push({
      name: preset.name,
      viewportWidth: preset.width,
      viewportHeight: preset.height,
      documentWidth: current?.documentWidth ?? preset.width,
      documentHeight: current?.documentHeight ?? 0,
      devicePixelRatio: current?.devicePixelRatio ?? 1,
      captured: true,
      matchingMedia: matchingMediaAtWidth(mediaQueries, preset.width),
      sections: [],
      notes: `Breakpoint inferred at ${preset.width}×${preset.height} from CSS media queries. The browser window was not resized.`,
    })
  }
  return snapshots
}

async function requestLayoutSnapshot(tabId: number, label: string): Promise<LayoutSnapshot | null> {
  try {
    const response = (await chrome.tabs.sendMessage(
      tabId,
      createMessage({
        type: 'LAYOUT_SNAPSHOT',
        requestId: createRequestId(),
        payload: { label },
      }),
    )) as ExtensionMessage | undefined
    return response?.type === 'LAYOUT_SNAPSHOT' ? (response.payload?.snapshot ?? null) : null
  } catch {
    return null
  }
}

async function setMotionPaused(tabId: number, paused: boolean): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (shouldPause: boolean) => {
      const id = 'page2design-pause-motion'
      document.getElementById(id)?.remove()
      if (!shouldPause) return
      const style = document.createElement('style')
      style.id = id
      style.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; }'
      document.documentElement.appendChild(style)
    },
    args: [paused],
  })
}

async function readScrollMetrics(tabId: number) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => ({
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollHeight: document.documentElement.scrollHeight,
      dpr: window.devicePixelRatio || 1,
    }),
  })
  return (
    result?.result ?? {
      scrollX: 0,
      scrollY: 0,
      innerWidth: 1280,
      innerHeight: 720,
      scrollHeight: 720,
      dpr: 1,
    }
  )
}

async function scrollTab(tabId: number, x: number, y: number): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (left: number, top: number) => window.scrollTo(left, top),
    args: [x, y],
  })
}

async function stitchTiles(
  tiles: { y: number; dataUrl: string }[],
  cssWidth: number,
  documentHeight: number,
  dpr: number,
): Promise<{ dataUrl: string | null; truncated: boolean }> {
  const size = stitchCanvasSize(cssWidth, documentHeight, dpr, MAX_SCAN_HEIGHT)
  if (typeof OffscreenCanvas === 'undefined' || tiles.length === 0) {
    return { dataUrl: tiles[0]?.dataUrl ?? null, truncated: size.truncated }
  }
  const canvas = new OffscreenCanvas(size.width, size.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) return { dataUrl: tiles[0]?.dataUrl ?? null, truncated: size.truncated }
  for (const tile of tiles) {
    const blob = await (await fetch(tile.dataUrl)).blob()
    const bitmap = await createImageBitmap(blob)
    ctx.drawImage(bitmap, 0, Math.round(tile.y * dpr))
    bitmap.close()
  }
  const out = await canvas.convertToBlob({ type: 'image/png' })
  return { dataUrl: await blobToDataUrl(out), truncated: size.truncated }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const base64 = arrayBufferToBase64(await blob.arrayBuffer())
  return `data:${blob.type || 'image/png'};base64,${base64}`
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunk = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function ensureContentScript(tabId: number): Promise<void> {
  try {
    const pong = await chrome.tabs.sendMessage(tabId, createMessage({ type: 'PING', requestId: createRequestId() }))
    if (parseMessage(pong)) {
      await injectAllFrames(tabId)
      return
    }
  } catch {
    /* inject */
  }
  await injectAllFrames(tabId)
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const pong = await chrome.tabs.sendMessage(tabId, createMessage({ type: 'PING', requestId: createRequestId() }))
      if (parseMessage(pong)) return
    } catch {
      await delay(100)
    }
  }
  throw new DomainError('INJECTION_FAILED', 'Could not inject the scanner into this tab.')
}

async function injectAllFrames(tabId: number): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ['content.js'],
    })
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js'],
    })
  }
}

export { purgeStaleScans, serializeError }
