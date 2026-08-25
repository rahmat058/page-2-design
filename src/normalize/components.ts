/**
 * Heuristically clusters scanned elements into reusable component patterns
 * (buttons, cards, nav links, inputs) for the normalized design.
 */
import type { ComponentPattern, ScannedElement } from '../shared/types'

export function inferComponents(
  elements: ScannedElement[],
  styleRegistry: Record<string, Record<string, string>>,
): ComponentPattern[] {
  const patterns: ComponentPattern[] = []

  const buttons = elements.filter(
    (el) =>
      el.tagName === 'button' || el.role === 'button' || (el.tagName === 'a' && looksLikeButton(el, styleRegistry)),
  )
  if (buttons.length >= 1) {
    const grouped = groupBy(
      buttons,
      (el) => `${el.bounds.height}:${styleRegistry[el.styleSignature]?.['border-radius'] ?? ''}`,
    )
    let i = 1
    for (const [, group] of grouped) {
      if (group.length === 0) continue
      patterns.push({
        id: `comp_button_${i}`,
        kind: 'button',
        name: `Button pattern ${i}`,
        nameInferred: true,
        confidence: group.length >= 2 ? 0.7 : 0.45,
        elementIds: group.map((el) => el.id),
        notes: `Observed ${group.length} similar clickable control(s).`,
      })
      i += 1
    }
  }

  const cards = elements.filter((el) => looksLikeCard(el, styleRegistry))
  if (cards.length >= 2) {
    patterns.push({
      id: 'comp_card_1',
      kind: 'card',
      name: 'Card pattern',
      nameInferred: true,
      confidence: 0.6,
      elementIds: cards.map((el) => el.id),
      notes: `Repeated containers with padding, radius, or shadow (${cards.length}).`,
    })
  }

  const navLinks = elements.filter((el) => el.tagName === 'a' && el.sectionId?.includes('nav'))
  if (navLinks.length >= 2) {
    patterns.push({
      id: 'comp_nav_1',
      kind: 'nav-link',
      name: 'Navigation links',
      nameInferred: true,
      confidence: 0.65,
      elementIds: navLinks.map((el) => el.id),
      notes: 'Repeated links associated with a navigation section.',
    })
  }

  const inputs = elements.filter((el) => ['input', 'textarea', 'select'].includes(el.tagName))
  if (inputs.length >= 1) {
    patterns.push({
      id: 'comp_input_1',
      kind: 'input',
      name: 'Form controls',
      nameInferred: true,
      confidence: 0.8,
      elementIds: inputs.map((el) => el.id),
      notes: 'Native form controls. Values were not captured.',
    })
  }

  return patterns
}

function looksLikeButton(el: ScannedElement, styleRegistry: Record<string, Record<string, string>>): boolean {
  const style = styleRegistry[el.styleSignature]
  if (!style) return false
  const radius = style['border-radius']
  const padding = style.padding
  return Boolean(
    radius && radius !== '0px' && padding && padding !== '0px' && el.bounds.height >= 28 && el.bounds.height <= 64,
  )
}

function looksLikeCard(el: ScannedElement, styleRegistry: Record<string, Record<string, string>>): boolean {
  const style = styleRegistry[el.styleSignature]
  if (!style) return false
  const shadow = style['box-shadow']
  const radius = style['border-radius']
  const padding = style.padding
  return (
    el.bounds.width >= 180 &&
    el.bounds.height >= 120 &&
    Boolean((shadow && shadow !== 'none') || (radius && radius !== '0px')) &&
    Boolean(padding && padding !== '0px')
  )
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const key = keyFn(item)
    const list = map.get(key) ?? []
    list.push(item)
    map.set(key, list)
  }
  return map
}
