/**
 * Layout tab: page sections outline and spacing / radius / shadow tokens.
 */
import { useState } from 'react'
import type { DesignToken, NormalizedSection } from '../../shared/types'
import { CountBadge } from '../components/CountBadge'
import { ScanPrompt } from '../components/CopyButton'
import { CopyIcon } from '../components/LucideIcons'
import { CollectionShell } from '../components/Segmented'
import { isSaneLayoutToken } from '../lib/layout-tokens'
import { useScanStore } from '../store/useScanStore'
import { useToastStore } from '../toast'

const TABS = [
  { value: 'sections', label: 'Sections' },
  { value: 'tokens', label: 'Tokens' },
] as const

const MAX_PREVIEW_PX = 96

export function LayoutView() {
  const design = useScanStore((s) => s.design)
  const [tab, setTab] = useState<'sections' | 'tokens'>('sections')

  if (!design) return <ScanPrompt afterScan="No layout data was captured." />

  const spacing = design.tokens.spacing.filter(isSaneLayoutToken)
  const radii = design.tokens.radii.filter(isSaneLayoutToken)
  const shadows = design.tokens.shadows.filter((token) => token.value.trim().length > 0)
  const tokenCount = spacing.length + radii.length + shadows.length

  return (
    <CollectionShell value={tab} options={TABS} onChange={setTab} label="Layout views">
      {tab === 'sections' ? (
        design.sections.length === 0 ? (
          <p className="muted layout-empty">No sections were detected on this page.</p>
        ) : (
          <div className="layout-section-list">
            <header className="layout-group-head">
              <h2>Page sections</h2>
              <CountBadge value={design.sections.length} />
            </header>
            {design.sections.map((section, index) => (
              <SectionCard key={section.id} section={section} index={index} />
            ))}
          </div>
        )
      ) : tokenCount === 0 ? (
        <p className="muted layout-empty">No spacing, radius, or shadow tokens were captured.</p>
      ) : (
        <div className="layout-token-groups">
          <TokenGroup title="Spacing" kind="space" tokens={spacing} />
          <TokenGroup title="Radius" kind="radius" tokens={radii} />
          <TokenGroup title="Shadow" kind="shadow" tokens={shadows} />
        </div>
      )}
    </CollectionShell>
  )
}

function SectionCard({ section, index }: { section: NormalizedSection; index: number }) {
  const role = section.composition?.role ?? 'band'
  const pattern = section.composition?.pattern ?? 'stack'
  const columns = section.composition?.columns ?? 1
  const { width, height } = section.bounds

  return (
    <article className="layout-section-card" data-role={role}>
      <div className="layout-section-accent" aria-hidden="true" />
      <div className="layout-section-body">
        <div className="layout-section-top">
          <span className="layout-section-index">{String(index + 1).padStart(2, '0')}</span>
          <h3 className="layout-section-title">{section.name}</h3>
        </div>
        <div className="layout-section-chips">
          <span className="layout-chip role">{formatLabel(role)}</span>
          <span className="layout-chip">{formatLabel(pattern)}</span>
          <span className="layout-chip">{columns} col</span>
        </div>
        <div className="layout-section-meta">
          <span>
            {Math.round(width)} × {Math.round(height)} px
          </span>
          {section.composition?.gap ? <span>gap {section.composition.gap}</span> : null}
          {section.layoutMode ? <span>{section.layoutMode}</span> : null}
        </div>
        {section.contentSummary ? <p className="layout-section-summary">{section.contentSummary}</p> : null}
      </div>
    </article>
  )
}

function TokenGroup({
  title,
  kind,
  tokens,
}: {
  title: string
  kind: 'space' | 'radius' | 'shadow'
  tokens: DesignToken[]
}) {
  if (tokens.length === 0) return null
  return (
    <section className="layout-token-group">
      <header className="layout-group-head">
        <h2>{title}</h2>
        <CountBadge value={tokens.length} />
      </header>
      <div className="layout-token-list">
        {tokens.map((token) => (
          <TokenRow key={token.id} token={token} kind={kind} />
        ))}
      </div>
    </section>
  )
}

function TokenRow({ token, kind }: { token: DesignToken; kind: 'space' | 'radius' | 'shadow' }) {
  const label = prettyTokenName(token.name)
  const value = formatTokenValue(token.value)

  return (
    <div className="layout-token-row">
      <div className={`layout-token-preview ${kind}`} aria-hidden="true">
        {kind === 'space' ? <span style={{ width: `${previewWidth(token)}px` }} /> : null}
        {kind === 'radius' ? <span style={{ borderRadius: token.value }} /> : null}
        {kind === 'shadow' ? <span style={{ boxShadow: sanitizeShadow(token.value) }} /> : null}
      </div>
      <div className="layout-token-copy">
        <strong>{label}</strong>
        <code title={token.value}>{value}</code>
      </div>
      <button
        type="button"
        className="icon-btn layout-token-copy-btn"
        aria-label={`Copy ${label}`}
        onClick={() => {
          void navigator.clipboard.writeText(token.value)
          useToastStore.getState().showToast(`${label} copied`)
        }}>
        <CopyIcon />
      </button>
    </div>
  )
}

function previewWidth(token: DesignToken): number {
  const px = token.px ?? (Number.parseFloat(token.value) || 8)
  return Math.max(4, Math.min(MAX_PREVIEW_PX, px))
}

function sanitizeShadow(value: string): string {
  if (value.length > 220) return '0 8px 24px rgb(16 18 27 / 0.18)'
  return value
}

function prettyTokenName(name: string): string {
  return name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatTokenValue(value: string): string {
  if (value.length <= 42) return value
  return `${value.slice(0, 39)}…`
}

function formatLabel(value: string): string {
  return value.replace(/[-_]/g, ' ')
}
