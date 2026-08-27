/**
 * Bottom-nav destinations and active-view normalization.
 */
import type { PanelView } from '../../../store/useScanStore'
import {
  AssetsIcon,
  ContentIcon,
  DesignMdIcon,
  DesignSystemIcon,
  ExportNavIcon,
  OverviewIcon,
  ProfileIcon,
  TypeIcon,
} from '../../LucideIcons'

export const BOTTOM_NAV_ITEMS: { id: PanelView; label: string; icon: typeof OverviewIcon }[] = [
  { id: 'overview', label: 'Overview', icon: OverviewIcon },
  { id: 'content', label: 'Content', icon: ContentIcon },
  { id: 'design-system', label: 'Design System', icon: DesignSystemIcon },
  { id: 'typography', label: 'Typography', icon: TypeIcon },
  { id: 'assets', label: 'Assets', icon: AssetsIcon },
  { id: 'generate-md', label: 'Generate Markdown', icon: DesignMdIcon },
  { id: 'export', label: 'Export', icon: ExportNavIcon },
  { id: 'developer', label: 'Developer', icon: ProfileIcon },
]

/** Map legacy / alias views onto a primary nav id. */
export function resolveActiveNav(view: PanelView): PanelView {
  if (view === 'images' || view === 'icons') return 'assets'
  if (view === 'layout') return 'overview'
  if (view === 'colors') return 'design-system'
  return view
}
