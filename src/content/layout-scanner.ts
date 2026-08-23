import type { InteractionRecord, NumericUsage, ShadowUsage } from '../shared/types';
import { parsePx } from './style-utils';

export function collectNumeric(
  elementId: string,
  style: Record<string, string>,
  spacing: Map<string, NumericUsage>,
  radii: Map<string, NumericUsage>,
  shadows: Map<string, ShadowUsage>,
): void {
  const spacingProps = [
    'margin',
    'margin-top',
    'margin-right',
    'margin-bottom',
    'margin-left',
    'padding',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'gap',
    'row-gap',
    'column-gap',
  ];
  for (const prop of spacingProps) {
    addNumeric(spacing, style[prop], prop, elementId);
  }
  for (const prop of [
    'border-radius',
    'border-top-left-radius',
    'border-top-right-radius',
    'border-bottom-right-radius',
    'border-bottom-left-radius',
  ]) {
    addNumeric(radii, style[prop], prop, elementId);
  }
  addShadow(shadows, style['box-shadow'], 'box-shadow', elementId);
}

function addNumeric(
  bucket: Map<string, NumericUsage>,
  value: string | undefined,
  property: string,
  elementId: string,
): void {
  if (!value || value === '0px' || value === 'normal' || value === 'auto') return;
  const key = `${property}:${value}`;
  const existing = bucket.get(key);
  if (existing) {
    existing.count += 1;
    if (!existing.elementIds.includes(elementId)) existing.elementIds.push(elementId);
    return;
  }
  bucket.set(key, {
    value,
    px: parsePx(value),
    properties: [property],
    count: 1,
    elementIds: [elementId],
  });
}

function addShadow(
  bucket: Map<string, ShadowUsage>,
  value: string | undefined,
  property: string,
  elementId: string,
): void {
  if (!value || value === 'none') return;
  const existing = bucket.get(value);
  if (existing) {
    existing.count += 1;
    if (!existing.elementIds.includes(elementId)) existing.elementIds.push(elementId);
    return;
  }
  bucket.set(value, {
    value,
    count: 1,
    properties: [property],
    elementIds: [elementId],
  });
}

export function collectInteractions(el: Element, elementId: string): InteractionRecord[] {
  const tag = el.tagName.toLowerCase();
  const records: InteractionRecord[] = [];
  if (tag === 'a') {
    records.push({
      elementId,
      kind: 'link',
      trigger: 'click / keyboard',
      notes: `href=${(el as HTMLAnchorElement).href || el.getAttribute('href') || ''}`,
    });
  } else if (tag === 'button' || el.getAttribute('role') === 'button') {
    records.push({
      elementId,
      kind: 'button',
      trigger: 'click / keyboard',
      notes: el.getAttribute('type') || 'button',
    });
  } else if (tag === 'input' || tag === 'textarea' || tag === 'select') {
    records.push({
      elementId,
      kind: 'input',
      trigger: 'focus / input',
      notes: `${tag}${el.getAttribute('type') ? `[type=${el.getAttribute('type')}]` : ''}`,
    });
  } else if (tag === 'summary') {
    records.push({
      elementId,
      kind: 'summary',
      trigger: 'click',
      notes: 'disclosure widget',
    });
  }
  return records;
}

export function numericUsages(bucket: Map<string, NumericUsage>): NumericUsage[] {
  return [...bucket.values()].sort((a, b) => b.count - a.count);
}

export function shadowUsages(bucket: Map<string, ShadowUsage>): ShadowUsage[] {
  return [...bucket.values()].sort((a, b) => b.count - a.count);
}
