import type { AssetRecord, ScannedElement } from '../shared/types'
import { publicUrlFromAssetPath } from '../export/package-paths'

const VOID_TAGS = new Set(['img', 'input', 'br', 'hr', 'source', 'track', 'embed', 'col', 'area', 'base', 'wbr'])
const OPAQUE_TAGS = new Set(['svg', 'select', 'textarea'])
/** Live media never survives a static rebuild, so the outline emits a still image or a sized box. */
const MEDIA_TAGS = new Set(['video', 'iframe', 'canvas', 'cal-inline'])
/** Build-tool hashes carry no design intent: `css-1x2y3z`, `Hero_root__a1B2`. */
const GENERATED_CLASS = /^(css|sc|jsx|emotion|svelte|v|ng|_)-?[a-z0-9]{5,}$/i
/** CSS modules always include `__` (`inter_tight_…-module__Dyp68G__className`). Do not treat `main-container` or `items-center` as hashes. */
const CSS_MODULE_CLASS = /__/
const MAX_TEXT = 120

export interface OutlineOptions {
  maxNodes?: number
  maxDepth?: number
}

export function buildDomOutline(
  rootId: string,
  elements: ScannedElement[],
  assets: AssetRecord[] = [],
  options: OutlineOptions = {},
): string {
  const maxNodes = options.maxNodes ?? 220
  const maxDepth = options.maxDepth ?? 12
  const byId = new Map(elements.map((el) => [el.id, el]))
  const children = new Map<string, ScannedElement[]>()
  for (const el of elements) {
    if (!el.parentId) continue
    const list = children.get(el.parentId) ?? []
    list.push(el)
    children.set(el.parentId, list)
  }
  for (const list of children.values()) {
    list.sort((a, b) => a.childIndex - b.childIndex || a.bounds.y - b.bounds.y)
  }
  const assetById = new Map(assets.map((asset) => [asset.id, asset]))

  const root = byId.get(rootId)
  if (!root) return ''

  const lines: string[] = []
  let budget = maxNodes
  let truncated = false

  const render = (el: ScannedElement, depth: number): void => {
    if (budget <= 0) {
      truncated = true
      return
    }
    if (!el.visibility.visible) return
    budget -= 1

    const pad = '  '.repeat(depth)
    const tag = el.tagName
    const open = `${pad}<${tag}${attributeText(el, assetById)}`

    if (VOID_TAGS.has(tag)) {
      lines.push(`${open} />`)
      return
    }

    if (MEDIA_TAGS.has(tag)) {
      lines.push(...mediaReplacement(el, pad, assetById))
      return
    }

    const text = el.directText.slice(0, MAX_TEXT)
    if (OPAQUE_TAGS.has(tag)) {
      lines.push(`${open}>…</${tag}>`)
      return
    }

    const kids = children.get(el.id) ?? []
    if (kids.length === 0) {
      lines.push(text ? `${open}>${escapeText(text)}</${tag}>` : `${open}></${tag}>`)
      return
    }
    if (depth >= maxDepth) {
      lines.push(`${open}>…</${tag}>`)
      return
    }

    lines.push(`${open}>`)
    if (text) lines.push(`${pad}  ${escapeText(text)}`)
    for (const kid of kids) render(kid, depth + 1)
    lines.push(`${pad}</${tag}>`)
  }

  render(root, 0)
  if (truncated) lines.push('<!-- outline truncated: see references/layout.json for the rest -->')
  return lines.join('\n')
}

/** Frequent, non-generated class names in a subtree — usually the utility classes to reuse. */
export function utilityClassesFor(elements: ScannedElement[], limit = 28): string[] {
  const counts = new Map<string, number>()
  for (const el of elements) {
    for (const name of meaningfulClasses(el.classNames)) {
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name]) => name)
}

export function meaningfulClasses(classNames: string[]): string[] {
  return (
    classNames
      // Arbitrary Tailwind values get long (`bg-linear-[180deg,rgba(226,232,229,0)_1.44%,#E2E8E5_2.14%]`)
      // and carry exact measurements, so the cap only has to stop runaway generated names.
      .filter((name) => name && name.length <= 140)
      .filter((name) => !GENERATED_CLASS.test(name) && !CSS_MODULE_CLASS.test(name))
  )
}

export function descendantsOf(rootId: string, elements: ScannedElement[]): ScannedElement[] {
  const children = new Map<string, ScannedElement[]>()
  for (const el of elements) {
    if (!el.parentId) continue
    const list = children.get(el.parentId) ?? []
    list.push(el)
    children.set(el.parentId, list)
  }
  const out: ScannedElement[] = []
  const stack = [rootId]
  const seen = new Set<string>()
  while (stack.length > 0) {
    const id = stack.pop()
    if (!id || seen.has(id)) continue
    seen.add(id)
    for (const kid of children.get(id) ?? []) {
      out.push(kid)
      stack.push(kid.id)
    }
  }
  return out
}

/**
 * `<video>`/`<canvas>` become a still `<img>` when pixels were captured; `<iframe>` and
 * `<cal-inline>` never get their inner UI rebuilt — even if a poster was captured.
 * Anything without a usable image becomes a box at the measured size so the surrounding
 * layout keeps its rhythm.
 */
function mediaReplacement(el: ScannedElement, pad: string, assetById: Map<string, AssetRecord>): string[] {
  const tag = el.tagName
  const width = Math.round(el.bounds.width) || null
  const height = Math.round(el.bounds.height) || null
  const classes = meaningfulClasses(el.classNames)
  const classAttr = classes.length > 0 ? ` class="${classes.join(' ')}"` : ''
  const poster = el.assetIds
    .map((id) => assetById.get(id))
    .find((asset) => asset && (asset.type === 'image' || asset.type === 'video-poster'))
  const label = el.attributes.title || el.attributes['aria-label'] || ''
  const source = el.attributes.src ?? ''
  const host = hostname(source)

  if (tag !== 'iframe' && tag !== 'cal-inline' && poster) {
    const alt = poster.alt || label || (tag === 'video' ? 'Video still frame' : 'Canvas graphic')
    const size = [width ? ` width="${width}"` : '', height ? ` height="${height}"` : ''].join('')
    return [
      `${pad}<!-- <${tag}> replaced with a still image; do not autoplay media -->`,
      `${pad}<img${classAttr} src="${publicUrlFromAssetPath(poster.localPath)}"${size} alt="${escapeAttr(alt)}" loading="lazy" />`,
    ]
  }

  const note =
    tag === 'iframe' || tag === 'cal-inline'
      ? `<!-- <${tag}>${host ? ` from ${host}` : ''} — do not rebuild the embedded UI; render this placeholder at the measured size -->`
      : `<!-- <${tag}> had no capturable frame — render this placeholder at the measured size -->`
  const dims = [width ? `width:${width}px` : '', height ? `height:${height}px` : ''].filter(Boolean).join(';')
  const aria = label ? ` aria-label="${escapeAttr(label)}"` : ''
  const dataHost = host ? ` data-embed="${escapeAttr(host)}"` : ''
  return [`${pad}${note}`, `${pad}<div${classAttr}${dataHost}${aria} style="${dims}"></div>`]
}

function hostname(url: string): string {
  if (!url) return ''
  try {
    return new URL(url, 'https://example.invalid').hostname
  } catch {
    return ''
  }
}

function attributeText(el: ScannedElement, assetById: Map<string, AssetRecord>): string {
  const parts: string[] = []
  const classes = meaningfulClasses(el.classNames)
  if (classes.length > 0) parts.push(`class="${classes.join(' ')}"`)

  if (el.tagName === 'img') {
    const asset = el.assetIds.map((id) => assetById.get(id)).find(Boolean)
    if (asset) parts.push(`src="${publicUrlFromAssetPath(asset.localPath)}"`)
    const width = el.bounds.width || null
    const height = el.bounds.height || null
    if (width) parts.push(`width="${Math.round(width)}"`)
    if (height) parts.push(`height="${Math.round(height)}"`)
    const alt = asset?.alt ?? el.attributes.alt ?? ''
    parts.push(`alt="${escapeAttr(alt)}"`)
  }

  const href = el.attributes.href
  if (href && el.tagName === 'a') parts.push(`href="${escapeAttr(href.slice(0, 120))}"`)
  if (el.attributes['aria-label']) parts.push(`aria-label="${escapeAttr(el.attributes['aria-label'])}"`)
  if (el.role) parts.push(`role="${escapeAttr(el.role)}"`)

  return parts.length > 0 ? ` ${parts.join(' ')}` : ''
}

function escapeText(text: string): string {
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttr(value: string): string {
  return value.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
