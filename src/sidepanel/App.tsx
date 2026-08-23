import { useEffect, useState } from 'react';
import { createRequestId, createScanId } from '../shared/messages';
import { userFacingError } from '../shared/errors';
import { sendRuntime, onRuntimeMessage } from './chrome-api';
import { BottomNav } from './components/BottomNav';
import { PanelChrome } from './components/PanelChrome';
import { ColorsView, LayoutView, TypographyView } from './features/ColorsView';
import { AssetsView, ContentView } from './features/ContentView';
import { ExportView } from './features/ExportView';
import { OverviewView } from './features/OverviewView';
import { useScanStore } from './store/useScanStore';

const BUSY = ['preparing', 'lazy-loading', 'scanning', 'normalizing', 'validating', 'exporting'];
const OVERLAY = typeof window !== 'undefined' && window !== window.top;

export function App() {
  const phase = useScanStore((s) => s.phase);
  const view = useScanStore((s) => s.view);
  const hostname = useScanStore((s) => s.hostname);
  const title = useScanStore((s) => s.title);
  const url = useScanStore((s) => s.url);
  const tabRestricted = useScanStore((s) => s.tabRestricted);
  const design = useScanStore((s) => s.design);
  const options = useScanStore((s) => s.options);
  const counts = useScanStore((s) => s.counts);
  const [inspectOn, setInspectOn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    void refreshTab();
    return onRuntimeMessage((message) => {
      if (message.type === 'SCAN_PROGRESS') {
        useScanStore.getState().setProgress(message.payload);
      }
      if (message.type === 'SCAN_FAILED') {
        useScanStore.getState().setFailed(userFacingError(message.payload));
      }
      if (message.type === 'SCAN_COMPLETE' && message.payload.assembled) {
        void loadScan(message.scanId);
      }
    });
  }, []);

  const busy = BUSY.includes(phase);
  const canExport = Boolean(design) && (phase === 'ready' || phase === 'complete');

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
          setMenuOpen(false);
          useScanStore.getState().setView('export');
        }}
        onClear={() => void clearData()}
        onOpen={(next) => {
          setMenuOpen(false);
          useScanStore.getState().setView(next);
        }}
      />
      <div className="page-head">
        <div>
          <h1>{headingFor(view)}</h1>
          {view === 'overview' ? (
            <>
              <p className="page-title">{title || hostname || 'Open a website, then scan'}</p>
              {url ? <p className="page-url">{url}</p> : null}
            </>
          ) : (
            <span className="count-pill">{countFor(view, counts)}</span>
          )}
        </div>
        {view === 'overview' ? (
          <button
            type="button"
            className="btn"
            disabled={busy || tabRestricted}
            onClick={() => void startScan()}
          >
            {busy ? 'Scanning…' : design ? 'Rescan' : 'Scan page'}
          </button>
        ) : view === 'colors' || view === 'assets' || view === 'images' || view === 'icons' ? (
          <button
            type="button"
            className="btn ghost"
            disabled={!canExport}
            onClick={() => useScanStore.getState().setView('export')}
          >
            Export All
          </button>
        ) : null}
      </div>
      {tabRestricted ? (
        <p className="banner">This tab cannot be scanned. Open an http(s) page.</p>
      ) : null}
      <main className="main">
        {view === 'overview' ? <OverviewView /> : null}
        {view === 'content' ? <ContentView /> : null}
        {view === 'assets' || view === 'images' || view === 'icons' ? <AssetsView /> : null}
        {view === 'colors' ? <ColorsView /> : null}
        {view === 'typography' ? <TypographyView /> : null}
        {view === 'layout' ? <LayoutView /> : null}
        {view === 'export' ? <ExportView /> : null}
      </main>
      <BottomNav />
    </div>
  );

  async function toggleInspect() {
    const next = !inspectOn;
    setInspectOn(next);
    await sendRuntime({
      type: 'SET_INSPECT_MODE',
      requestId: createRequestId(),
      payload: { enabled: next },
    });
  }

  async function dockSidePanel() {
    await sendRuntime({ type: 'DOCK_SIDE_PANEL', requestId: createRequestId() });
  }

  async function closePanel() {
    if (OVERLAY) {
      window.parent.postMessage({ source: 'page2design', type: 'close' }, '*');
    }
    await sendRuntime({
      type: 'SET_INSPECT_MODE',
      requestId: createRequestId(),
      payload: { enabled: false },
    });
    await sendRuntime({ type: 'CLOSE_OVERLAY', requestId: createRequestId() });
  }

  async function refreshTab() {
    const response = await sendRuntime({ type: 'GET_ACTIVE_TAB', requestId: createRequestId() });
    if (response?.type === 'ACTIVE_TAB_INFO') {
      useScanStore.getState().setTabInfo({
        hostname: response.payload.hostname,
        title: response.payload.title,
        url: response.payload.url,
        restricted: response.payload.restricted,
      });
    }
  }

  async function startScan() {
    await refreshTab();
    const scanId = createScanId();
    useScanStore.getState().reset();
    useScanStore.setState({ scanId, phase: 'preparing' });
    const response = await sendRuntime({
      type: 'START_SCAN',
      requestId: createRequestId(),
      scanId,
      payload: options,
    });
    if (response?.type === 'SCAN_FAILED') {
      useScanStore.getState().setFailed(userFacingError(response.payload));
    }
  }

  async function cancelScan() {
    const scanId = useScanStore.getState().scanId;
    if (!scanId) return;
    await sendRuntime({ type: 'CANCEL_SCAN', requestId: createRequestId(), scanId });
    useScanStore.getState().setCancelled();
  }

  async function clearData() {
    await sendRuntime({ type: 'CLEAR_SCANS', requestId: createRequestId() });
    useScanStore.getState().reset();
  }
}

async function loadScan(scanId: string) {
  useScanStore.getState().setPhase('normalizing');
  const response = await sendRuntime({ type: 'GET_SCAN', requestId: createRequestId(), scanId });
  if (response?.type === 'SCAN_RECORD' && response.payload.raw && response.payload.normalized) {
    useScanStore.getState().setReady(scanId, response.payload.raw, response.payload.normalized);
  }
}

function headingFor(view: string): string {
  if (view === 'colors') return 'Colors';
  if (view === 'typography') return 'Typography';
  if (view === 'assets' || view === 'images' || view === 'icons') return 'Assets';
  if (view === 'export') return 'Export';
  if (view === 'content') return 'Content';
  if (view === 'layout') return 'Layout';
  return 'Overview';
}

function countFor(
  view: string,
  counts: { colors: number; typography: number; images: number; textBlocks: number },
): number {
  if (view === 'colors') return counts.colors;
  if (view === 'typography') return counts.typography;
  if (view === 'assets' || view === 'images' || view === 'icons') return counts.images;
  if (view === 'content') return counts.textBlocks;
  return 0;
}
