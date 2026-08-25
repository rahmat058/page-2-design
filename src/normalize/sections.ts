/**
 * Attaches composition, token links, and layout metadata to raw page sections
 * to produce NormalizedSection records.
 */
import type {
  AssetRecord,
  ColorToken,
  ContentBlock,
  NormalizedSection,
  PageSection,
  ScannedElement,
  TypographyToken,
} from '../shared/types'
import { inferComposition, toNormalizedSection } from './layout-pattern'

export function normalizeSections(
  sections: PageSection[],
  colorTokens: ColorToken[],
  typeTokens: TypographyToken[],
  elements: ScannedElement[] = [],
  content: ContentBlock[] = [],
  assets: AssetRecord[] = [],
  styleRegistry: Record<string, Record<string, string>> = {},
  pageWidth = 1280,
): NormalizedSection[] {
  return sections.map((section, index) => {
    const members = elements.filter((el) => el.sectionId === section.id)
    const memberIds = new Set(members.map((el) => el.id))
    const composition = inferComposition(
      section,
      elements,
      content,
      assets,
      styleRegistry,
      pageWidth,
      index,
      sections.length,
    )
    const colorTokenIds = colorTokens
      .filter((token) => token.elementIds.some((id) => memberIds.has(id)))
      .slice(0, 8)
      .map((token) => token.id)
    const typographyTokenIds = typeTokens
      .filter((token) => token.elementIds.some((id) => memberIds.has(id)))
      .slice(0, 6)
      .map((token) => token.id)
    return toNormalizedSection(section, composition, colorTokenIds, typographyTokenIds)
  })
}
