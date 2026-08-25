import type { BoundingBox, PageSection, ScannedElement } from '../shared/types'

const SEMANTIC = new Set(['header', 'nav', 'main', 'footer', 'aside', 'section', 'article'])
const LANDMARK_ROLES = new Set(['banner', 'navigation', 'main', 'contentinfo', 'complementary'])
const SKIP_TAGS = new Set(['html', 'head', 'body', 'script', 'style', 'link', 'meta'])
const MAX_SECTIONS = 28

export function detectSections(
  elements: ScannedElement[],
  styleRegistry: Record<string, Record<string, string>>,
): PageSection[] {
  const byId = new Map(elements.map((el) => [el.id, el]))
  const visible = elements.filter(
    (el) => el.visibility.visible && el.bounds.width >= 40 && el.bounds.height >= 24 && !SKIP_TAGS.has(el.tagName),
  )

  const collected: PageSection[] = []
  const used = new Set<string>()

  const push = (el: ScannedElement, provenance: PageSection['provenance'], confidence: number) => {
    if (used.has(el.id)) return
    used.add(el.id)
    collected.push(toSection(el, styleRegistry, provenance, confidence))
  }

  for (const el of visible) {
    if (isHeader(el) || isNav(el) || isFooter(el) || el.tagName === 'aside' || el.role === 'complementary') {
      push(el, SEMANTIC.has(el.tagName) || LANDMARK_ROLES.has(el.role ?? '') ? 'semantic' : 'inferred', 0.9)
    }
  }

  const wrappers = visible.filter((el) => isMain(el) || el.tagName === 'section' || el.tagName === 'article')
  const roots = wrappers.filter((el) => isMain(el))
  const splitRoots = roots.length > 0 ? roots : wrappers.length > 0 ? wrappers : bodyChildren(visible, byId)

  for (const root of splitRoots) {
    const bands = visualBands(root, visible, byId)
    if (bands.length >= 2) {
      used.add(root.id)
      for (const band of bands) {
        const semantic = SEMANTIC.has(band.tagName)
        push(band, semantic ? 'semantic' : 'inferred', semantic ? 0.85 : 0.62)
      }
    } else if (!used.has(root.id)) {
      push(root, SEMANTIC.has(root.tagName) ? 'semantic' : 'inferred', SEMANTIC.has(root.tagName) ? 0.9 : 0.5)
    }
  }

  for (const el of visible) {
    if (el.tagName !== 'section' && el.tagName !== 'article') continue
    if (used.has(el.id)) continue
    if (collected.some((section) => iou(section.bounds, el.bounds) > 0.72)) continue
    push(el, 'semantic', 0.8)
  }

  if (collected.length === 0 && visible[0]) {
    push(visible[0], 'inferred', 0.3)
  }

  return dedupeSections(collected)
    .sort((a, b) => a.bounds.y - b.bounds.y || a.bounds.x - b.bounds.x)
    .slice(0, MAX_SECTIONS)
}

/** Ancestry beats geometry here: absolute and overlapping elements break bounds-based matching. */
export function associateSections(elements: ScannedElement[], sections: PageSection[]): ScannedElement[] {
  const sectionByRoot = new Map(sections.map((section) => [section.rootElementId, section.id]))
  const parentOf = new Map(elements.map((el) => [el.id, el.parentId]))
  const resolved = new Map<string, string | null>()

  const resolve = (startId: string): string | null => {
    const chain: string[] = []
    let current: string | null = startId
    let found: string | null = null
    while (current) {
      if (resolved.has(current)) {
        found = resolved.get(current) ?? null
        break
      }
      const direct = sectionByRoot.get(current)
      if (direct) {
        found = direct
        break
      }
      chain.push(current)
      current = parentOf.get(current) ?? null
    }
    for (const id of chain) resolved.set(id, found)
    return found
  }

  return elements.map((el) => ({ ...el, sectionId: resolve(el.id) }))
}

function visualBands(
  root: ScannedElement,
  visible: ScannedElement[],
  byId: Map<string, ScannedElement>,
): ScannedElement[] {
  const container = unwrap(root, visible)
  const children = visible
    .filter((el) => el.parentId === container.id)
    .sort((a, b) => a.bounds.y - b.bounds.y || a.childIndex - b.childIndex)

  if (children.length < 2) return [root]

  const rows = clusterRows(children, 28)
  const bands: ScannedElement[] = []
  let index = 0
  while (index < rows.length) {
    const row = rows[index]!
    if (isFullWidthSingle(row, container)) {
      bands.push(row[0]!)
      index += 1
      continue
    }
    const group: ScannedElement[] = []
    while (index < rows.length && !isFullWidthSingle(rows[index]!, container)) {
      group.push(...rows[index]!)
      index += 1
    }
    if (group.length === 0) continue
    const wrapper = commonParent(group, byId) ?? container
    if (wrapper.id !== root.id && wrapper.id !== container.id && !bands.includes(wrapper)) {
      bands.push(wrapper)
    } else {
      const largest = [...group].sort((a, b) => area(b.bounds) - area(a.bounds))[0]
      if (largest) bands.push(largest)
    }
  }

  const unique = uniqueById(bands).filter((el) => el.id !== root.id)
  return unique.length >= 2 ? unique : [root]
}

function unwrap(root: ScannedElement, visible: ScannedElement[]): ScannedElement {
  let current = root
  for (let i = 0; i < 6; i += 1) {
    const kids = visible.filter((el) => el.parentId === current.id)
    if (kids.length !== 1) return current
    const only = kids[0]!
    const fills = only.bounds.height >= current.bounds.height * 0.72 && only.bounds.width >= current.bounds.width * 0.72
    if (!fills) return current
    current = only
  }
  return current
}

function isFullWidthSingle(row: ScannedElement[], container: ScannedElement): boolean {
  if (row.length !== 1) return false
  const item = row[0]!
  return item.bounds.width >= container.bounds.width * 0.58 && item.bounds.height >= 72
}

function clusterRows(items: ScannedElement[], threshold: number): ScannedElement[][] {
  const sorted = [...items].sort((a, b) => a.bounds.y - b.bounds.y)
  const rows: ScannedElement[][] = []
  for (const item of sorted) {
    const last = rows[rows.length - 1]
    if (last && Math.abs(item.bounds.y - last[0]!.bounds.y) <= threshold) {
      last.push(item)
    } else {
      rows.push([item])
    }
  }
  return rows
}

function bodyChildren(visible: ScannedElement[], byId: Map<string, ScannedElement>): ScannedElement[] {
  return visible.filter((el) => {
    if (el.bounds.height < 80 || el.bounds.width < 200) return false
    const parent = el.parentId ? byId.get(el.parentId) : null
    return !parent || parent.tagName === 'body'
  })
}

function isHeader(el: ScannedElement): boolean {
  return el.tagName === 'header' || el.role === 'banner'
}

function isNav(el: ScannedElement): boolean {
  return el.tagName === 'nav' || el.role === 'navigation'
}

function isFooter(el: ScannedElement): boolean {
  return el.tagName === 'footer' || el.role === 'contentinfo'
}

function isMain(el: ScannedElement): boolean {
  return el.tagName === 'main' || el.role === 'main'
}

function toSection(
  el: ScannedElement,
  styleRegistry: Record<string, Record<string, string>>,
  provenance: PageSection['provenance'],
  confidence: number,
): PageSection {
  const style = styleRegistry[el.styleSignature] ?? {}
  return {
    id: `sec_${el.id}`,
    name: suggestedName(el),
    nameInferred: provenance === 'inferred' || !SEMANTIC.has(el.tagName),
    rootElementId: el.id,
    bounds: el.bounds,
    background: style['background-color'] ?? 'unknown',
    containerWidth: el.bounds.width || null,
    layoutMode: style.display || 'block',
    contentSummary: el.directText.slice(0, 140) || `${el.tagName} region at y=${el.bounds.y}`,
    assetIds: [...el.assetIds],
    colorValues: [style.color, style['background-color']].filter((v): v is string => Boolean(v)),
    typographySignatures: [el.styleSignature],
    confidence,
    provenance,
  }
}

function suggestedName(el: ScannedElement): string {
  const labeled = el.attributes['aria-label'] || el.elementId
  if (labeled) return labeled
  if (el.tagName === 'header' || el.role === 'banner') return 'Header'
  if (el.tagName === 'nav' || el.role === 'navigation') return 'Navigation'
  if (el.tagName === 'main' || el.role === 'main') return 'Main'
  if (el.tagName === 'footer' || el.role === 'contentinfo') return 'Footer'
  if (el.tagName === 'aside') return 'Aside'
  const classHint = el.classNames.find((name) =>
    /hero|header|footer|nav|feature|pricing|faq|gallery|testimonial/i.test(name),
  )
  if (classHint) return classHint
  return `Region y=${el.bounds.y}`
}

function dedupeSections(sections: PageSection[]): PageSection[] {
  const kept: PageSection[] = []
  const ranked = [...sections].sort((a, b) => b.confidence - a.confidence || area(a.bounds) - area(b.bounds))
  for (const section of ranked) {
    if (kept.some((item) => iou(item.bounds, section.bounds) > 0.82)) continue
    kept.push(section)
  }
  return kept
}

function commonParent(items: ScannedElement[], byId: Map<string, ScannedElement>): ScannedElement | null {
  const first = items[0]
  if (!first?.parentId) return null
  const parentId = first.parentId
  if (items.every((item) => item.parentId === parentId)) return byId.get(parentId) ?? null
  return null
}

function uniqueById(items: ScannedElement[]): ScannedElement[] {
  const seen = new Set<string>()
  const out: ScannedElement[] = []
  for (const item of items) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    out.push(item)
  }
  return out
}

function area(box: BoundingBox): number {
  return Math.max(1, box.width) * Math.max(1, box.height)
}

function iou(a: BoundingBox, b: BoundingBox): number {
  const x = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
  const y = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))
  const inter = x * y
  if (inter <= 0) return 0
  return inter / (area(a) + area(b) - inter)
}
