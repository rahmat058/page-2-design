import { publicUrlFromAssetPath } from '../export/package-paths'
import { buildDomOutline, utilityClassesFor } from './dom-outline'
import type {
  AssetRecord,
  BoundingBox,
  ContentBlock,
  NormalizedSection,
  PageSection,
  ScannedElement,
  SectionBlock,
  SectionComposition,
  SectionPattern,
  SectionRole,
} from '../shared/types'

export function inferComposition(
  section: PageSection,
  elements: ScannedElement[],
  content: ContentBlock[],
  assets: AssetRecord[],
  styleRegistry: Record<string, Record<string, string>>,
  pageWidth: number,
  sectionIndex: number,
  sectionCount: number,
): SectionComposition {
  const members = elements.filter((el) => el.sectionId === section.id)
  const root = members.find((el) => el.id === section.rootElementId) ?? members[0]
  const style = root ? (styleRegistry[root.styleSignature] ?? {}) : {}
  const blocks = collectBlocks(section, members, content, assets)
  const kids = significantChildren(section, members)
  const geometry = inferGeometry(section, kids, style, pageWidth)
  const role = inferRole(section, blocks, geometry, sectionIndex, sectionCount)
  const pattern = inferPattern(role, geometry, blocks)
  return {
    role,
    roleInferred: true,
    pattern,
    patternInferred: true,
    columns: geometry.columns,
    rows: geometry.rows,
    align: geometry.align,
    display: style.display || section.layoutMode || 'block',
    flexDirection: style['flex-direction'] || '',
    justifyContent: style['justify-content'] || '',
    alignItems: style['align-items'] || '',
    gridTemplateColumns: style['grid-template-columns'] || '',
    gap: style.gap || style['row-gap'] || style['column-gap'] || '',
    textAlign: style['text-align'] || '',
    blocks,
    domOutline: buildDomOutline(section.rootElementId, elements, assets, { maxNodes: 400 }),
    utilityClasses: utilityClassesFor([root, ...members].filter(Boolean) as ScannedElement[]),
  }
}

export function emptyComposition(): SectionComposition {
  return {
    role: 'band',
    roleInferred: true,
    pattern: 'stack',
    patternInferred: true,
    columns: 1,
    rows: 1,
    align: 'start',
    display: 'block',
    flexDirection: '',
    justifyContent: '',
    alignItems: '',
    gridTemplateColumns: '',
    gap: '',
    textAlign: '',
    blocks: [],
    domOutline: '',
    utilityClasses: [],
  }
}

export function sectionComposition(section: { composition?: SectionComposition | null }): SectionComposition {
  const value = section.composition
  if (!value) return emptyComposition()
  return {
    ...emptyComposition(),
    ...value,
    blocks: value.blocks ?? [],
    domOutline: value.domOutline ?? '',
    utilityClasses: value.utilityClasses ?? [],
  }
}

export function nameFromComposition(section: PageSection, composition: SectionComposition): string {
  if (!section.nameInferred && section.name) return section.name
  const heading = composition.blocks.find((block) => block.kind === 'heading' && block.text.trim())
  if (heading) return heading.text.slice(0, 56)
  if (composition.role !== 'band') return titleCase(composition.role.replaceAll('-', ' '))
  return section.name
}

function collectBlocks(
  section: PageSection,
  members: ScannedElement[],
  content: ContentBlock[],
  assets: AssetRecord[],
): SectionBlock[] {
  const memberIds = new Set(members.map((el) => el.id))
  const boundsFor = (elementId: string): BoundingBox =>
    members.find((el) => el.id === elementId)?.bounds ?? section.bounds

  const fromCopy: SectionBlock[] = content
    .filter((block) => block.sectionId === section.id || memberIds.has(block.elementId))
    .slice(0, 36)
    .map((block) => ({
      kind: blockKind(block),
      order: block.order,
      text: (block.text ?? '').slice(0, 180),
      assetId: null,
      publicSrc: null,
      bounds: boundsFor(block.elementId),
    }))

  const fromAssets: SectionBlock[] = assets
    .filter(
      (asset) =>
        asset.sectionIds.includes(section.id) ||
        asset.elementIds.some((id) => memberIds.has(id)) ||
        section.assetIds.includes(asset.id),
    )
    .slice(0, 16)
    .map((asset, index) => ({
      kind: 'image' as const,
      order: 500 + index,
      text: asset.alt || '',
      assetId: asset.id,
      publicSrc: publicUrlFromAssetPath(asset.localPath),
      bounds: {
        x: 0,
        y: 0,
        width: asset.renderedWidth ?? 0,
        height: asset.renderedHeight ?? 0,
      },
    }))

  return [...fromCopy, ...fromAssets].sort((a, b) => a.order - b.order || a.bounds.y - b.bounds.y)
}

function blockKind(block: ContentBlock): SectionBlock['kind'] {
  if (block.kind === 'heading') return 'heading'
  if (block.kind === 'paragraph') return 'paragraph'
  if (block.kind === 'button') return 'cta'
  if (block.kind === 'navigation') return 'nav-item'
  if (block.kind === 'link') return 'link'
  if (block.kind === 'image-alt') return 'image'
  return 'other'
}

function significantChildren(section: PageSection, members: ScannedElement[]): ScannedElement[] {
  const direct = members.filter(
    (el) =>
      el.parentId === section.rootElementId && el.visibility.visible && el.bounds.width >= 48 && el.bounds.height >= 32,
  )
  if (direct.length >= 2) return direct
  return members
    .filter((el) => el.id !== section.rootElementId && el.bounds.width >= 80 && el.bounds.height >= 48)
    .slice(0, 24)
}

interface Geometry {
  columns: number
  rows: number
  align: 'start' | 'center' | 'end'
  similarCells: boolean
  mediaSide: 'left' | 'right' | 'none'
  irregularSizes: boolean
}

function inferGeometry(
  section: PageSection,
  kids: ScannedElement[],
  style: Record<string, string>,
  pageWidth: number,
): Geometry {
  const width = Math.max(section.bounds.width, 1)
  if (kids.length === 0) {
    const textAlign = style['text-align']
    return {
      columns: 1,
      rows: 1,
      align: textAlign === 'center' ? 'center' : textAlign === 'right' ? 'end' : 'start',
      similarCells: false,
      mediaSide: 'none',
      irregularSizes: false,
    }
  }

  const xs = uniqueBuckets(
    kids.map((el) => el.bounds.x),
    48,
  )
  const ys = uniqueBuckets(
    kids.map((el) => el.bounds.y),
    36,
  )
  const widths = kids.map((el) => el.bounds.width)
  const avgW = widths.reduce((sum, w) => sum + w, 0) / widths.length
  const similarCells = widths.every((w) => Math.abs(w - avgW) / Math.max(avgW, 1) < 0.28)
  const irregularSizes = kids.length >= 4 && Math.max(...widths) > Math.min(...widths) * 1.55

  const mid = section.bounds.x + width / 2
  const left = kids.filter((el) => el.bounds.x + el.bounds.width / 2 < mid)
  const right = kids.filter((el) => el.bounds.x + el.bounds.width / 2 >= mid)
  const leftHasMedia = left.some((el) => el.tagName === 'img' || el.assetIds.length > 0)
  const rightHasMedia = right.some((el) => el.tagName === 'img' || el.assetIds.length > 0)
  let mediaSide: Geometry['mediaSide'] = 'none'
  if (xs.length === 2 && ys.length <= 3) {
    if (rightHasMedia && !leftHasMedia) mediaSide = 'right'
    else if (leftHasMedia && !rightHasMedia) mediaSide = 'left'
  }

  const centers = kids.map((el) => el.bounds.x + el.bounds.width / 2)
  const avgCenter = centers.reduce((sum, x) => sum + x, 0) / centers.length
  const pageMid = pageWidth / 2
  let align: Geometry['align'] = 'start'
  if (style['text-align'] === 'center' || style['align-items'] === 'center' || style['justify-content'] === 'center') {
    align = 'center'
  } else if (Math.abs(avgCenter - pageMid) < width * 0.12 && section.bounds.x > pageWidth * 0.12) {
    align = 'center'
  } else if (style['text-align'] === 'right' || style['justify-content']?.includes('end')) {
    align = 'end'
  }

  const gridCols = parseGridColumns(style['grid-template-columns'])
  return {
    columns: gridCols || Math.max(1, xs.length),
    rows: Math.max(1, ys.length),
    align,
    similarCells,
    mediaSide,
    irregularSizes,
  }
}

function inferRole(
  section: PageSection,
  blocks: SectionBlock[],
  geometry: Geometry,
  index: number,
  count: number,
): SectionRole {
  const name = section.name.toLowerCase()
  if (/\b(nav|navbar|menu)\b/.test(name) || (section.provenance === 'semantic' && /nav/.test(name))) return 'nav'
  if (/\b(header|masthead|topbar)\b/.test(name) || /^header$/i.test(section.name)) return 'header'
  if (/\b(footer|colophon)\b/.test(name) || /^footer$/i.test(section.name)) return 'footer'
  if (/\bhero|banner\b/.test(name)) return 'hero'
  if (/\bpricing|plan\b/.test(name)) return 'pricing'
  if (/\bfaq|accordion\b/.test(name)) return 'faq'
  if (/\btestimonial|quote\b/.test(name)) return 'testimonials'
  if (/\bgallery|showcase\b/.test(name)) return 'gallery'

  const headings = blocks.filter((b) => b.kind === 'heading')
  const images = blocks.filter((b) => b.kind === 'image')
  const links = blocks.filter((b) => b.kind === 'link' || b.kind === 'nav-item')
  const ctas = blocks.filter((b) => b.kind === 'cta')

  if (section.bounds.y < 140 && section.bounds.height <= 140 && links.length >= 2) {
    return name.includes('nav') ? 'nav' : 'header'
  }
  if (index >= count - 1 && (links.length >= 5 || (section.bounds.y > 800 && links.length >= 3))) return 'footer'
  if (index <= 2 && section.bounds.height >= 280 && headings.length >= 1 && images.length <= 8) return 'hero'
  if (geometry.columns >= 4 && geometry.rows === 1 && images.length >= 4 && section.bounds.height <= 220)
    return 'logo-row'
  if (geometry.mediaSide !== 'none' && (images.length >= 1 || headings.length >= 1)) return 'split'
  if (geometry.irregularSizes && images.length >= 4) return 'gallery'
  if (geometry.similarCells && geometry.columns >= 2 && (images.length >= 2 || headings.length >= 3)) {
    if (blocks.some((b) => /testimonial|said|quote/i.test(b.text))) return 'testimonials'
    return 'feature-grid'
  }
  if (headings.length >= 4 && images.length <= 1 && section.bounds.width < 900) return 'faq'
  if (ctas.length >= 1 && headings.length <= 2 && blocks.length <= 8 && index > 2) return 'cta'
  return 'band'
}

function inferPattern(role: SectionRole, geometry: Geometry, blocks: SectionBlock[]): SectionPattern {
  if (role === 'header' || role === 'nav') return 'header-bar'
  if (role === 'footer') return geometry.columns >= 3 ? 'footer-columns' : 'stack'
  if (role === 'logo-row') return 'row'
  if (role === 'gallery') return geometry.irregularSizes ? 'masonry' : 'grid'
  if (role === 'feature-grid' || role === 'testimonials' || role === 'pricing') return 'grid'
  if (role === 'faq') return 'accordion-list'
  if (role === 'split' || geometry.mediaSide === 'right')
    return geometry.mediaSide === 'left' ? 'split-media-left' : 'split-media-right'
  if (role === 'hero' && geometry.align === 'center') return 'centered-stack'
  if (role === 'hero') return 'left-stack'
  if (geometry.columns >= 3 && geometry.similarCells) return 'grid'
  if (geometry.columns >= 2 && geometry.rows === 1) return 'row'
  if (geometry.align === 'center') return 'centered-stack'
  if (blocks.some((b) => b.kind === 'heading')) return geometry.align === 'start' ? 'left-stack' : 'stack'
  return 'stack'
}

function parseGridColumns(value: string | undefined): number {
  if (!value || value === 'none') return 0
  const repeat = /repeat\(\s*(\d+)/i.exec(value)
  if (repeat) return Number(repeat[1])
  const parts = value.split(/\s+/).filter((part) => part && part !== '/' && !part.startsWith('['))
  return parts.length > 1 ? parts.length : 0
}

function uniqueBuckets(values: number[], threshold: number): number[] {
  const sorted = [...values].sort((a, b) => a - b)
  const buckets: number[] = []
  for (const value of sorted) {
    const last = buckets[buckets.length - 1]
    if (last == null || Math.abs(value - last) > threshold) buckets.push(value)
  }
  return buckets
}

function titleCase(value: string): string {
  return value.replaceAll('-', ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())
}

export function toNormalizedSection(
  section: PageSection,
  composition: SectionComposition,
  colorTokenIds: string[],
  typographyTokenIds: string[],
): NormalizedSection {
  return {
    id: section.id,
    name: nameFromComposition(section, composition),
    nameInferred: section.nameInferred,
    rootElementId: section.rootElementId,
    bounds: section.bounds,
    background: section.background,
    containerWidth: section.containerWidth,
    layoutMode: section.layoutMode,
    contentSummary: section.contentSummary,
    assetIds: section.assetIds,
    colorTokenIds,
    typographyTokenIds,
    confidence: section.confidence,
    provenance: section.provenance,
    composition,
  }
}
