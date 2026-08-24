import type { ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { startScan } from '../scan-flow'
import { useScanStore } from '../store/useScanStore'
import { Button } from './Button'

interface Props {
  value: string
  label: string
}

export function CopyButton({ value, label }: Props) {
  return (
    <button type="button" className="copy" onClick={() => void navigator.clipboard.writeText(value)}>
      {label}
    </button>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}

export function ScanPrompt({ afterScan }: { afterScan: string }) {
  const design = useScanStore((s) => s.design)
  const phase = useScanStore((s) => s.phase)
  const tabRestricted = useScanStore((s) => s.tabRestricted)
  const busy = ['preparing', 'lazy-loading', 'scanning', 'normalizing', 'validating', 'exporting'].includes(phase)
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
