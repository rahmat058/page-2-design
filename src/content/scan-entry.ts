import { parseMessage, createMessage, createRequestId } from '../shared/messages'
import type { ScanOptions } from '../shared/types'
import { DEFAULT_SCAN_OPTIONS } from '../shared/types'
import { DomainError, serializeError } from '../shared/errors'
import { captureLayoutSnapshot } from './layout-snapshot'
import { runFrameScan, runPageScan } from './scan-page'
import { resolveUrl } from './asset-scanner'
import { closeOverlay, toggleOverlay } from './overlay-host'
import { highlightColorOnPage, setInspectContextMenu, setInspectMode } from './inspect-mode'

declare const self: Window & typeof globalThis & { __PAGE2DESIGN_INJECTED__?: boolean }

if (!self.__PAGE2DESIGN_INJECTED__) {
  self.__PAGE2DESIGN_INJECTED__ = true
  init()
}

function init(): void {
  let cancelled = false
  let busy = false

  chrome.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
    const message = parseMessage(raw)
    if (!message) return false

    if (message.type === 'PING') {
      sendResponse(createMessage({ type: 'PONG', requestId: message.requestId }))
      return false
    }

    if (message.type === 'TOGGLE_OVERLAY') {
      toggleOverlay()
      sendResponse({ ok: true })
      return false
    }

    if (message.type === 'CLOSE_OVERLAY') {
      closeOverlay()
      setInspectMode(false)
      sendResponse({ ok: true })
      return false
    }

    if (message.type === 'SET_INSPECT_MODE') {
      setInspectMode(Boolean(message.payload.enabled), message.payload.contextMenu)
      sendResponse({ ok: true })
      return false
    }

    if (message.type === 'SET_INSPECT_CONTEXT_MENU') {
      setInspectContextMenu(Boolean(message.payload.enabled))
      sendResponse({ ok: true })
      return false
    }

    if (message.type === 'HIGHLIGHT_COLOR') {
      const result = highlightColorOnPage(message.payload)
      sendResponse(
        createMessage({
          type: 'HIGHLIGHT_COLOR_RESULT',
          requestId: message.requestId,
          payload: result,
        }),
      )
      return false
    }

    if (message.type === 'CANCEL_SCAN') {
      cancelled = true
      sendResponse({ ok: true })
      return false
    }

    if (message.type === 'FETCH_ASSET') {
      void fetchAsset(message.payload.url).then((payload) => {
        sendResponse(
          createMessage({
            type: 'ASSET_BYTES',
            requestId: message.requestId,
            payload,
          }),
        )
      })
      return true
    }

    if (message.type === 'LAYOUT_SNAPSHOT') {
      sendResponse(
        createMessage({
          type: 'LAYOUT_SNAPSHOT',
          requestId: message.requestId,
          payload: {
            label: message.payload.label,
            snapshot: captureLayoutSnapshot(message.payload.label),
          },
        }),
      )
      return false
    }

    if (message.type === 'SCAN_FRAME') {
      if (window === window.top) {
        sendResponse({ ok: false })
        return false
      }
      void (async () => {
        try {
          const frame = await runFrameScan()
          sendResponse(
            createMessage({
              type: 'SCAN_FRAME',
              requestId: message.requestId,
              payload: { frame },
            }),
          )
        } catch {
          sendResponse({ ok: false })
        }
      })()
      return true
    }

    if (message.type === 'START_SCAN') {
      if (window !== window.top) {
        return false
      }
      if (busy) {
        sendResponse({ ok: false, error: 'Scan already running' })
        return false
      }
      cancelled = false
      busy = true
      const options: ScanOptions = { ...DEFAULT_SCAN_OPTIONS, ...message.payload }
      const scanId = message.scanId
      void (async () => {
        try {
          const scan = await runPageScan(
            options,
            {
              send: (msg) => {
                void chrome.runtime.sendMessage(msg)
              },
              cancelled: () => cancelled,
            },
            scanId,
          )
          chrome.runtime.sendMessage(
            createMessage({
              type: 'SCAN_COMPLETE',
              requestId: createRequestId(),
              scanId,
              payload: {
                counts: {
                  elements: scan.elements.length,
                  textBlocks: scan.content.length,
                  images: scan.assets.length,
                  colors: scan.colors.length,
                  typography: scan.typography.length,
                },
                assembled: false,
              },
            }),
          )
        } catch (error) {
          const serialized = serializeError(
            error instanceof DomainError ? error : new DomainError('SCAN_FAILED', 'Page scan failed.'),
          )
          chrome.runtime.sendMessage(
            createMessage({
              type: 'SCAN_FAILED',
              requestId: createRequestId(),
              scanId,
              payload: serialized,
            }),
          )
        } finally {
          busy = false
        }
      })()
      sendResponse({ ok: true })
      return false
    }

    return false
  })

  chrome.runtime.sendMessage(createMessage({ type: 'CONTENT_READY', requestId: createRequestId() }))
}

async function fetchAsset(url: string): Promise<{
  url: string
  mimeType: string | null
  base64: string | null
  error: string | null
}> {
  const resolved = resolveUrl(url)
  try {
    const response = await fetch(resolved, { credentials: 'omit' })
    if (!response.ok) {
      return { url: resolved, mimeType: null, base64: null, error: `HTTP ${response.status}` }
    }
    const blob = await response.blob()
    if (blob.size > 8 * 1024 * 1024) {
      return {
        url: resolved,
        mimeType: blob.type || null,
        base64: null,
        error: 'Asset exceeded 8MB limit',
      }
    }
    const buffer = await blob.arrayBuffer()
    return {
      url: resolved,
      mimeType: blob.type || null,
      base64: arrayBufferToBase64(buffer),
      error: null,
    }
  } catch (error) {
    return {
      url: resolved,
      mimeType: null,
      base64: null,
      error: error instanceof Error ? error.message : 'Fetch failed',
    }
  }
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
