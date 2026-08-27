/**
 * Routes extension messages from the side panel / content scripts to orchestrator
 * actions (scan lifecycle, screenshots, CSS info, overlay/inspect relays).
 */
import { parseMessage, createMessage, createRequestId } from '../shared/messages'
import { userFacingError, serializeError } from '../shared/errors'
import { clearAllScans, getScan } from '../storage/indexed-db'
import {
  acceptChunk,
  cancelScan,
  captureScreenshots,
  completeScan,
  ensureContentScript,
  fetchAssetBytes,
  identifyActiveTab,
  resolveScanTabId,
  slimScanForMessaging,
  startScan,
} from './scan-orchestrator'
import { readTabCssInformation } from './read-tab-css'
import { emptyCssInformation } from '../shared/types'

/** Content → extension broadcasts that only need a sync ack (panel listens too). */
const SYNC_ACK = new Set(['CONTENT_READY', 'SCAN_PROGRESS', 'INSPECT_ELEMENT', 'PONG'])

function safeReply(sendResponse: (response?: unknown) => void, payload: unknown): void {
  try {
    sendResponse(payload)
  } catch {
    /* channel already closed */
  }
}

// ---------------------------------------------------------------------------
// Message dispatch
// ---------------------------------------------------------------------------

export function routeMessage(
  raw: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void,
): boolean {
  const message = parseMessage(raw)
  if (!message) return false

  // Fire-and-forget from content / peers: ack synchronously so Chrome does not
  // wait for an async sendResponse (avoids "message channel closed" spam).
  if (SYNC_ACK.has(message.type)) {
    safeReply(sendResponse, { ok: true })
    return false
  }

  const reply = async () => {
    try {
      switch (message.type) {
        case 'GET_ACTIVE_TAB': {
          const payload = await identifyActiveTab()
          safeReply(sendResponse, createMessage({ type: 'ACTIVE_TAB_INFO', requestId: message.requestId, payload }))
          return
        }
        case 'START_SCAN': {
          await startScan(message.scanId, message.payload)
          safeReply(sendResponse, { ok: true })
          return
        }
        case 'CANCEL_SCAN': {
          await cancelScan(message.scanId)
          safeReply(sendResponse, { ok: true })
          return
        }
        case 'SCAN_CHUNK': {
          acceptChunk(message)
          safeReply(sendResponse, { ok: true })
          return
        }
        case 'SCAN_COMPLETE': {
          if (sender.tab) {
            try {
              await completeScan(message.scanId)
              const record = await getScan(message.scanId)
              void chrome.runtime
                .sendMessage(
                  createMessage({
                    type: 'SCAN_COMPLETE',
                    requestId: createRequestId(),
                    scanId: message.scanId,
                    payload: {
                      counts: {
                        elements: record?.normalized?.coverage.relevantElements ?? message.payload.counts.elements,
                        textBlocks: record?.normalized?.coverage.visibleTextBlocks ?? message.payload.counts.textBlocks,
                        images: record?.normalized?.assets.length ?? message.payload.counts.images,
                        colors: record?.normalized?.tokens.colors.length ?? message.payload.counts.colors,
                        typography: record?.normalized?.tokens.typography.length ?? message.payload.counts.typography,
                      },
                      assembled: true,
                    },
                  }),
                )
                .catch(() => undefined)
            } catch (error) {
              void chrome.runtime
                .sendMessage(
                  createMessage({
                    type: 'SCAN_FAILED',
                    requestId: createRequestId(),
                    scanId: message.scanId,
                    payload: serializeError(error),
                  }),
                )
                .catch(() => undefined)
            }
          }
          safeReply(sendResponse, { ok: true })
          return
        }
        case 'SCAN_FAILED': {
          // Content already broadcast; panel handles store update. Ack only.
          safeReply(sendResponse, { ok: true })
          return
        }
        case 'GET_SCAN': {
          const record = await getScan(message.scanId)
          safeReply(
            sendResponse,
            createMessage({
              type: 'SCAN_RECORD',
              requestId: message.requestId,
              scanId: message.scanId,
              payload: {
                raw: record?.raw ? slimScanForMessaging(record.raw) : null,
                normalized: record?.normalized ?? null,
                phase: record?.status ?? 'idle',
              },
            }),
          )
          return
        }
        case 'CAPTURE_SCREENSHOT': {
          const shot = await captureScreenshots(message.scanId)
          safeReply(
            sendResponse,
            createMessage({
              type: 'SCREENSHOT_RESULT',
              requestId: createRequestId(),
              scanId: message.scanId,
              payload: {
                dataUrl: shot.viewport,
                fullPageDataUrl: shot.fullPage,
                fullPageTruncated: shot.truncated,
                error: shot.error,
              },
            }),
          )
          return
        }
        case 'GET_CSS_INFO': {
          const tabId = await resolveScanTabId(null)
          const payload = tabId != null ? await readTabCssInformation(tabId) : emptyCssInformation()
          safeReply(sendResponse, createMessage({ type: 'CSS_INFO', requestId: message.requestId, payload }))
          return
        }
        case 'FETCH_ASSET': {
          const tabId = await resolveScanTabId(null)
          const result = await fetchAssetBytes(message.payload.url, tabId ?? undefined)
          safeReply(
            sendResponse,
            createMessage({
              type: 'ASSET_BYTES',
              requestId: message.requestId,
              payload: { url: message.payload.url, ...result },
            }),
          )
          return
        }
        case 'CLEAR_SCANS': {
          await clearAllScans()
          safeReply(sendResponse, createMessage({ type: 'SCANS_CLEARED', requestId: message.requestId }))
          return
        }
        case 'HIGHLIGHT_COLOR': {
          const tabId = await resolveScanTabId(null)
          let result: unknown = { ok: true }
          if (tabId) {
            try {
              result = await chrome.tabs.sendMessage(tabId, message)
            } catch {
              result = { ok: false }
            }
          }
          safeReply(sendResponse, result)
          return
        }
        case 'CLOSE_OVERLAY':
        case 'SET_INSPECT_CONTEXT_MENU':
        case 'SET_INSPECT_MODE': {
          const tabId = (await identifyActiveTab()).tabId
          if (tabId) {
            try {
              await ensureContentScript(tabId)
              await chrome.tabs.sendMessage(tabId, message)
            } catch {
              /* tab may not allow content scripts */
            }
          }
          safeReply(sendResponse, { ok: true })
          return
        }
        case 'DOCK_SIDE_PANEL': {
          const tab = await identifyActiveTab()
          if (tab.tabId) {
            await chrome.sidePanel.open({ tabId: tab.tabId })
            try {
              await chrome.tabs.sendMessage(
                tab.tabId,
                createMessage({ type: 'CLOSE_OVERLAY', requestId: createRequestId() }),
              )
            } catch {
              /* overlay may already be closed */
            }
          }
          safeReply(sendResponse, { ok: true })
          return
        }
        case 'TOGGLE_OVERLAY': {
          const tab = await identifyActiveTab()
          if (tab.tabId) {
            await ensureContentScript(tab.tabId)
            await chrome.tabs.sendMessage(tab.tabId, message)
          }
          safeReply(sendResponse, { ok: true })
          return
        }
        default:
          safeReply(sendResponse, { ok: true })
      }
    } catch (error) {
      safeReply(sendResponse, {
        ok: false,
        error: userFacingError(serializeError(error)),
      })
    }
  }

  void reply()
  return true
}
