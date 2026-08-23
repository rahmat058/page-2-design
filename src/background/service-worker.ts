import { purgeStaleScans } from '../storage/indexed-db';
import { routeMessage } from './message-router';
import { createMessage, createRequestId } from '../shared/messages';
import { ensureContentScript, isRestrictedUrl } from './scan-orchestrator';

function configureActionClick(): void {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
}

chrome.runtime.onInstalled.addListener(() => {
  configureActionClick();
  void purgeStaleScans();
});

chrome.runtime.onStartup.addListener(() => {
  configureActionClick();
  void purgeStaleScans();
});

configureActionClick();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  return routeMessage(message, sender, sendResponse);
});

chrome.action.onClicked.addListener((tab) => {
  void openInspector(tab);
});

async function openInspector(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.id) return;
  if (isRestrictedUrl(tab.url)) {
    await chrome.sidePanel.open({ tabId: tab.id });
    return;
  }
  try {
    await ensureContentScript(tab.id);
    await chrome.tabs.sendMessage(
      tab.id,
      createMessage({ type: 'TOGGLE_OVERLAY', requestId: createRequestId() }),
    );
  } catch {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
}
