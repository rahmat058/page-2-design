/**
 * Boots the panel once and routes runtime scan/inspect messages into the store.
 */
import { useEffect } from 'react'
import { userFacingError } from '../../shared/errors'
import { onRuntimeMessage } from '../chrome-api'
import { loadScan, refreshTab, startScan } from '../scan-flow'
import { useScanStore } from '../store/useScanStore'

let autoScanStarted = false

async function boot(): Promise<void> {
  await refreshTab()
  if (autoScanStarted) return
  const { tabRestricted, design, phase } = useScanStore.getState()
  if (tabRestricted || design || phase !== 'idle') return
  autoScanStarted = true
  await startScan()
}

export function usePanelRuntime(): void {
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
        const store = useScanStore.getState()
        if (!store.inspectOn) store.setInspectOn(true)
        store.setInspected(message.payload)
      }
    })
  }, [])
}
