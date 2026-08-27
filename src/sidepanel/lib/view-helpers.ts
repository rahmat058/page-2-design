/**
 * PageHead title / count mapping for the active panel view.
 */
import { uniqueVisualAssets } from '../../content/asset-scanner'
import type { NormalizedDesign, ScanCounts } from '../../shared/types'
import { panelContentBlocks } from '../content-groups'
import { layoutItemCount } from './layout-tokens'
import type { PanelView } from '../store/useScanStore'

export function headingFor(view: PanelView | string): string {
  if (view === 'design-system' || view === 'colors') return 'Design System'
  if (view === 'typography') return 'Typography'
  if (view === 'assets' || view === 'images' || view === 'icons') return 'Assets'
  if (view === 'export') return 'Export'
  if (view === 'content') return 'Content'
  if (view === 'responsive') return 'Responsive'
  if (view === 'layout') return 'Layout'
  if (view === 'generate-md') return 'Generate Markdown'
  if (view === 'developer') return 'Developer'
  return 'Overview'
}

export function countFor(
  view: PanelView | string,
  counts: Pick<ScanCounts, 'colors' | 'typography' | 'images' | 'textBlocks'>,
  design: NormalizedDesign | null,
): number {
  if (view === 'typography') return counts.typography
  if (view === 'assets' || view === 'images' || view === 'icons') {
    return design ? uniqueVisualAssets(design.assets).length : counts.images
  }
  if (view === 'content') return design ? panelContentBlocks(design.content).length : counts.textBlocks
  if (view === 'layout' && design) return layoutItemCount(design)
  return 0
}
