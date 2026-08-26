/**
 * Chrome / overlay actions driven by the top panel chrome.
 */
import { createRequestId } from '../../shared/messages'
import { sendRuntime } from '../chrome-api'
import { useScanStore } from '../store/useScanStore'
import { isOverlayFrame } from '../hooks/use-overlay-resize'
import { postOverlayMessage } from './overlay-messages'

export async function toggleInspectMode(): Promise<void> {
  const next = !useScanStore.getState().inspectOn
  useScanStore.getState().setInspectOn(next)
  await sendRuntime({
    type: 'SET_INSPECT_MODE',
    requestId: createRequestId(),
    payload: { enabled: next, contextMenu: useScanStore.getState().inspectContextMenu },
  })
}

export async function dockSidePanel(): Promise<void> {
  await sendRuntime({ type: 'DOCK_SIDE_PANEL', requestId: createRequestId() })
}

export async function closePanel(): Promise<void> {
  if (isOverlayFrame()) {
    postOverlayMessage({ type: 'close' })
  }
  useScanStore.getState().setInspectOn(false)
  await sendRuntime({
    type: 'SET_INSPECT_MODE',
    requestId: createRequestId(),
    payload: { enabled: false },
  })
  await sendRuntime({ type: 'CLOSE_OVERLAY', requestId: createRequestId() })
}
