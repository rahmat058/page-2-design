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

export interface CssInformation {
  styleRules: number
  stylesheetCount: number
  cssBytes: number
  loadTimeMs: number | null
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
  cssInformation: CssInformation
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

export type SectionRole =
  | 'header'
  | 'nav'
  | 'hero'
  | 'logo-row'
  | 'feature-grid'
  | 'split'
  | 'gallery'
  | 'testimonials'
  | 'faq'
  | 'pricing'
  | 'cta'
  | 'footer'
  | 'band'

export type SectionPattern =
  | 'header-bar'
  | 'centered-stack'
  | 'left-stack'
  | 'split-media-right'
  | 'split-media-left'
  | 'grid'
  | 'row'
  | 'masonry'
  | 'accordion-list'
  | 'footer-columns'
  | 'stack'

export interface SectionBlock {
  kind: 'heading' | 'paragraph' | 'cta' | 'link' | 'image' | 'card' | 'nav-item' | 'other'
  order: number
  text: string
  assetId: string | null
  publicSrc: string | null
  bounds: BoundingBox
}

export interface SectionComposition {
  role: SectionRole
  roleInferred: boolean
  pattern: SectionPattern
  patternInferred: boolean
  columns: number
  rows: number
  align: 'start' | 'center' | 'end'
  display: string
  flexDirection: string
  justifyContent: string
  alignItems: string
  gridTemplateColumns: string
  gap: string
  textAlign: string
  blocks: SectionBlock[]
  /** Real captured markup for this region: tags, utility classes, text, images. */
  domOutline: string
  /** Frequent non-generated class names inside this region. */
  utilityClasses: string[]
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
  composition: SectionComposition
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
  cssInformation: CssInformation
  /** Real captured markup for the whole document. */
  documentOutline?: string
  /** Frequent non-generated class names across the page. */
  utilityClasses?: string[]
  /** Media the rebuild must not reproduce live: video, embeds, canvas. */
  media?: MediaSubstitution[]
  /** CSS behind the source project's own class names, so the rebuild can define them. */
  classRecipes?: ClassRecipe[]
}

/**
 * A class name the source page defines itself (`main-container`, `btn-xl`, `bg-background-9`) with the
 * CSS it resolves to, measured from the elements using it. Without these the class names are inert in
 * a fresh project and containers, buttons, and theme colours all collapse to defaults.
 */
export interface ClassRecipe {
  className: string
  /** How many visible elements carry the class. */
  uses: number
  sampleTags: string[]
  declarations: Record<string, string>
}

export type MediaSubstitutionKind = 'video' | 'iframe' | 'canvas' | 'embed'

/** A live-media element and the static stand-in the rebuild should render instead. */
export interface MediaSubstitution {
  elementId: string
  sectionId: string | null
  kind: MediaSubstitutionKind
  bounds: BoundingBox
  /** Public `/images/...` URL of a poster, still frame, or captured pixels, when one exists. */
  posterSrc: string | null
  /** Host of the embed or media source, e.g. `youtube.com`. */
  origin: string | null
  label: string
  aspectRatio: string
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

export function emptyCssInformation(): CssInformation {
  return { styleRules: 0, stylesheetCount: 0, cssBytes: 0, loadTimeMs: null }
}

export function hasCssData(css: CssInformation): boolean {
  return css.styleRules > 0 || css.stylesheetCount > 0 || css.cssBytes > 0 || css.loadTimeMs != null
}
