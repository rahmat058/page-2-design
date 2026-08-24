import { describe, expect, it } from 'vitest'
import { extraViewportsToCapture, mediaQueryMatchesWidth, scrollPositions, stitchCanvasSize } from '../shared/viewports'
import { mergeFrameScan } from '../normalize/merge-frames'
import { normalizeScan } from '../normalize/normalize-scan'
import { sampleScan } from './fixtures'
import type { CompactFrameScan } from '../shared/types'

describe('viewport helpers', () => {
  it('asks for tablet and mobile when the current width is desktop', () => {
    const extras = extraViewportsToCapture(1280)
    expect(extras.map((item) => item.name)).toEqual(['tablet', 'mobile'])
  })

  it('evaluates min/max-width queries without resizing a window', () => {
    expect(mediaQueryMatchesWidth('(max-width: 720px)', 390)).toBe(true)
    expect(mediaQueryMatchesWidth('(max-width: 720px)', 1280)).toBe(false)
    expect(mediaQueryMatchesWidth('(min-width: 1024px)', 1280)).toBe(true)
  })

  it('builds non-overlapping scroll positions including the last tile', () => {
    expect(scrollPositions(2000, 800, 20000)).toEqual([0, 800, 1200])
    expect(scrollPositions(500, 800, 20000)).toEqual([0])
  })

  it('sizes the stitch canvas in device pixels', () => {
    const size = stitchCanvasSize(390, 24000, 2, 20000)
    expect(size.width).toBe(780)
    expect(size.height).toBe(40000)
    expect(size.truncated).toBe(true)
  })
})

describe('iframe merge', () => {
  it('prefixes frame ids and keeps parent content', () => {
    const frame: CompactFrameScan = {
      href: 'https://widget.example/embed',
      title: 'Embed',
      frameIdHint: '/embed',
      elements: [
        {
          id: 'el_1',
          parentId: null,
          childIndex: 0,
          tagName: 'main',
          attributes: {},
          elementId: null,
          classNames: [],
          role: null,
          visibility: { visible: true },
          bounds: { x: 0, y: 0, width: 100, height: 40 },
          styleSignature: 'x',
          directText: 'Widget',
          sectionId: null,
          assetIds: [],
        },
      ],
      content: [
        {
          id: 'c1',
          kind: 'heading',
          level: 1,
          text: 'Widget',
          href: null,
          elementId: 'el_1',
          sectionId: null,
          order: 0,
        },
      ],
      assets: [],
      colors: [],
      typography: [],
      limitations: [],
    }
    const merged = mergeFrameScan(sampleScan(), frame, 0)
    expect(merged.elements.some((el) => el.id === 'frame1_el_1')).toBe(true)
    expect(merged.content.some((block) => block.text.includes('Widget'))).toBe(true)
  })
})

describe('multi-viewport normalization', () => {
  it('keeps captured snapshots instead of a single-viewport disclaimer', () => {
    const raw = sampleScan()
    raw.viewportSnapshots = [
      {
        name: 'desktop',
        viewportWidth: 1280,
        viewportHeight: 800,
        documentWidth: 1280,
        documentHeight: 1600,
        devicePixelRatio: 1,
        captured: true,
        matchingMedia: [],
        sections: [],
        notes: 'Measured.',
      },
      {
        name: 'mobile',
        viewportWidth: 390,
        viewportHeight: 844,
        documentWidth: 390,
        documentHeight: 2200,
        devicePixelRatio: 2,
        captured: true,
        matchingMedia: ['(max-width: 720px)'],
        sections: [],
        notes: 'Measured.',
      },
    ]
    const design = normalizeScan(raw)
    expect(design.responsive).toHaveLength(2)
    expect(design.limitations.some((item) => item.code === 'SINGLE_VIEWPORT')).toBe(false)
    expect(design.responsive[1]?.matchingMedia).toContain('(max-width: 720px)')
  })
})
