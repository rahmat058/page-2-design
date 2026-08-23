import type { PageSection, NormalizedSection, ColorToken, TypographyToken } from '../shared/types';

export function normalizeSections(
  sections: PageSection[],
  colorTokens: ColorToken[],
  typeTokens: TypographyToken[],
): NormalizedSection[] {
  return sections.map((section) => ({
    id: section.id,
    name: section.name,
    nameInferred: section.nameInferred,
    rootElementId: section.rootElementId,
    bounds: section.bounds,
    background: section.background,
    containerWidth: section.containerWidth,
    layoutMode: section.layoutMode,
    contentSummary: section.contentSummary,
    assetIds: section.assetIds,
    colorTokenIds: colorTokens
      .filter((t) => t.elementIds.some((id) => id.startsWith('el_')))
      .slice(0, 8)
      .map((t) => t.id),
    typographyTokenIds: typeTokens.slice(0, 6).map((t) => t.id),
    confidence: section.confidence,
    provenance: section.provenance,
  }));
}
