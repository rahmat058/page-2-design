import type { ClassRecipe, ScannedElement } from '../shared/types'
import { meaningfulClasses } from './dom-outline'

/**
 * Declarations worth reproducing, in the order they read best as CSS. Anything outside this list
 * is noise for a rebuild (transforms, transitions applied per-element, and so on).
 */
const RECIPE_PROPERTIES = [
  'display',
  'position',
  'grid-template-columns',
  'grid-template-rows',
  'flex-direction',
  'flex-wrap',
  'justify-content',
  'align-items',
  'gap',
  'row-gap',
  'column-gap',
  'width',
  'min-width',
  'max-width',
  'height',
  'min-height',
  'max-height',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'background-color',
  'background-image',
  'color',
  'border-width',
  'border-style',
  'border-color',
  'border-radius',
  'box-shadow',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'text-transform',
  'text-align',
  'text-decoration',
  'opacity',
  'overflow',
]

const MAX_DECLARATIONS = 22

/** Variants like `xl:`, `hover:`, `max-[425px]:`, `group-hover:` sit in front of the utility. */
const VARIANT = /^[a-z0-9-]+(-\[[^\]]*\])?:|^\[[^\]]*\]:/i

/** Utilities that stand alone with no value segment. */
const BARE_UTILITIES = new Set([
  'flex',
  'grid',
  'block',
  'inline',
  'inline-flex',
  'inline-block',
  'inline-grid',
  'hidden',
  'table',
  'contents',
  'flow-root',
  'list-item',
  'absolute',
  'relative',
  'fixed',
  'sticky',
  'static',
  'isolate',
  'container',
  'truncate',
  'italic',
  'not-italic',
  'uppercase',
  'lowercase',
  'capitalize',
  'normal-case',
  'underline',
  'overline',
  'line-through',
  'no-underline',
  'antialiased',
  'subpixel-antialiased',
  'visible',
  'invisible',
  'collapse',
  'transform',
  'filter',
  'transition',
  'resize',
  'appearance-none',
  'sr-only',
  'not-sr-only',
  'border',
  'rounded',
  'shadow',
  'ring',
  'outline',
  'blur',
  'grayscale',
  'invert',
  'sepia',
  'overflow-hidden',
  'overflow-auto',
  'overflow-scroll',
  'overflow-visible',
  'shrink',
  'grow',
  'wrap',
  'nowrap',
  'group',
  'peer',
  'dark',
])

const UTILITY_PREFIXES = new Set([
  'p',
  'px',
  'py',
  'pt',
  'pr',
  'pb',
  'pl',
  'ps',
  'pe',
  'm',
  'mx',
  'my',
  'mt',
  'mr',
  'mb',
  'ml',
  'ms',
  'me',
  'w',
  'h',
  'size',
  'min-w',
  'min-h',
  'max-w',
  'max-h',
  'top',
  'right',
  'bottom',
  'left',
  'inset',
  'z',
  'order',
  'basis',
  'grow',
  'shrink',
  'flex',
  'col',
  'row',
  'gap',
  'gap-x',
  'gap-y',
  'space-x',
  'space-y',
  'divide',
  'divide-x',
  'divide-y',
  'justify',
  'items',
  'content',
  'self',
  'place',
  'grid-cols',
  'grid-rows',
  'auto-cols',
  'auto-rows',
  'text',
  'font',
  'leading',
  'tracking',
  'indent',
  'align',
  'whitespace',
  'break',
  'line-clamp',
  'list',
  'bg',
  'from',
  'via',
  'to',
  'fill',
  'stroke',
  'border',
  'rounded',
  'outline',
  'ring',
  'shadow',
  'opacity',
  'mix',
  'blur',
  'backdrop',
  'brightness',
  'contrast',
  'saturate',
  'drop',
  'mask',
  'transition',
  'duration',
  'ease',
  'delay',
  'animate',
  'translate',
  'rotate',
  'scale',
  'skew',
  'origin',
  'cursor',
  'select',
  'resize',
  'scroll',
  'snap',
  'touch',
  'pointer',
  'overflow',
  'overscroll',
  'object',
  'aspect',
  'columns',
  'float',
  'clear',
  'decoration',
  'underline',
  'caret',
  'accent',
  'placeholder',
  'appearance',
  'will',
  'first',
  'last',
  'backdrop-blur',
])

const TAILWIND_PALETTE = new Set([
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
  'white',
  'black',
  'transparent',
  'current',
  'inherit',
  'auto',
  'none',
  'full',
  'screen',
  'min',
  'max',
  'fit',
  'px',
  'reverse',
  'wrap',
  'nowrap',
  'hidden',
  'visible',
  'scroll',
  'clip',
  'cover',
  'contain',
  'center',
  'left',
  'right',
  'start',
  'end',
  'between',
  'around',
  'evenly',
  'top',
  'bottom',
  'middle',
  'baseline',
  'stretch',
  'col',
  'row',
  'normal',
  'bold',
  'medium',
  'semibold',
  'light',
  'thin',
  'extrabold',
  'black',
  'extralight',
  'italic',
  'solid',
  'dashed',
  'dotted',
  'double',
  'wide',
  'wider',
  'widest',
  'tight',
  'tighter',
  'snug',
  'relaxed',
  'loose',
  'first',
  'last',
  'only',
  'both',
  'xs',
  'sm',
  'base',
  'md',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  '5xl',
  '6xl',
  '7xl',
  '8xl',
  '9xl',
])

/**
 * A class the rebuild has to define itself. Two kinds qualify: names that are not utilities at all
 * (`main-container`, `btn-xl`, `card-shadow`) and utility-shaped names whose value is a project theme
 * token rather than a stock scale (`bg-background-9`, `text-heading-1`). Copying either into a fresh
 * Tailwind project produces no styling at all, which is why rebuilds lose containers and buttons.
 */
export function needsOwnCss(className: string): boolean {
  let name = className
  while (VARIANT.test(name)) name = name.replace(VARIANT, '')
  name = name.replace(/!$/, '').replace(/^-/, '')
  if (!name) return false
  // Arbitrary values carry their own measurement, so Tailwind resolves them anywhere.
  if (name.includes('[')) return false
  if (BARE_UTILITIES.has(name)) return false

  const segments = name.split('-')
  for (let take = Math.min(3, segments.length - 1); take >= 1; take -= 1) {
    const prefix = segments.slice(0, take).join('-')
    if (!UTILITY_PREFIXES.has(prefix)) continue
    const value = segments.slice(take).join('-')
    return !isStockValue(value)
  }
  return true
}

function isStockValue(value: string): boolean {
  if (!value) return true
  if (/^\d+(\.\d+)?$/.test(value)) return true
  if (/^\d+\/\d+$/.test(value)) return true
  if (/^#[0-9a-f]{3,8}$/i.test(value)) return true
  const [head, tail] = splitColorScale(value)
  if (TAILWIND_PALETTE.has(head) && (tail === null || /^\d+$/.test(tail))) return true
  return false
}

function splitColorScale(value: string): [string, string | null] {
  const match = /^(.*)-(\d+)$/.exec(value)
  return match ? [match[1] ?? value, match[2] ?? null] : [value, null]
}

export interface RecipeOptions {
  maxClasses?: number
  minUses?: number
}

/**
 * Reconstructs what each project-defined class does by intersecting the measured styles of every
 * element carrying it. A declaration survives only when all users of the class agree on it and it
 * differs from the page-wide default, which leaves the styling the class itself contributes.
 */
export function buildClassRecipes(
  elements: ScannedElement[],
  styleRegistry: Record<string, Record<string, string>>,
  options: RecipeOptions = {},
): ClassRecipe[] {
  const maxClasses = options.maxClasses ?? 60
  const minUses = options.minUses ?? 1
  const baseline = dominantValues(elements, styleRegistry)

  const byClass = new Map<string, ScannedElement[]>()
  for (const el of elements) {
    if (!el.visibility.visible) continue
    for (const name of meaningfulClasses(el.classNames)) {
      if (!needsOwnCss(name)) continue
      const list = byClass.get(name) ?? []
      list.push(el)
      byClass.set(name, list)
    }
  }

  const recipes: ClassRecipe[] = []
  for (const [name, users] of byClass) {
    if (users.length < minUses) continue
    const declarations = intersectStyles(users, styleRegistry, baseline)
    if (Object.keys(declarations).length === 0) continue
    recipes.push({
      className: name,
      uses: users.length,
      sampleTags: [...new Set(users.map((el) => el.tagName))].slice(0, 3),
      declarations,
    })
  }

  return recipes.sort((a, b) => b.uses - a.uses || a.className.localeCompare(b.className)).slice(0, maxClasses)
}

function intersectStyles(
  users: ScannedElement[],
  styleRegistry: Record<string, Record<string, string>>,
  baseline: Map<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {}
  let count = 0
  for (const property of RECIPE_PROPERTIES) {
    if (count >= MAX_DECLARATIONS) break
    let agreed: string | null = null
    let ok = true
    for (const el of users) {
      const value = styleRegistry[el.styleSignature]?.[property]
      if (value === undefined || value === '') {
        ok = false
        break
      }
      if (agreed === null) agreed = value
      else if (agreed !== value) {
        ok = false
        break
      }
    }
    if (!ok || agreed === null) continue
    if (baseline.get(property) === agreed) continue
    if (isNoiseValue(property, agreed)) continue
    out[property] = agreed
    count += 1
  }
  return out
}

function isNoiseValue(property: string, value: string): boolean {
  if (value === 'none' && property !== 'background-image' && property !== 'box-shadow') return true
  if (value === 'normal' || value === 'auto' || value === '0px' || value === 'rgba(0, 0, 0, 0)') return true
  return false
}

/** The value a property takes on most elements — effectively the page default, not a class effect. */
function dominantValues(
  elements: ScannedElement[],
  styleRegistry: Record<string, Record<string, string>>,
): Map<string, string> {
  const counts = new Map<string, Map<string, number>>()
  for (const el of elements) {
    const style = styleRegistry[el.styleSignature]
    if (!style) continue
    for (const property of RECIPE_PROPERTIES) {
      const value = style[property]
      if (value === undefined) continue
      const bucket = counts.get(property) ?? new Map<string, number>()
      bucket.set(value, (bucket.get(value) ?? 0) + 1)
      counts.set(property, bucket)
    }
  }

  const dominant = new Map<string, string>()
  const total = Math.max(elements.length, 1)
  for (const [property, bucket] of counts) {
    const top = [...bucket.entries()].sort((a, b) => b[1] - a[1])[0]
    if (top && top[1] / total > 0.5) dominant.set(property, top[0])
  }
  return dominant
}
