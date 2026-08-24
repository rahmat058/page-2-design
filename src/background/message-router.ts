import { parseMessage, createMessage, createRequestId } from '../shared/messages'
import { userFacingError } from '../shared/errors'
import { clearAllScans, getScan } from '../storage/indexed-db'
import {
  acceptChunk,
  cancelScan,
  captureScreenshots,
  completeScan,
  ensureContentScript,
  fetchAssetBytes,
  identifyActiveTab,
  startScan,
} from './scan-orchestrator'

export function routeMessage(
  raw: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void,
): boolean {
  const message = parseMessage(raw)
  if (!message) return false

  const reply = async () => {
    switch (message.type) {
      case 'GET_ACTIVE_TAB': {
        const payload = await identifyActiveTab()
        sendResponse(createMessage({ type: 'ACTIVE_TAB_INFO', requestId: message.requestId, payload }))
        return
      }
      case 'START_SCAN': {
        try {
          await startScan(message.scanId, message.payload)
          sendResponse({ ok: true })
        } catch (error) {
          sendResponse(
            createMessage({
              type: 'SCAN_FAILED',
              requestId: message.requestId,
              scanId: message.scanId,
              payload: {
                code: 'SCAN_FAILED',
                message:
                  error instanceof Error
                    ? error.message
                    : userFacingError({
                        code: 'SCAN_FAILED',
                        message: 'Scan failed',
                        recoverable: true,
                      }),
                recoverable: true,
              },
            }),
          )
        }
        return
      }
      case 'CANCEL_SCAN': {
        await cancelScan(message.scanId)
        sendResponse({ ok: true })
        return
      }
      case 'SCAN_CHUNK': {
        acceptChunk(message)
        sendResponse({ ok: true })
        return
      }
      case 'SCAN_COMPLETE': {
        if (sender.tab) {
          await completeScan(message.scanId)
          const record = await getScan(message.scanId)
          chrome.runtime.sendMessage(
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
        }
        sendResponse({ ok: true })
        return
      }
      case 'GET_SCAN': {
        const record = await getScan(message.scanId)
        sendResponse(
          createMessage({
            type: 'SCAN_RECORD',
            requestId: message.requestId,
            scanId: message.scanId,
            payload: {
              raw: record?.raw ?? null,
              normalized: record?.normalized ?? null,
              phase: record?.status ?? 'idle',
            },
          }),
        )
        return
      }
      case 'CAPTURE_SCREENSHOT': {
        const shot = await captureScreenshots(message.scanId)
        sendResponse(
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
      case 'FETCH_ASSET': {
        const tab = await identifyActiveTab()
        const result = await fetchAssetBytes(message.payload.url, tab.tabId ?? undefined)
        sendResponse(
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
        sendResponse(createMessage({ type: 'SCANS_CLEARED', requestId: message.requestId }))
        return
      }
      case 'HIGHLIGHT_COLOR': {
        const tab = await identifyActiveTab()
        let result: unknown = { ok: true }
        if (tab.tabId) {
          try {
            result = await chrome.tabs.sendMessage(tab.tabId, message)
          } catch {
            result = { ok: false }
          }
        }
        sendResponse(result)
        return
      }
      case 'CLOSE_OVERLAY':
      case 'SET_INSPECT_CONTEXT_MENU':
      case 'SET_INSPECT_MODE': {
        const tab = await identifyActiveTab()
        if (tab.tabId) {
          await chrome.tabs.sendMessage(tab.tabId, message)
        }
        sendResponse({ ok: true })
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
        sendResponse({ ok: true })
        return
      }
      case 'TOGGLE_OVERLAY': {
        const tab = await identifyActiveTab()
        if (tab.tabId) {
          await ensureContentScript(tab.tabId)
          await chrome.tabs.sendMessage(tab.tabId, message)
        }
        sendResponse({ ok: true })
        return
      }
      default:
        return
    }
  }

  void reply()
  return true
}
