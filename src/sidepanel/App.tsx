import { useEffect, useState } from 'react'
import { createRequestId } from '../shared/messages'
import { userFacingError } from '../shared/errors'
import { sendRuntime, onRuntimeMessage } from './chrome-api'
import { Copy, Download, RefreshCw } from 'lucide-react'
import { Button } from './components/Button'
import { CountBadge } from './components/CountBadge'
import { BottomNav } from './components/BottomNav'
import { PanelChrome } from './components/PanelChrome'
import { ColorsView, LayoutView, TypographyView } from './features/ColorsView'
import { AssetsView, ContentView } from './features/ContentView'
import { ExportView } from './features/ExportView'
import { InspectorView } from './features/InspectorView'
import { OverviewView } from './features/OverviewView'
import { Toast } from './components/Toast'
import { downloadAllImagesZip } from './download-asset'
import { cancelScan, clearScanData, loadScan, refreshTab, startScan } from './scan-flow'
import { useScanStore } from './store/useScanStore'
import { useToastStore } from './toast'
import { uniqueVisualAssets } from '../content/asset-scanner'
import { copyContentPlain, groupContentBySection, panelContentBlocks } from './content-groups'
import type { NormalizedDesign } from '../shared/types'

const BUSY = ['preparing', 'lazy-loading', 'scanning', 'normalizing', 'validating', 'exporting']
const OVERLAY = typeof window !== 'undefined' && window !== window.top

export function App() {
  const phase = useScanStore((s) => s.phase)
  const view = useScanStore((s) => s.view)
  const hostname = useScanStore((s) => s.hostname)
  const title = useScanStore((s) => s.title)
  const url = useScanStore((s) => s.url)
  const tabRestricted = useScanStore((s) => s.tabRestricted)
  const design = useScanStore((s) => s.design)
  const counts = useScanStore((s) => s.counts)
  const inspectOn = useScanStore((s) => s.inspectOn)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    void boot()
    return onRuntimeMessage((message) => {
      if (message.type === 'SCAN_PROGRESS') {
        useScanStore.getState().setProgress(message.payload)
      }
      if (message.type === 'SCAN_FAILED') {
        useScanStore.getState().setFailed(userFacingError(message.payload))
      }
      if (message.type === 'SCAN_COMPLETE' && message.payload.assembled) {
        void loadScan(message.scanId)
      }
      if (message.type === 'INSPECT_ELEMENT') {
        useScanStore.getState().setInspected(message.payload)
      }
    })
  }, [])

  const busy = BUSY.includes(phase)
  const canExport = Boolean(design) && (phase === 'ready' || phase === 'complete')

  return (
    <div className="app inspector">
      <PanelChrome
        inspectOn={inspectOn}
        menuOpen={menuOpen}
        overlay={OVERLAY}
        busy={busy}
        canExport={canExport}
        onToggleInspect={() => void toggleInspect()}
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
      <div className={view === 'overview' ? 'page-head overview-head' : 'page-head'}>
        <div className="head-row">
          <h1>
            {headingFor(view)}
            {view !== 'overview' ? <CountBadge value={countFor(view, counts, design)} /> : null}
          </h1>
          {view === 'overview' && design ? (
            <Button
              size="sm"
              icon={RefreshCw}
              disabled={busy || tabRestricted}
              onClick={() => void startScan()}>
              {busy ? 'Scanning…' : 'Rescan'}
            </Button>
          ) : view === 'content' ? (
            <Button size="sm" icon={Copy} onClick={() => void copyAllContent()}>
              Copy all
            </Button>
          ) : view === 'colors' || view === 'assets' || view === 'images' || view === 'icons' ? (
            <Button
              size="sm"
              icon={Download}
              disabled={!canExport}
              onClick={() => {
                if (view === 'assets' || view === 'images' || view === 'icons') {
                  const assets = uniqueVisualAssets(useScanStore.getState().design?.assets ?? [])
                  void downloadAllImagesZip(assets, hostname)
                  return
                }
                useScanStore.getState().setView('export')
              }}>
              Export All
            </Button>
          ) : null}
        </div>
        {view === 'overview' ? (
          <>
            <p className="page-title">{title || hostname || 'Open a website, then scan'}</p>
            {url ? <p className="page-url">{url}</p> : null}
          </>
        ) : null}
      </div>
      {tabRestricted ? <p className="banner">This tab cannot be scanned. Open an http(s) page.</p> : null}
      <main className="main">
        <div key={view} className="fade-pane">
          {view === 'overview' ? <OverviewView /> : null}
          {view === 'content' ? <ContentView /> : null}
          {view === 'assets' || view === 'images' || view === 'icons' ? <AssetsView /> : null}
          {view === 'colors' ? <ColorsView /> : null}
          {view === 'typography' ? <TypographyView /> : null}
          {view === 'layout' ? <LayoutView /> : null}
          {view === 'export' ? <ExportView /> : null}
        </div>
      </main>
      <BottomNav />
        </>
      )}
      <Toast />
    </div>
  )

  async function toggleInspect() {
    const next = !useScanStore.getState().inspectOn
    useScanStore.getState().setInspectOn(next)
    await sendRuntime({
      type: 'SET_INSPECT_MODE',
      requestId: createRequestId(),
      payload: { enabled: next },
    })
  }

  async function dockSidePanel() {
    await sendRuntime({ type: 'DOCK_SIDE_PANEL', requestId: createRequestId() })
  }

  async function closePanel() {
    if (OVERLAY) {
      window.parent.postMessage({ source: 'page2design', type: 'close' }, '*')
    }
    useScanStore.getState().setInspectOn(false)
    await sendRuntime({
      type: 'SET_INSPECT_MODE',
      requestId: createRequestId(),
      payload: { enabled: false },
    })
    await sendRuntime({ type: 'CLOSE_OVERLAY', requestId: createRequestId() })
  }
}

let autoScanStarted = false

async function boot(): Promise<void> {
  await refreshTab()
  if (autoScanStarted) return
  const { tabRestricted, design, phase } = useScanStore.getState()
  if (tabRestricted || design || phase !== 'idle') return
  autoScanStarted = true
  await startScan()
}

async function copyAllContent(): Promise<void> {
  const design = useScanStore.getState().design
  if (!design) return
  const groups = groupContentBySection(panelContentBlocks(design.content), design.sections)
  await navigator.clipboard.writeText(copyContentPlain(groups))
  useToastStore.getState().showToast('All content copied')
}

function headingFor(view: string): string {
  if (view === 'colors') return 'Colors'
  if (view === 'typography') return 'Typography'
  if (view === 'assets' || view === 'images' || view === 'icons') return 'Assets'
  if (view === 'export') return 'Export'
  if (view === 'content') return 'Content'
  if (view === 'layout') return 'Layout'
  return 'Overview'
}

function countFor(
  view: string,
  counts: { colors: number; typography: number; images: number; textBlocks: number },
  design: NormalizedDesign | null,
): number {
  if (view === 'colors') return counts.colors
  if (view === 'typography') return counts.typography
  if (view === 'assets' || view === 'images' || view === 'icons') {
    return design ? uniqueVisualAssets(design.assets).length : counts.images
  }
  if (view === 'content') return design ? panelContentBlocks(design.content).length : counts.textBlocks
  return 0
}
