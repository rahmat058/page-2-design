/**
 * Design System tab: empty generate screen, then scales / type / tokens / export.
 */
import { Wand2 } from 'lucide-react'
import { Button } from '../components/Button'
import { ScanPrompt } from '../components/CopyButton'
import { useScanStore } from '../store/useScanStore'
import { useToastStore } from '../toast'
import { DesignSystemPanel } from './DesignSystemPanel'

const FEATURES = [
  { label: 'Extract Colors', tag: 'Palette' },
  { label: 'Analyze Fonts', tag: 'Type' },
  { label: 'Export Code', tag: 'CSS/JSON' },
] as const

export function DesignSystemView() {
  const design = useScanStore((s) => s.design)
  const ready = useScanStore((s) => s.designSystemReady)
  const epoch = useScanStore((s) => s.designSystemEpoch)

  if (!design) {
    return <ScanPrompt afterScan="Scan this page to generate a design system from its colors and fonts." />
  }

  const hasTokens = design.tokens.colors.length > 0 || design.tokens.typography.length > 0
  if (!hasTokens) {
    return <ScanPrompt afterScan="No design tokens were captured on this page." />
  }

  if (!ready) {
    return (
      <div className="ds-empty">
        <div className="ds-empty-icon" aria-hidden="true">
          <Wand2 size={18} strokeWidth={2} />
        </div>
        <h2>Design System</h2>
        <p>Generate a complete design system from this page&apos;s colors and fonts.</p>
        <Button
          size="sm"
          icon={Wand2}
          onClick={() => {
            useScanStore.getState().setDesignSystemReady(true)
            useToastStore.getState().showToast('Design system generated')
          }}>
          Generate System
        </Button>
        <div className="ds-empty-divider" />
        <ul className="ds-empty-features">
          {FEATURES.map((item) => (
            <li key={item.tag}>
              <span>{item.label}</span>
              <span className="ds-empty-tag">{item.tag}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return <DesignSystemPanel key={epoch} design={design} />
}
