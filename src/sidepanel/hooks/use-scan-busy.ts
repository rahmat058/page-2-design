/**
 * True while a scan/export pipeline phase is in flight.
 */
import { useScanStore } from '../store/useScanStore'
import { isBusyPhase } from '../lib/scan-busy'

export function useScanBusy(): boolean {
  const phase = useScanStore((s) => s.phase)
  return isBusyPhase(phase)
}
