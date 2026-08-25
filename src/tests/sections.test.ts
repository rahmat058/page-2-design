import { describe, expect, it } from 'vitest'
import { associateSections, detectSections } from '../content/section-detector'
import { buildDomOutline, meaningfulClasses, utilityClassesFor } from '../normalize/dom-outline'
import { collectMediaSubstitutions } from '../normalize/media-substitutions'
import type { ScannedElement } from '../shared/types'

function el(partial: Partial<ScannedElement> & Pick<ScannedElement, 'id' | 'tagName' | 'bounds'>): ScannedElement {
  return {
    parentId: null,
    childIndex: 0,
    attributes: {},
    elementId: null,
    classNames: [],
    role: null,
    visibility: { visible: true },
    styleSignature: 's',
    directText: '',
    sectionId: null,
    assetIds: [],
    ...partial,
  }
}

describe('section detection', () => {
  it('splits a tall main into full-width visual bands', () => {
    const elements = [
      el({ id: 'body', tagName: 'body', bounds: { x: 0, y: 0, width: 1280, height: 1600 } }),
      el({
        id: 'header',
        parentId: 'body',
        tagName: 'header',
        bounds: { x: 0, y: 0, width: 1280, height: 72 },
      }),
      el({
        id: 'main',
        parentId: 'body',
        tagName: 'main',
        bounds: { x: 0, y: 72, width: 1280, height: 1400 },
      }),
      el({
        id: 'hero',
        parentId: 'main',
        tagName: 'div',
        classNames: ['hero'],
        bounds: { x: 0, y: 72, width: 1280, height: 520 },
        directText: 'Build sites',
      }),
      el({
        id: 'features',
        parentId: 'main',
        tagName: 'div',
        bounds: { x: 0, y: 592, width: 1280, height: 420 },
      }),
      el({
        id: 'footer',
        parentId: 'body',
        tagName: 'footer',
        bounds: { x: 0, y: 1012, width: 1280, height: 280 },
      }),
    ]
    const sections = detectSections(elements, { s: { display: 'block' } })
    const names = sections.map((section) => section.name)
    expect(names).toContain('Header')
    expect(names).toContain('Footer')
    expect(sections.some((section) => section.rootElementId === 'main')).toBe(false)
    expect(sections.some((section) => section.rootElementId === 'hero')).toBe(true)
    expect(sections.some((section) => section.rootElementId === 'features')).toBe(true)
  })

  it('assigns elements to the smallest containing region', () => {
    const elements = [
      el({ id: 'main', tagName: 'main', bounds: { x: 0, y: 0, width: 1000, height: 900 } }),
      el({ id: 'hero', parentId: 'main', tagName: 'div', bounds: { x: 0, y: 0, width: 1000, height: 400 } }),
      el({ id: 'features', parentId: 'main', tagName: 'div', bounds: { x: 0, y: 400, width: 1000, height: 400 } }),
      el({
        id: 'h1',
        parentId: 'hero',
        tagName: 'h1',
        bounds: { x: 40, y: 80, width: 400, height: 48 },
        directText: 'Headline',
      }),
    ]
    const sections = detectSections(elements, { s: { display: 'block' } })
    const associated = associateSections(elements, sections)
    const heading = associated.find((item) => item.id === 'h1')
    expect(heading?.sectionId).toBe(sections.find((section) => section.rootElementId === 'hero')?.id)
  })

  it('uses DOM ancestry so an overflowing child still belongs to its own region', () => {
    const elements = [
      el({ id: 'main', tagName: 'main', bounds: { x: 0, y: 0, width: 1000, height: 900 } }),
      el({ id: 'hero', parentId: 'main', tagName: 'div', bounds: { x: 0, y: 0, width: 1000, height: 400 } }),
      el({ id: 'features', parentId: 'main', tagName: 'div', bounds: { x: 0, y: 400, width: 1000, height: 400 } }),
      // A decorative graphic that visually bleeds into the next band.
      el({ id: 'blob', parentId: 'hero', tagName: 'img', bounds: { x: 700, y: 500, width: 260, height: 260 } }),
    ]
    const sections = detectSections(elements, { s: { display: 'block' } })
    const associated = associateSections(elements, sections)
    const blob = associated.find((item) => item.id === 'blob')
    expect(blob?.sectionId).toBe(sections.find((section) => section.rootElementId === 'hero')?.id)
  })
})

describe('dom outline', () => {
  it('emits real tags, class names, text, and image dimensions', () => {
    const elements = [
      el({
        id: 'hero',
        tagName: 'section',
        classNames: [
          'mx-auto',
          'flex',
          'max-w-5xl',
          'main-container',
          'items-center',
          'justify-between',
          'btn-secondary',
          'css-1a2b3c',
          'inter_tight_273d9ea0-module__Dyp68G__className',
        ],
        bounds: { x: 0, y: 0, width: 1000, height: 400 },
      }),
      el({
        id: 'h1',
        parentId: 'hero',
        tagName: 'h1',
        classNames: ['text-[42px]', 'font-bold'],
        bounds: { x: 0, y: 0, width: 600, height: 60 },
        directText: 'Measured design',
      }),
      el({
        id: 'img',
        parentId: 'hero',
        childIndex: 1,
        tagName: 'img',
        classNames: ['rounded-2xl'],
        bounds: { x: 0, y: 80, width: 420, height: 262 },
        assetIds: ['asset_1'],
      }),
    ]
    const outline = buildDomOutline('hero', elements, [
      {
        id: 'asset_1',
        kind: 'image',
        localPath: 'assets/images/asset_1.png',
        alt: 'Hero graphic',
        renderedWidth: 420,
        renderedHeight: 262,
      } as never,
    ])

    expect(outline).toContain(
      '<section class="mx-auto flex max-w-5xl main-container items-center justify-between btn-secondary">',
    )
    expect(outline).not.toContain('css-1a2b3c')
    expect(outline).not.toContain('module__Dyp68G')
    expect(outline).toContain('<h1 class="text-[42px] font-bold">Measured design</h1>')
    expect(outline).toContain('src="/images/asset_1.png"')
    expect(outline).toContain('width="420"')
    expect(outline).toContain('height="262"')
    expect(outline).toContain('alt="Hero graphic"')
    expect(outline.trim().endsWith('</section>')).toBe(true)
  })

  it('keeps project and Tailwind classes while dropping CSS-module hashes', () => {
    expect(
      meaningfulClasses([
        'main-container',
        'items-center',
        'justify-between',
        'btn-secondary',
        'overflow-hidden',
        'text-center',
        'bg-background-8',
        'inter_tight_273d9ea0-module__Dyp68G__className',
        'Hero_root__a1B2',
        'css-1a2b3c',
      ]),
    ).toEqual([
      'main-container',
      'items-center',
      'justify-between',
      'btn-secondary',
      'overflow-hidden',
      'text-center',
      'bg-background-8',
    ])
  })

  it('replaces a video with its captured still image', () => {
    const elements = [
      el({
        id: 'media',
        tagName: 'video',
        classNames: ['w-full', 'rounded-xl'],
        bounds: { x: 0, y: 0, width: 960, height: 540 },
        assetIds: ['asset_poster'],
        attributes: { title: 'Product tour' },
      }),
    ]
    const outline = buildDomOutline('media', elements, [
      { id: 'asset_poster', type: 'video-poster', localPath: 'assets/images/poster.png', alt: 'Product tour' } as never,
    ])

    expect(outline).toContain('<img class="w-full rounded-xl" src="/images/poster.png"')
    expect(outline).toContain('width="960"')
    expect(outline).toContain('height="540"')
    expect(outline).toContain('replaced with a still image')
    // The tag survives only inside the explanatory comment, never as a real element.
    expect(outline).not.toMatch(/^\s*<video[\s>]/m)
  })

  it('replaces an iframe with a sized placeholder instead of rebuilding the embed', () => {
    const elements = [
      el({
        id: 'embed',
        tagName: 'iframe',
        classNames: ['aspect-video'],
        bounds: { x: 0, y: 0, width: 560, height: 315 },
        attributes: { src: 'https://www.youtube.com/embed/abc123', title: 'Demo video' },
      }),
      // Same-origin embeds get scanned, but their interior must never reach the outline.
      el({ id: 'inner', parentId: 'embed', tagName: 'h1', bounds: { x: 0, y: 0, width: 100, height: 20 }, directText: 'Inside embed' }),
    ]
    const outline = buildDomOutline('embed', elements)

    expect(outline).toContain('do not rebuild the embedded UI')
    expect(outline).toContain('data-embed="www.youtube.com"')
    expect(outline).toContain('style="width:560px;height:315px"')
    expect(outline).toContain('aria-label="Demo video"')
    expect(outline).not.toContain('Inside embed')
  })

  it('lists media substitutions with a poster or a placeholder', () => {
    const elements = [
      el({
        id: 'v1',
        tagName: 'video',
        bounds: { x: 0, y: 0, width: 1280, height: 720 },
        assetIds: ['asset_poster'],
      }),
      el({
        id: 'f1',
        tagName: 'iframe',
        bounds: { x: 0, y: 0, width: 560, height: 315 },
        attributes: { src: 'https://player.vimeo.com/video/1' },
      }),
    ]
    const media = collectMediaSubstitutions(elements, [
      { id: 'asset_poster', type: 'video-poster', localPath: 'assets/images/poster.png', alt: '' } as never,
    ])

    expect(media).toHaveLength(2)
    expect(media[0]).toMatchObject({ kind: 'video', posterSrc: '/images/poster.png', aspectRatio: '16/9' })
    expect(media[1]).toMatchObject({ kind: 'iframe', posterSrc: null, origin: 'player.vimeo.com' })
    expect(media[1]?.label).toBe('player.vimeo.com embed')
  })

  it('keeps the full header max-width stack and more than 26 classes', () => {
    const headerClasses = [
      'xl:max-w-[1140px]',
      'lg:max-w-[960px]',
      'md:max-w-[720px]',
      'sm:max-w-[540px]',
      'min-[500px]:max-w-[450px]',
      'min-[425px]:max-w-[375px]',
      'max-w-[350px]',
      'mx-auto',
      'w-full',
      'relative',
      'z-50',
      'flex',
      'items-center',
      'justify-between',
      'px-2.5',
      'xl:py-0',
      'py-2.5',
      'top-5',
      'transition-[max-width]',
      'duration-500',
      'ease-out',
      '2xl:max-w-[1290px]',
      'gap-3',
      'h-16',
      'shrink-0',
      'overflow-hidden',
      'select-none',
      'pointer-events-auto',
    ]
    expect(headerClasses.length).toBeGreaterThan(26)

    const elements = [
      el({
        id: 'header',
        tagName: 'header',
        classNames: ['fixed', 'top-0', 'left-0', 'w-full', 'z-50'],
        bounds: { x: 0, y: 0, width: 1440, height: 80 },
      }),
      el({
        id: 'bar',
        parentId: 'header',
        tagName: 'div',
        classNames: headerClasses,
        bounds: { x: 75, y: 20, width: 1290, height: 56 },
      }),
      el({
        id: 'logo',
        parentId: 'bar',
        tagName: 'a',
        classNames: ['lg:block', 'hidden'],
        bounds: { x: 75, y: 20, width: 198, height: 42 },
        attributes: { href: '/' },
      }),
    ]
    const outline = buildDomOutline('header', elements)

    expect(outline).toContain('<header class="fixed top-0 left-0 w-full z-50">')
    expect(outline).toContain(`<div class="${headerClasses.join(' ')}">`)
    expect(outline).toContain('2xl:max-w-[1290px]')
    expect(outline).toContain('min-[500px]:max-w-[450px]')
    expect(outline).toContain('<a class="lg:block hidden" href="/">')
    expect(outline).not.toContain('<nav')
  })

  it('keeps project container classes such as main-container on sections and footer', () => {
    const section = [
      el({
        id: 'section',
        tagName: 'section',
        classNames: ['xl:py-[156px]', 'relative', 'z-10'],
        bounds: { x: 0, y: 200, width: 1440, height: 640 },
      }),
      el({
        id: 'wrap',
        parentId: 'section',
        tagName: 'div',
        classNames: ['main-container'],
        bounds: { x: 75, y: 200, width: 1290, height: 640 },
      }),
      el({
        id: 'h2',
        parentId: 'wrap',
        tagName: 'h2',
        classNames: ['text-center'],
        bounds: { x: 75, y: 220, width: 680, height: 48 },
        directText: 'How Can We Help You?',
      }),
    ]
    expect(buildDomOutline('section', section)).toContain('<div class="main-container">')
    expect(buildDomOutline('section', section)).toContain('How Can We Help You?')

    const footer = [
      el({
        id: 'footer',
        tagName: 'footer',
        classNames: ['xl:mx-0', 'sm:mx-5', 'mx-3'],
        bounds: { x: 12, y: 4000, width: 1416, height: 520 },
      }),
      el({
        id: 'inner',
        parentId: 'footer',
        tagName: 'div',
        classNames: [
          'main-container',
          'overflow-hidden',
          'relative',
          'sm:rounded-[34px]',
          'rounded-3xl',
          'bg-background-8',
          'md:mb-14',
          'mb-8',
        ],
        bounds: { x: 75, y: 4000, width: 1290, height: 480 },
      }),
    ]
    const footerOutline = buildDomOutline('footer', footer)
    expect(footerOutline).toContain('<footer class="xl:mx-0 sm:mx-5 mx-3">')
    expect(footerOutline).toContain('main-container')
    expect(footerOutline).toContain('bg-background-8')
  })

  it('replaces cal-inline with a sized placeholder even when a poster exists', () => {
    const elements = [
      el({
        id: 'cal',
        tagName: 'cal-inline',
        classNames: ['cal-element-embed-light'],
        bounds: { x: 0, y: 0, width: 960, height: 570 },
        attributes: {
          src: 'https://app.cal.com/staticmania/30min/embed?layout=month_view',
          'data-theme': 'light',
        },
        assetIds: ['asset_cal_poster'],
      }),
      el({
        id: 'inner',
        parentId: 'cal',
        tagName: 'iframe',
        bounds: { x: 0, y: 0, width: 960, height: 570 },
        attributes: { src: 'https://app.cal.com/staticmania/30min/embed' },
      }),
      el({
        id: 'skeleton',
        parentId: 'inner',
        tagName: 'button',
        bounds: { x: 0, y: 0, width: 36, height: 36 },
        directText: 'View next month',
      }),
    ]
    const outline = buildDomOutline('cal', elements, [
      {
        id: 'asset_cal_poster',
        type: 'image',
        localPath: 'assets/images/cal.png',
        alt: 'Calendar',
      } as never,
    ])

    expect(outline).toContain('<!-- <cal-inline>')
    expect(outline).toContain('do not rebuild the embedded UI')
    expect(outline).toContain('data-embed="app.cal.com"')
    expect(outline).toContain('style="width:960px;height:570px"')
    expect(outline).not.toContain('<img')
    expect(outline).not.toContain('View next month')
    expect(outline).not.toMatch(/^\s*<iframe[\s>]/m)

    const media = collectMediaSubstitutions(elements, [
      { id: 'asset_cal_poster', type: 'image', localPath: 'assets/images/cal.png', alt: 'Calendar' } as never,
    ])
    expect(media[0]).toMatchObject({
      kind: 'embed',
      posterSrc: null,
      origin: 'app.cal.com',
      label: 'Calendar embed (app.cal.com)',
    })
  })

  it('ranks the most reused class names first', () => {
    const elements = [
      el({ id: 'a', tagName: 'div', classNames: ['flex', 'gap-4'], bounds: { x: 0, y: 0, width: 10, height: 10 } }),
      el({ id: 'b', tagName: 'div', classNames: ['flex'], bounds: { x: 0, y: 0, width: 10, height: 10 } }),
      el({ id: 'c', tagName: 'div', classNames: ['flex'], bounds: { x: 0, y: 0, width: 10, height: 10 } }),
    ]
    expect(utilityClassesFor(elements)[0]).toBe('flex')
  })
})
