import type { PageSection, ScannedElement } from '../shared/types';

const SEMANTIC = new Set(['header', 'nav', 'main', 'footer', 'aside', 'section', 'article']);

export function detectSections(
  elements: ScannedElement[],
  styleRegistry: Record<string, Record<string, string>>,
): PageSection[] {
  const byId = new Map(elements.map((el) => [el.id, el]));
  const semantic = elements.filter((el) => SEMANTIC.has(el.tagName) && el.visibility.visible);
  const sections: PageSection[] = [];

  if (semantic.length > 0) {
    for (const el of semantic) {
      sections.push(toSection(el, styleRegistry, 'semantic', 0.9));
    }
  } else {
    const topLevel = elements.filter((el) => {
      if (!el.visibility.visible) return false;
      if (el.parentId === null) return el.tagName === 'body' ? false : true;
      const parent = byId.get(el.parentId);
      return parent?.tagName === 'body';
    });
    const large = topLevel.filter((el) => el.bounds.height >= 80 && el.bounds.width >= 200);
    for (const el of large) {
      sections.push(toSection(el, styleRegistry, 'inferred', 0.55));
    }
  }

  if (sections.length === 0 && elements[0]) {
    sections.push(toSection(elements[0], styleRegistry, 'inferred', 0.3));
  }

  return sections;
}

function toSection(
  el: ScannedElement,
  styleRegistry: Record<string, Record<string, string>>,
  provenance: PageSection['provenance'],
  confidence: number,
): PageSection {
  const style = styleRegistry[el.styleSignature] ?? {};
  const name = suggestedName(el);
  return {
    id: `sec_${el.id}`,
    name,
    nameInferred: provenance === 'inferred' || !SEMANTIC.has(el.tagName),
    rootElementId: el.id,
    bounds: el.bounds,
    background: style['background-color'] ?? 'unknown',
    containerWidth: el.bounds.width || null,
    layoutMode: style.display || 'block',
    contentSummary: el.directText.slice(0, 140) || `${el.tagName} section`,
    assetIds: [...el.assetIds],
    colorValues: [style.color, style['background-color']].filter((v): v is string => Boolean(v)),
    typographySignatures: [el.styleSignature],
    confidence,
    provenance,
  };
}

function suggestedName(el: ScannedElement): string {
  const labeled = el.attributes['aria-label'] || el.elementId || el.classNames[0];
  if (labeled) return labeled;
  switch (el.tagName) {
    case 'header':
      return 'Header';
    case 'nav':
      return 'Navigation';
    case 'main':
      return 'Main';
    case 'footer':
      return 'Footer';
    case 'aside':
      return 'Aside';
    default:
      return `Section ${el.tagName}`;
  }
}

export function associateSections(
  elements: ScannedElement[],
  sections: PageSection[],
): ScannedElement[] {
  const byId = new Map(elements.map((el) => [el.id, el]));
  const descendants = (rootId: string): Set<string> => {
    const set = new Set<string>([rootId]);
    for (const el of elements) {
      let current = el.parentId;
      while (current) {
        if (current === rootId) {
          set.add(el.id);
          break;
        }
        current = byId.get(current)?.parentId ?? null;
      }
    }
    return set;
  };

  const membership = sections.map((section) => ({
    section,
    ids: descendants(section.rootElementId),
  }));
  return elements.map((el) => {
    const match = membership.find((item) => item.ids.has(el.id));
    return { ...el, sectionId: match?.section.id ?? null };
  });
}
