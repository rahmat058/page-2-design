/**
 * Pure scan-tree filters. Keep browser chrome, decorative SVG particles, marquee/swiper clones,
 * and opaque embeds out of the element list so the budget reaches header, sections, and footer.
 */

const OPAQUE_EMBED_TAGS = new Set(['iframe', 'video', 'canvas', 'cal-inline'])

export function classNamesOf(el: { getAttribute(name: string): string | null; classList?: DOMTokenList }): string[] {
  try {
    if (el.classList && typeof el.classList.length === 'number') {
      return [...el.classList]
    }
  } catch {
    /* SVGAnimatedString and non-HTML hosts */
  }
  return (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
}

export function isIgnoredHost(opts: {
  id: string | null | undefined
  tagName: string
  attributes?: Record<string, string | null | undefined>
}): boolean {
  const id = (opts.id ?? '').toLowerCase()
  const tag = opts.tagName.toLowerCase()
  if (id.startsWith('page2design-')) return true
  if (id.startsWith('give-freely-root')) return true
  if (id === 'floto-widget-root') return true
  if (id === 'google_input_chext_flag') return true
  if (tag === 'next-route-announcer') return true
  if (opts.attributes?.['data-react-aria-top-layer']) return true
  return false
}

export function isOpaqueEmbedTag(tagName: string): boolean {
  return OPAQUE_EMBED_TAGS.has(tagName.toLowerCase())
}

/** Do not pierce shadow on opaque embeds or hyphenated custom elements (Cal.com, widgets). */
export function skipShadowWalk(tagName: string): boolean {
  const tag = tagName.toLowerCase()
  if (isOpaqueEmbedTag(tag)) return true
  return tag.includes('-')
}

export function isDecorativeSvg(tagName: string, circleCount: number): boolean {
  return tagName.toLowerCase() === 'svg' && circleCount > 12
}

export function isStructuralTag(tagName: string): boolean {
  return /^(header|nav|main|footer|aside|section|article)$/i.test(tagName)
}

/**
 * Hidden non-structural nodes used to flatten children onto the ancestor, which broke nesting.
 * Skip the whole subtree instead, unless the scan opted into hidden landmarks.
 */
export function skipHiddenSubtree(visible: boolean, includeHidden: boolean, structural: boolean): boolean {
  if (visible) return false
  return !(includeHidden && structural)
}

export function isMarqueeClone(
  parentClasses: readonly string[],
  childClasses: readonly string[],
  childIndexAmongKind: number,
): boolean {
  if (parentClasses.includes('rfm-marquee-container')) {
    if (childClasses.includes('rfm-overlay')) return true
    if (childClasses.includes('rfm-marquee') && childIndexAmongKind > 0) return true
  }
  if (
    (parentClasses.includes('rfm-marquee') || parentClasses.includes('rfm-initial-child-container')) &&
    childClasses.includes('rfm-child') &&
    childIndexAmongKind > 0
  ) {
    return true
  }
  return false
}

export function marqueeKindIndex(
  parentClasses: readonly string[],
  childClasses: readonly string[],
  siblingKindIndex: { marquee: number; child: number },
): number {
  if (parentClasses.includes('rfm-marquee-container') && childClasses.includes('rfm-marquee')) {
    return siblingKindIndex.marquee
  }
  if (childClasses.includes('rfm-child')) return siblingKindIndex.child
  return 0
}

/** @returns true when this slide repeats an already-seen `data-swiper-slide-index`. */
export function isSwiperClone(seenIndexes: Set<string>, slideIndex: string | null | undefined): boolean {
  if (slideIndex == null || slideIndex === '') return false
  if (seenIndexes.has(slideIndex)) return true
  seenIndexes.add(slideIndex)
  return false
}
