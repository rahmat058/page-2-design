/**
 * Side panel root: wires scan store, runtime messages, chrome chrome, and feature views.
 * Also handles overlay resize and inspect-mode toggling.
 */
import { useState } from 'react'
import { Copy, Download, Layers, RefreshCw, Star } from 'lucide-react'
import { Button } from './components/Button'
import { BottomNav } from './components/BottomNav'
import { PageHead } from './components/PageHead'
import { PanelChrome } from './components/PanelChrome'
import { TypographyView } from './features/ColorsView'
import { DesignSystemView } from './features/DesignSystemView'
import { AssetsView, ContentView } from './features/ContentView'
import { ExportView } from './features/ExportView'
import { InspectorView } from './features/InspectorView'
import { LayoutView } from './features/LayoutView'
import { MarkdownView } from './features/MarkdownView'
import { DeveloperView, REPO_URL } from './features/DeveloperView'
import { OverviewView } from './features/OverviewView'
import { Toast } from './components/Toast'
import { downloadAllImagesZip } from './download-asset'
import { cancelScan, clearScanData, refreshTab, startScan } from './scan-flow'
import { useScanStore } from './store/useScanStore'
import { useToastStore } from './toast'
import { uniqueVisualAssets } from '../content/asset-scanner'
import { isOverlayFrame, useOverlayResize, usePanelRuntime, useScanBusy } from './hooks'
import { closePanel, copyAllContent, countFor, dockSidePanel, headingFor, toggleInspectMode } from './lib'

// ---------------------------------------------------------------------------
// App shell
// ---------------------------------------------------------------------------

export function App() {
  const phase = useScanStore((s) => s.phase)
  const view = useScanStore((s) => s.view)
  const hostname = useScanStore((s) => s.hostname)
  const tabRestricted = useScanStore((s) => s.tabRestricted)
  const design = useScanStore((s) => s.design)
  const counts = useScanStore((s) => s.counts)
  const designSystemReady = useScanStore((s) => s.designSystemReady)
  const inspectOn = useScanStore((s) => s.inspectOn)
  const [menuOpen, setMenuOpen] = useState(false)
  const mdOpen = view === 'generate-md'
  const onDesignSystem = view === 'design-system' || view === 'colors'
  const overlay = isOverlayFrame()
  const busy = useScanBusy()
  const canExport = Boolean(design) && (phase === 'ready' || phase === 'complete')

  usePanelRuntime()
  useOverlayResize(mdOpen && !inspectOn)

  return (
    <div className={mdOpen && !inspectOn ? 'app inspector is-wide' : 'app inspector'}>
      <PanelChrome
        inspectOn={inspectOn}
        menuOpen={menuOpen}
        overlay={overlay}
        busy={busy}
        canExport={canExport}
        onToggleInspect={() => void toggleInspectMode()}
        onToggleMenu={() => setMenuOpen((open) => !open)}
        onDock={() => void dockSidePanel()}
        onClose={() => void closePanel()}
        onIdentify={() => void refreshTab()}
        onScan={() => void startScan()}
        onCancel={() => void cancelScan()}
        onExport={() => {
          setMenuOpen(false)
          useScanStore.getState().setView('export')
        }}
        onClear={() => void clearScanData()}
        onOpen={(next) => {
          setMenuOpen(false)
          useScanStore.getState().setView(next)
        }}
      />
      {inspectOn ? (
        <InspectorView />
      ) : (
        <>
          <PageHead
            title={headingFor(view)}
            icon={onDesignSystem && designSystemReady ? Layers : undefined}
            count={
              view !== 'overview' && view !== 'generate-md' && view !== 'developer' && !onDesignSystem
                ? countFor(view, counts, design)
                : null
            }
            overview={view === 'overview'}
            action={
              view === 'overview' && design ? (
                <Button size="sm" icon={RefreshCw} disabled={busy || tabRestricted} onClick={() => void startScan()}>
                  {busy ? 'Scanning…' : 'Rescan'}
                </Button>
              ) : view === 'content' ? (
                <Button size="sm" icon={Copy} onClick={() => void copyAllContent()}>
                  Copy all
                </Button>
              ) : view === 'assets' || view === 'images' || view === 'icons' ? (
                <Button
                  size="sm"
                  icon={Download}
                  disabled={!canExport}
                  onClick={() => {
                    const assets = uniqueVisualAssets(useScanStore.getState().design?.assets ?? [])
                    void downloadAllImagesZip(assets, hostname)
                  }}>
                  Export All
                </Button>
              ) : onDesignSystem && designSystemReady ? (
                <Button
                  size="sm"
                  icon={RefreshCw}
                  onClick={() => {
                    useScanStore.getState().regenerateDesignSystem()
                    useToastStore.getState().showToast('Design system regenerated')
                  }}>
                  Regenerate
                </Button>
              ) : view === 'developer' ? (
                <a className="ui-btn ui-btn-sm" href={REPO_URL} target="_blank" rel="noopener noreferrer">
                  <Star className="ui-btn-icon" size={16} strokeWidth={2} aria-hidden="true" />
                  <span className="ui-btn-label">Star repo</span>
                </a>
              ) : null
            }
          />
          {tabRestricted ? <p className="banner">This tab cannot be scanned. Open an http(s) page.</p> : null}
          <main className="main">
            <div key={view} className="fade-pane">
              {view === 'overview' ? <OverviewView /> : null}
              {view === 'content' ? <ContentView /> : null}
              {view === 'assets' || view === 'images' || view === 'icons' ? <AssetsView /> : null}
              {view === 'design-system' || view === 'colors' ? <DesignSystemView /> : null}
              {view === 'typography' ? <TypographyView /> : null}
              {view === 'layout' ? <LayoutView /> : null}
              {view === 'export' ? <ExportView /> : null}
              {view === 'generate-md' ? <MarkdownView /> : null}
              {view === 'developer' ? <DeveloperView /> : null}
            </div>
          </main>
          <BottomNav />
        </>
      )}
      <Toast />
    </div>
  )
}
