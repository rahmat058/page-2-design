/**
 * Computes scan coverage metrics (elements, text, assets, screenshots) and a
 * short human-readable coverage summary for DESIGN.md.
 */
import type { PageScan, ScanCoverage } from '../shared/types'

export function calculateCoverage(
  scan: PageScan,
  extras?: { screenshotAvailable?: boolean; downloadedAssets?: number },
): ScanCoverage {
  const relevantElements = scan.elements.length
  const visibleTextBlocks = scan.content.filter((block) => block.text.trim().length > 0).length
  const discoveredAssets = scan.assets.length
  const downloadedAssets =
    extras?.downloadedAssets ?? scan.assets.filter((a) => a.downloadStatus === 'downloaded').length
  const typographyRecords = scan.elements.filter((el) => el.directText.trim().length > 0).length
  const styledElements = scan.elements.filter((el) => Boolean(el.styleSignature)).length
  const associatedSections = scan.elements.filter((el) => Boolean(el.sectionId)).length
  const screenshotAvailable = extras?.screenshotAvailable ?? scan.coverage.screenshotAvailable

  const notes: string[] = []
  if (discoveredAssets > 0 && downloadedAssets < discoveredAssets) {
    notes.push('Some discovered assets were not downloaded.')
  }
  if (!screenshotAvailable) {
    notes.push('No screenshot is attached to this scan yet.')
  }
  if (scan.lazyLoad.truncated) {
    notes.push('Lazy-load pass was truncated.')
  }

  return {
    relevantElements,
    visibleTextBlocks,
    discoveredAssets,
    downloadedAssets,
    typographyRecords,
    styledElements,
    associatedSections,
    screenshotAvailable,
    notes,
  }
}

export function coverageSummary(coverage: ScanCoverage): string {
  const parts = [
    `${coverage.relevantElements} elements`,
    `${coverage.visibleTextBlocks} text blocks`,
    `${coverage.discoveredAssets} assets`,
    `${coverage.downloadedAssets} downloaded`,
    coverage.screenshotAvailable ? 'screenshot captured' : 'no screenshot',
  ]
  return parts.join(' · ')
}
