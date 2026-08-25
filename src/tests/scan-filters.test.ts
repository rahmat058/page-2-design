import { describe, expect, it } from 'vitest'
import {
  isDecorativeSvg,
  isIgnoredHost,
  isMarqueeClone,
  isOpaqueEmbedTag,
  isStructuralTag,
  isSwiperClone,
  skipHiddenSubtree,
  skipShadowWalk,
} from '../content/scan-filters'

describe('scan filters', () => {
  it('skips extension chrome and toast hosts', () => {
    expect(isIgnoredHost({ id: 'page2design-overlay', tagName: 'div' })).toBe(true)
    expect(isIgnoredHost({ id: 'give-freely-root-abc', tagName: 'div' })).toBe(true)
    expect(isIgnoredHost({ id: 'floto-widget-root', tagName: 'div' })).toBe(true)
    expect(isIgnoredHost({ id: 'GOOGLE_INPUT_CHEXT_FLAG', tagName: 'div' })).toBe(true)
    expect(isIgnoredHost({ id: null, tagName: 'next-route-announcer' })).toBe(true)
    expect(isIgnoredHost({ id: null, tagName: 'section', attributes: { 'data-react-aria-top-layer': 'true' } })).toBe(
      true,
    )
    expect(isIgnoredHost({ id: 'site-header', tagName: 'header' })).toBe(false)
  })

  it('treats iframe, video, canvas, and cal-inline as opaque embeds', () => {
    expect(isOpaqueEmbedTag('iframe')).toBe(true)
    expect(isOpaqueEmbedTag('video')).toBe(true)
    expect(isOpaqueEmbedTag('canvas')).toBe(true)
    expect(isOpaqueEmbedTag('cal-inline')).toBe(true)
    expect(isOpaqueEmbedTag('section')).toBe(false)
  })

  it('does not walk shadow on opaque embeds or custom elements', () => {
    expect(skipShadowWalk('cal-inline')).toBe(true)
    expect(skipShadowWalk('iframe')).toBe(true)
    expect(skipShadowWalk('next-route-announcer')).toBe(true)
    expect(skipShadowWalk('header')).toBe(false)
  })

  it('treats dense particle SVGs as decorative', () => {
    expect(isDecorativeSvg('svg', 13)).toBe(true)
    expect(isDecorativeSvg('svg', 12)).toBe(false)
    expect(isDecorativeSvg('div', 40)).toBe(false)
  })

  it('skips hidden non-structural subtrees instead of flattening them', () => {
    expect(skipHiddenSubtree(true, false, false)).toBe(false)
    expect(skipHiddenSubtree(false, false, false)).toBe(true)
    expect(skipHiddenSubtree(false, false, true)).toBe(true)
    expect(skipHiddenSubtree(false, true, true)).toBe(false)
    expect(isStructuralTag('header')).toBe(true)
    expect(isStructuralTag('div')).toBe(false)
  })

  it('keeps the first marquee track and drops clones', () => {
    expect(isMarqueeClone(['rfm-marquee-container'], ['rfm-overlay'], 0)).toBe(true)
    expect(isMarqueeClone(['rfm-marquee-container'], ['rfm-marquee'], 0)).toBe(false)
    expect(isMarqueeClone(['rfm-marquee-container'], ['rfm-marquee'], 1)).toBe(true)
    expect(isMarqueeClone(['rfm-marquee'], ['rfm-child'], 0)).toBe(false)
    expect(isMarqueeClone(['rfm-marquee'], ['rfm-child'], 1)).toBe(true)
  })

  it('keeps the first swiper slide of each index', () => {
    const seen = new Set<string>()
    expect(isSwiperClone(seen, '0')).toBe(false)
    expect(isSwiperClone(seen, '0')).toBe(true)
    expect(isSwiperClone(seen, '1')).toBe(false)
    expect(isSwiperClone(seen, null)).toBe(false)
  })
})
