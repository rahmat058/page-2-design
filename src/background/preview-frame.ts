/**
 * Session DNR rules so the Responsive preview iframe can load the active tab
 * when the site sends X-Frame-Options or CSP frame-ancestors. Scoped to
 * sub_frame requests initiated by this extension for that host only.
 */
import { PREVIEW_FRAME_RULE_ID, buildPreviewFrameRule } from '../shared/preview-frame-rule'
import { identifyActiveTab } from './scan-orchestrator'

export { PREVIEW_FRAME_RULE_ID, buildPreviewFrameRule }

export async function setPreviewFrameEnabled(enabled: boolean): Promise<void> {
  const dnr = chrome.declarativeNetRequest
  if (!dnr?.updateSessionRules) return

  await dnr.updateSessionRules({ removeRuleIds: [PREVIEW_FRAME_RULE_ID] })
  if (!enabled) return

  const tab = await identifyActiveTab()
  await dnr.updateSessionRules({
    addRules: [buildPreviewFrameRule(chrome.runtime.id, tab.hostname)],
  })
}
