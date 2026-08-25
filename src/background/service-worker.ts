/**
 * MV3 service worker: lifecycle hooks, message fan-out, and toolbar action that
 * toggles the in-page overlay (or opens the side panel on restricted URLs).
 */
import { purgeStaleScans } from '../storage/indexed-db'
import { routeMessage } from './message-router'
import { createMessage, createRequestId } from '../shared/messages'
import { ensureContentScript, isRestrictedUrl } from './scan-orchestrator'

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

function configureActionClick(): void {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
}

chrome.runtime.onInstalled.addListener(() => {
  configureActionClick()
  void purgeStaleScans()
})

chrome.runtime.onStartup.addListener(() => {
  configureActionClick()
  void purgeStaleScans()
})

configureActionClick()

// ---------------------------------------------------------------------------
// Messaging & action click
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  return routeMessage(message, sender, sendResponse)
})

chrome.action.onClicked.addListener((tab) => {
  void openInspector(tab)
})

async function openInspector(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.id) return
  if (isRestrictedUrl(tab.url)) {
    await chrome.sidePanel.open({ tabId: tab.id })
    return
  }
  try {
    await ensureContentScript(tab.id)
    await chrome.tabs.sendMessage(tab.id, createMessage({ type: 'TOGGLE_OVERLAY', requestId: createRequestId() }))
  } catch {
    await chrome.sidePanel.open({ tabId: tab.id })
  }
}
