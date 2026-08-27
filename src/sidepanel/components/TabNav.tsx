/**
 * Horizontal tab list for switching among scan result views (legacy/alternate nav).
 */
import { useScanStore, type PanelView } from '../store/useScanStore'

const TABS: { id: PanelView; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'content', label: 'Content' },
  { id: 'images', label: 'Images' },
  { id: 'icons', label: 'Icons & SVG' },
  { id: 'design-system', label: 'Design System' },
  { id: 'typography', label: 'Typography' },
  { id: 'layout', label: 'Layout' },
  { id: 'export', label: 'Export' },
  { id: 'generate-md', label: 'Generate Markdown' },
]

export function TabNav() {
  const view = useScanStore((s) => s.view)
  const setView = useScanStore((s) => s.setView)

  return (
    <div className="tabs" role="tablist" aria-label="Scan results">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className="tab"
          role="tab"
          aria-selected={view === tab.id}
          onClick={() => setView(tab.id)}>
          {tab.label}
        </button>
      ))}
    </div>
  )
}
