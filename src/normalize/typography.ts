import type { TypographyToken, TypographyUsage } from '../shared/types';
import { looksProprietaryFont } from '../content/typography-scanner';

export function groupTypography(usages: TypographyUsage[]): TypographyToken[] {
  return usages.map((usage, index) => ({
    id: `type_${index + 1}`,
    name: inferTypeName(usage, index),
    nameInferred: true,
    fontFamily: usage.fontFamily,
    fontSize: usage.fontSize,
    fontWeight: usage.fontWeight,
    fontStyle: usage.fontStyle,
    lineHeight: usage.lineHeight,
    letterSpacing: usage.letterSpacing,
    textTransform: usage.textTransform,
    textDecoration: usage.textDecoration,
    textAlign: usage.textAlign,
    count: usage.count,
    elementIds: usage.elementIds,
    selectors: usage.selectors,
    licenseReviewRequired: looksProprietaryFont(usage.fontFamily),
  }));
}

function inferTypeName(usage: TypographyUsage, index: number): string {
  const size = Number.parseFloat(usage.fontSize);
  const weight = Number.parseInt(usage.fontWeight, 10);
  if (size >= 32 || (weight >= 700 && size >= 24)) return `display-${index + 1}`;
  if (size >= 20) return `heading-${index + 1}`;
  if (size <= 13) return `caption-${index + 1}`;
  return `body-${index + 1}`;
}
