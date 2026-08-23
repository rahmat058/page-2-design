import { createRequestId, createScanId } from '../shared/messages';
import { userFacingError } from '../shared/errors';
import { sendRuntime } from './chrome-api';
import { useScanStore } from './store/useScanStore';

export async function refreshTab(): Promise<void> {
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

export async function startScan(): Promise<void> {
  await refreshTab();
  const { options, tabRestricted } = useScanStore.getState();
  if (tabRestricted) return;
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

export async function cancelScan(): Promise<void> {
  const scanId = useScanStore.getState().scanId;
  if (!scanId) return;
  await sendRuntime({ type: 'CANCEL_SCAN', requestId: createRequestId(), scanId });
  useScanStore.getState().setCancelled();
}

export async function clearScanData(): Promise<void> {
  await sendRuntime({ type: 'CLEAR_SCANS', requestId: createRequestId() });
  useScanStore.getState().reset();
}

export async function loadScan(scanId: string): Promise<void> {
  useScanStore.getState().setPhase('normalizing');
  const response = await sendRuntime({ type: 'GET_SCAN', requestId: createRequestId(), scanId });
  if (response?.type === 'SCAN_RECORD' && response.payload.raw && response.payload.normalized) {
    useScanStore.getState().setReady(scanId, response.payload.raw, response.payload.normalized);
  }
}
