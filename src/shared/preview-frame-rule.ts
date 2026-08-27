/**
 * Declarative Net Request rule for the Responsive preview iframe.
 * Session rules are installed by the service worker; this builder is pure.
 */
export const PREVIEW_FRAME_RULE_ID = 91001

export function buildPreviewFrameRule(
  initiatorId: string,
  requestHost: string | null,
): chrome.declarativeNetRequest.Rule {
  const condition: chrome.declarativeNetRequest.RuleCondition = {
    initiatorDomains: [initiatorId],
    resourceTypes: ['sub_frame'],
  }
  if (requestHost) condition.requestDomains = [requestHost]
  return {
    id: PREVIEW_FRAME_RULE_ID,
    priority: 1,
    action: {
      type: 'modifyHeaders',
      responseHeaders: [
        { header: 'x-frame-options', operation: 'remove' },
        { header: 'content-security-policy', operation: 'remove' },
        { header: 'content-security-policy-report-only', operation: 'remove' },
      ],
    },
    condition,
  }
}
