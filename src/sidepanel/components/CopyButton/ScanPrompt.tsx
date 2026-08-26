/**
 * Scan CTA shown when a tab has no design data yet.
 */
import { RefreshCw } from 'lucide-react'
import { useScanBusy } from '../../hooks'
import { startScan } from '../../scan-flow'
import { useScanStore } from '../../store/useScanStore'
import { Button } from '../Button'
import { EmptyState } from './EmptyState'

export function ScanPrompt({ afterScan }: { afterScan: string }) {
  const design = useScanStore((s) => s.design)
  const tabRestricted = useScanStore((s) => s.tabRestricted)
  const busy = useScanBusy()
  if (design) return <EmptyState>{afterScan}</EmptyState>
  return (
    <div className="empty-scan">
      <p>Scan this page to extract fonts, colors, and assets.</p>
      <Button size="sm" icon={RefreshCw} disabled={busy || tabRestricted} onClick={() => void startScan()}>
        {busy ? 'Scanning…' : 'Scan page'}
      </Button>
      <button type="button" className="link" onClick={() => useScanStore.getState().setView('overview')}>
        Back to Overview
      </button>
    </div>
  )
}
