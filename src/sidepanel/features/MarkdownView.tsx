import { useState } from 'react'
import { CircleHelp, Copy, Download, RefreshCw } from 'lucide-react'
import { generateDesignMarkdown } from '../../generators/design-md'
import { generateSkillMarkdown } from '../../generators/skill-md'
import { Button } from '../components/Button'
import { ScanPrompt } from '../components/CopyButton'
import { CollectionShell } from '../components/Segmented'
import { startScan } from '../scan-flow'
import { useScanStore } from '../store/useScanStore'
import { useToastStore } from '../toast'
import { MAX_ELEMENTS, SCHEMA_VERSION } from '../../shared/constants'
import type { NormalizedDesign, PageScan } from '../../shared/types'
import { validateNormalized, validateScan } from '../../validation/scan-validator'
import { coverageSummary } from '../../validation/coverage'

const MD_TABS = [
  { value: 'design', label: 'DESIGN.md' },
  { value: 'skill', label: 'SKILL.md' },
] as const

const STROKE = { size: 14, strokeWidth: 1.75 } as const

export function MarkdownView() {
  const design = useScanStore((s) => s.design)
  const raw = useScanStore((s) => s.raw)
  const phase = useScanStore((s) => s.phase)
  const tabRestricted = useScanStore((s) => s.tabRestricted)
  const [tab, setTab] = useState<'design' | 'skill'>('design')
  const [infoOpen, setInfoOpen] = useState(false)
  const busy = ['preparing', 'lazy-loading', 'scanning', 'normalizing', 'validating'].includes(phase)

  if (!design && !busy) return <ScanPrompt afterScan="Scan this page to generate DESIGN.md and SKILL.md." />

  const filename = tab === 'design' ? 'DESIGN.md' : 'SKILL.md'
  const markdown = design
    ? tab === 'design'
      ? generateDesignMarkdown(design)
      : generateSkillMarkdown(design)
    : 'Refreshing from the page…'

  return (
    <CollectionShell value={tab} options={MD_TABS} onChange={setTab} label="Generated markdown">
      <div className="md-wrap">
        {infoOpen && design ? <MarkdownInfoPanel tab={tab} design={design} raw={raw} onClose={() => setInfoOpen(false)} /> : null}
        <div className="md-frame">
          <div className="md-toolbar">
            <button
              type="button"
              className="icon-btn md-tool"
              aria-label="Copy to clipboard"
              disabled={!design}
              onClick={() => void copyMarkdown(markdown, filename)}>
              <Copy {...STROKE} aria-hidden="true" />
              <span className="tip tip-below tip-end">Copy</span>
            </button>
            <button
              type="button"
              className="icon-btn md-tool"
              aria-label="Download file"
              disabled={!design}
              onClick={() => void downloadMarkdown(markdown, filename)}>
              <Download {...STROKE} aria-hidden="true" />
              <span className="tip tip-below tip-end">Download</span>
            </button>
            <button
              type="button"
              className={busy ? 'icon-btn md-tool is-busy' : 'icon-btn md-tool'}
              aria-label="Refresh from page"
              disabled={busy || tabRestricted}
              onClick={() => void refreshMarkdown()}>
              <RefreshCw {...STROKE} aria-hidden="true" />
              <span className="tip tip-below tip-end">Refresh</span>
            </button>
            <button
              type="button"
              className={infoOpen ? 'icon-btn md-tool on' : 'icon-btn md-tool'}
              aria-label="Info"
              aria-expanded={infoOpen}
              disabled={!design}
              onClick={() => setInfoOpen((open) => !open)}>
              <CircleHelp {...STROKE} aria-hidden="true" />
              <span className="tip tip-below tip-end">Info</span>
            </button>
          </div>
          <pre className="md-preview" tabIndex={0}>{markdown}</pre>
        </div>
      </div>
    </CollectionShell>
  )
}

async function copyMarkdown(markdown: string, filename: string): Promise<void> {
  await navigator.clipboard.writeText(markdown)
  useToastStore.getState().showToast(`${filename} copied`)
}

async function downloadMarkdown(markdown: string, filename: string): Promise<void> {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  await chrome.downloads.download({ url, filename, saveAs: true })
  URL.revokeObjectURL(url)
  useToastStore.getState().showToast(`${filename} downloaded`)
}

async function refreshMarkdown(): Promise<void> {
  useToastStore.getState().showToast('Refreshing from page…')
  await startScan()
}

function MarkdownInfoPanel({
  tab,
  design,
  raw,
  onClose,
}: {
  tab: 'design' | 'skill'
  design: NormalizedDesign
  raw: PageScan | null
  onClose: () => void
}) {
  const coverage = design.coverage
  const sampled = coverage.relevantElements
  const styled = coverage.styledElements
  const truncated = raw?.lazyLoad.truncated
  const semantic = design.sections.filter((section) => section.provenance === 'semantic').length
  const inferred = design.sections.length - semantic
  const headings = design.content.filter((block) => block.kind === 'heading').length
  const nav = design.content.filter((block) => block.kind === 'navigation').length
  const tables = design.content.filter((block) => block.kind === 'table').length
  const og = design.metadata.ogTitle || design.metadata.title || design.metadata.hostname
  const checks = markdownChecks(design, raw)
  const passed = checks.filter((check) => check.ok).length
  const file = tab === 'design' ? 'DESIGN.md' : 'SKILL.md'

  return (
    <section className="md-howto" aria-label="How this was generated">
      <header className="md-howto-head">
        <h3>How This Was Generated</h3>
        <Button variant="secondary" size="sm" className="md-howto-close" onClick={onClose}>
          Close
        </Button>
      </header>
      <div className="md-howto-body">
        {tab === 'design' ? (
          <p>
            <strong>DESIGN.md</strong> is generated automatically through a multi-step pipeline:
          </p>
        ) : (
          <p>
            <strong>SKILL.md</strong> is assembled from the same page scan as DESIGN.md. It is the agent playbook, not a
            second measurement pass:
          </p>
        )}
        <ol>
          <li>
            <strong>Style extraction.</strong> The extension scans visible page elements and captures computed
            typography, colors, spacing, radius, shadows, copy, and assets. Current run: {styled} styled of {sampled}{' '}
            sampled elements
            {sampled >= MAX_ELEMENTS ? `, capped at ${MAX_ELEMENTS}` : ''}.
            {truncated ? ` Lazy-load was truncated${raw?.lazyLoad.reason ? ` (${raw.lazyLoad.reason})` : ''}.` : ''}
          </li>
          <li>
            <strong>Token normalization.</strong> Raw values are deduplicated into reusable token sets. Token names are
            inferred; values stay measured. Current token coverage: typography {design.tokens.typography.length}, color{' '}
            {design.tokens.colors.length}, spacing {design.tokens.spacing.length}, radius {design.tokens.radii.length},
            shadow {design.tokens.shadows.length}.
          </li>
          <li>
            <strong>Structure profiling.</strong> URL, Open Graph metadata, headings, navigation labels, and layout
            signals are used to name sections and component patterns. Current run: {design.sections.length} sections (
            {semantic} semantic / {inferred} inferred), {design.components.length} component patterns. Evidence: “{og}”,{' '}
            {headings} headings, {nav} navigation labels
            {tables ? `, ${tables} tables` : ''}.
          </li>
          <li>
            <strong>Blueprint assembly.</strong> DESIGN.md is the measured spec (tokens, layout, content, assets, and
            implementation rules). SKILL.md is the recreation playbook: read order, hard rules, facts vs inferences, and
            visual-fix order. Schema {SCHEMA_VERSION}. This panel is showing {file}.
          </li>
          <li>
            <strong>Conformance checks.</strong> Raw and normalized scans are validated before these files are shown.
            Current run: {passed}/{checks.length} checks passed
            {checks.some((check) => !check.ok)
              ? ` (${checks
                  .filter((check) => !check.ok)
                  .map((check) => check.label)
                  .join(', ')})`
              : ''}
            . Coverage: {coverageSummary(coverage)}.
            {design.limitations.length
              ? ` ${design.limitations.length} limitation${design.limitations.length === 1 ? '' : 's'} recorded.`
              : ''}
          </li>
        </ol>
        <p>
          This flow writes measured facts into <strong>DESIGN.md</strong> and recreation rules into{' '}
          <strong>SKILL.md</strong>. Do not invent sections, copy, or assets that were not captured on this page.
        </p>
      </div>
    </section>
  )
}

function markdownChecks(design: NormalizedDesign, raw: PageScan | null): { ok: boolean; label: string }[] {
  const warnings = [...(raw ? validateScan(raw) : []), ...validateNormalized(design)]
  return [
    { ok: Boolean(design.metadata.url), label: 'page URL' },
    { ok: design.coverage.relevantElements > 0, label: 'sampled elements' },
    { ok: design.tokens.colors.length > 0, label: 'color tokens' },
    { ok: design.tokens.typography.length > 0, label: 'typography tokens' },
    { ok: design.content.length > 0, label: 'content blocks' },
    { ok: design.sections.length > 0, label: 'sections' },
    { ok: Boolean(design.schemaVersion), label: 'schema version' },
    { ok: warnings.length === 0, label: warnings[0] ?? 'validator' },
  ]
}
