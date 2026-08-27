import { describe, expect, it } from 'vitest'
import { PREVIEW_FRAME_RULE_ID, buildPreviewFrameRule } from '../shared/preview-frame-rule'

describe('preview frame DNR rule', () => {
  it('strips framing headers only for extension-initiated subframes', () => {
    const rule = buildPreviewFrameRule('abcdefghijklmnopqrstuvwxyz', 'staticmania.com')
    expect(rule.id).toBe(PREVIEW_FRAME_RULE_ID)
    expect(rule.condition.resourceTypes).toEqual(['sub_frame'])
    expect(rule.condition.initiatorDomains).toEqual(['abcdefghijklmnopqrstuvwxyz'])
    expect(rule.condition.requestDomains).toEqual(['staticmania.com'])
    const headers = rule.action.responseHeaders ?? []
    expect(headers.map((item) => item.header)).toEqual([
      'x-frame-options',
      'content-security-policy',
      'content-security-policy-report-only',
    ])
    expect(headers.every((item) => item.operation === 'remove')).toBe(true)
  })

  it('omits requestDomains when the tab host is unknown', () => {
    const rule = buildPreviewFrameRule('extid', null)
    expect(rule.condition.requestDomains).toBeUndefined()
  })
})
