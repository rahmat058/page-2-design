import type { AssetRecord, ColorToken, ContentBlock, NormalizedSection, TypographyToken } from '../shared/types'

/** Stable empty arrays for Zustand selectors when design is null. */
export const EMPTY_CONTENT: ContentBlock[] = []
export const EMPTY_SECTIONS: NormalizedSection[] = []
export const EMPTY_ASSETS: AssetRecord[] = []
export const EMPTY_COLORS: ColorToken[] = []
export const EMPTY_TYPOGRAPHY: TypographyToken[] = []
