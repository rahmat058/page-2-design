import { SCHEMA_VERSION } from './constants'

export type { SCHEMA_VERSION }

export type ScanPhase =
  | 'idle'
  | 'preparing'
  | 'lazy-loading'
  | 'scanning'
  | 'normalizing'
  | 'validating'
  | 'ready'
  | 'exporting'
  | 'complete'
  | 'cancelled'
  | 'failed'

export type ContentScope = 'visible' | 'main'

export interface ScanOptions {
  loadLazyContent: boolean
  contentScope: ContentScope
  includeNavigationAndFooter: boolean
  includeHiddenStructural: boolean
  captureExtraViewports: boolean
  maxScanHeight: number
  maxLazyLoadMs: number
}

export interface ExportOptions {
  includeFailedAssets: boolean
  selectedAssetIds: string[]
  includeScreenshots: boolean
}

export interface PageMetadata {
  url: string
  urlRedacted: boolean
  title: string
  ogTitle: string
  ogImage: string
  ogUrl: string
  language: string
  direction: 'ltr' | 'rtl'
  scannedAt: string
  viewportWidth: number
  viewportHeight: number
  devicePixelRatio: number
  scrollWidth: number
  scrollHeight: number
  documentBackground: string
  colorScheme: 'light' | 'dark' | 'no-preference'
  restoredScrollX: number
  restoredScrollY: number
  hostname: string
}

export interface PageGeometry {
  viewportWidth: number
  viewportHeight: number
  documentWidth: number
  documentHeight: number
  devicePixelRatio: number
}

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface VisibilityInfo {
  visible: boolean
  reason?: string
}

export interface ScannedElement {
  id: string
  parentId: string | null
  childIndex: number
  tagName: string
  attributes: Record<string, string>
  elementId: string | null
  classNames: string[]
  role: string | null
  visibility: VisibilityInfo
  bounds: BoundingBox
  styleSignature: string
  directText: string
  sectionId: string | null
  assetIds: string[]
}

export interface PageSection {
  id: string
  name: string
  nameInferred: boolean
  rootElementId: string
  bounds: BoundingBox
  background: string
  containerWidth: number | null
  layoutMode: string
  contentSummary: string
  assetIds: string[]
  colorValues: string[]
  typographySignatures: string[]
  confidence: number
  provenance: 'semantic' | 'inferred'
}

export type AssetType = 'image' | 'background' | 'icon' | 'svg' | 'video-poster' | 'favicon' | 'font' | 'other'

export type AssetDownloadStatus = 'pending' | 'downloaded' | 'failed' | 'skipped'

export interface AssetRecord {
  id: string
  type: AssetType
  sourceUrl: string
  resolvedUrl: string
  localPath: string
  mimeType: string | null
  intrinsicWidth: number | null
  intrinsicHeight: number | null
  renderedWidth: number | null
  renderedHeight: number | null
  elementIds: string[]
  sectionIds: string[]
  downloadStatus: AssetDownloadStatus
  failureReason: string | null
  licenseReviewRequired: boolean
  inlineSvg: string | null
  alt: string | null
}

export interface ColorUsage {
  original: string[]
  canonicalRgba: string
  canonicalHex: string
  properties: string[]
  count: number
  area?: number
  elementIds: string[]
  source: 'text' | 'background' | 'border' | 'outline' | 'shadow' | 'svg' | 'gradient' | 'pseudo' | 'variable'
}

export interface TypographyUsage {
  signature: string
  fontFamily: string
  fontSize: string
  fontWeight: string
  fontStyle: string
  lineHeight: string
  letterSpacing: string
  fontStretch: string
  textTransform: string
  textDecoration: string
  textAlign: string
  fontFeatureSettings: string
  fontVariationSettings: string
  count: number
  elementIds: string[]
  selectors: string[]
}

export interface NumericUsage {
  value: string
  px: number | null
  properties: string[]
  count: number
  elementIds: string[]
}

export interface ShadowUsage {
  value: string
  count: number
  properties: string[]
  elementIds: string[]
}

export interface CssVariableRecord {
  name: string
  value: string
  source: 'root' | 'element'
  elementId: string | null
}

export interface InteractionRecord {
  elementId: string
  kind: 'link' | 'button' | 'input' | 'summary' | 'other'
  trigger: string
  notes: string
}

export interface ScanLimitation {
  code: string
  message: string
  severity: 'info' | 'warning' | 'error'
  inferred?: boolean
}

export interface ScanCoverage {
  relevantElements: number
  visibleTextBlocks: number
  discoveredAssets: number
  downloadedAssets: number
  typographyRecords: number
  styledElements: number
  associatedSections: number
  screenshotAvailable: boolean
  notes: string[]
}

export interface ContentBlock {
  id: string
  kind:
    | 'heading'
    | 'paragraph'
    | 'list'
    | 'list-item'
    | 'link'
    | 'button'
    | 'navigation'
    | 'label'
    | 'placeholder'
    | 'table'
    | 'image-alt'
    | 'aria'
    | 'other'
  level: number | null
  text: string
  href: string | null
  elementId: string
  sectionId: string | null
  order: number
}

export interface PseudoRecord {
  elementId: string
  pseudo: '::before' | '::after'
  content: string
  bounds: BoundingBox
  styles: Record<string, string>
  colors: string[]
  assetUrls: string[]
}

export interface MediaQueryObservation {
  raw: string
  readable: boolean
  notes: string
}

export interface PageScan {
  schemaVersion: string
  metadata: PageMetadata
  page: PageGeometry
  sections: PageSection[]
  elements: ScannedElement[]
  styleRegistry: Record<string, Record<string, string>>
  assets: AssetRecord[]
  colors: ColorUsage[]
  typography: TypographyUsage[]
  spacing: NumericUsage[]
  radii: NumericUsage[]
  shadows: ShadowUsage[]
  cssVariables: CssVariableRecord[]
  interactions: InteractionRecord[]
  content: ContentBlock[]
  pseudos: PseudoRecord[]
  mediaQueries: MediaQueryObservation[]
  limitations: ScanLimitation[]
  coverage: ScanCoverage
  lazyLoad: {
    attempted: boolean
    truncated: boolean
    reason: string | null
    finalScrollHeight: number
  }
  viewportSnapshots: LayoutSnapshot[]
}

export interface ColorToken {
  id: string
  name: string
  nameInferred: boolean
  hex: string
  rgba: string
  hsl: string
  oklch: string
  original: string[]
  count: number
  area?: number
  properties: string[]
  elementIds: string[]
  role: string
  roleInferred: boolean
  nearDuplicates: string[]
  kind: 'solid' | 'gradient'
  css: string
}

export interface TypographyToken {
  id: string
  name: string
  nameInferred: boolean
  fontFamily: string
  fontSize: string
  fontWeight: string
  fontStyle: string
  lineHeight: string
  letterSpacing: string
  textTransform: string
  textDecoration: string
  textAlign: string
  count: number
  elementIds: string[]
  selectors: string[]
  licenseReviewRequired: boolean
}

export interface DesignToken {
  id: string
  name: string
  nameInferred: boolean
  value: string
  px: number | null
  count: number
  properties: string[]
}

export interface NormalizedSection {
  id: string
  name: string
  nameInferred: boolean
  rootElementId: string
  bounds: BoundingBox
  background: string
  containerWidth: number | null
  layoutMode: string
  contentSummary: string
  assetIds: string[]
  colorTokenIds: string[]
  typographyTokenIds: string[]
  confidence: number
  provenance: 'semantic' | 'inferred'
}

export interface ComponentPattern {
  id: string
  kind: 'button' | 'card' | 'nav-link' | 'input' | 'container' | 'other'
  name: string
  nameInferred: boolean
  confidence: number
  elementIds: string[]
  notes: string
}

export interface ViewportSectionSnapshot {
  id: string
  name: string
  bounds: BoundingBox
  layoutMode: string
  containerWidth: number | null
}

export interface LayoutSnapshot {
  name: string
  viewportWidth: number
  viewportHeight: number
  documentWidth: number
  documentHeight: number
  devicePixelRatio: number
  captured: boolean
  matchingMedia: string[]
  sections: ViewportSectionSnapshot[]
  notes: string
}

export interface CompactFrameScan {
  href: string
  title: string
  frameIdHint: string
  elements: ScannedElement[]
  content: ContentBlock[]
  assets: AssetRecord[]
  colors: ColorUsage[]
  typography: TypographyUsage[]
  limitations: ScanLimitation[]
}

export interface ResponsiveObservation {
  viewportWidth: number
  viewportHeight: number
  captured: boolean
  label?: string
  mediaQueries: MediaQueryObservation[]
  matchingMedia?: string[]
  sections?: ViewportSectionSnapshot[]
  notes: string
}

export interface NormalizedDesign {
  schemaVersion: string
  metadata: PageMetadata
  sections: NormalizedSection[]
  components: ComponentPattern[]
  tokens: {
    colors: ColorToken[]
    typography: TypographyToken[]
    spacing: DesignToken[]
    radii: DesignToken[]
    shadows: DesignToken[]
  }
  assets: AssetRecord[]
  responsive: ResponsiveObservation[]
  content: ContentBlock[]
  limitations: ScanLimitation[]
  coverage: ScanCoverage
  page: PageGeometry
  styleRegistry: Record<string, Record<string, string>>
}

export interface ScanCounts {
  elements: number
  textBlocks: number
  images: number
  colors: number
  typography: number
}

export interface ScanProgress {
  phase: ScanPhase
  completedChunks: number
  totalChunks: number | null
  message: string
  counts: ScanCounts
}

export const DEFAULT_SCAN_OPTIONS: ScanOptions = {
  loadLazyContent: true,
  contentScope: 'visible',
  includeNavigationAndFooter: true,
  includeHiddenStructural: false,
  captureExtraViewports: true,
  maxScanHeight: 20000,
  maxLazyLoadMs: 12000,
}

export function emptyCoverage(): ScanCoverage {
  return {
    relevantElements: 0,
    visibleTextBlocks: 0,
    discoveredAssets: 0,
    downloadedAssets: 0,
    typographyRecords: 0,
    styledElements: 0,
    associatedSections: 0,
    screenshotAvailable: false,
    notes: [],
  }
}

export function emptyCounts(): ScanCounts {
  return { elements: 0, textBlocks: 0, images: 0, colors: 0, typography: 0 }
}
