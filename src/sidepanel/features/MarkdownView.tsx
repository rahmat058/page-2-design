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

const MD_TABS = [
  { value: 'design', label: 'DESIGN.md' },
  { value: 'skill', label: 'SKILL.md' },
] as const

const STROKE = { size: 14, strokeWidth: 1.75 } as const

export function MarkdownView() {
  const design = useScanStore((s) => s.design)
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
        {infoOpen && design ? <MarkdownInfoPanel tab={tab} onClose={() => setInfoOpen(false)} /> : null}
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

function MarkdownInfoPanel({ tab, onClose }: { tab: 'design' | 'skill'; onClose: () => void }) {
  return (
    <section className="md-howto" aria-label={tab === 'design' ? 'How DESIGN.md works' : 'How SKILL.md works'}>
      <header className="md-howto-head">
        <h3>{tab === 'design' ? 'How DESIGN.md works' : 'How SKILL.md works'}</h3>
        <Button variant="secondary" size="sm" className="md-howto-close" onClick={onClose}>
          Close
        </Button>
      </header>
      <div className="md-howto-body">
        {tab === 'design' ? (
          <>
            <p>
              <strong>DESIGN.md</strong> is Page2Design’s design spec for the page you scanned. It is built from the
              same local scan as Overview, Colors, Typography, Content, and Assets — nothing is sent to a server.
            </p>
            <ol>
              <li>
                <strong>Scan the tab.</strong> Open a normal website, then scan (or tap Refresh here). The extension
                reads the rendered page: layout, tokens, copy, and assets.
              </li>
              <li>
                <strong>This tab writes the spec.</strong> Switch DESIGN.md / SKILL.md above. What you see is the file
                as it will be copied or downloaded — measured facts, with inferred names labeled.
              </li>
              <li>
                <strong>Copy or download.</strong> Copy puts DESIGN.md on the clipboard for Cursor, Claude Code, or
                another agent. Download saves the file. Use Export if you need the full ZIP (assets, screenshots,
                JSON).
              </li>
              <li>
                <strong>Rebuild from the spec.</strong> Give the agent DESIGN.md as the source of truth. Do not invent
                sections, copy, or images that were not captured. Treat token names as inferred and values as measured.
              </li>
              <li>
                <strong>Refresh to update.</strong> If the page changed, Refresh rescans this tab and regenerates both
                markdown files from the new scan.
              </li>
            </ol>
          </>
        ) : (
          <>
            <p>
              <strong>SKILL.md</strong> is the agent playbook for the same scan. It does not measure the page again —
              it tells an agent how to recreate the page from DESIGN.md and the export package.
            </p>
            <ol>
              <li>
                <strong>Same scan, different job.</strong> After you scan, this tab writes SKILL.md. DESIGN.md holds
                measurements; SKILL.md holds rules: what to read first, what not to invent, and in what order to
                implement and check.
              </li>
              <li>
                <strong>Give it to an agent.</strong> Copy or download SKILL.md, then place it where the agent looks
                for skills (for example <code>.cursor/skills/</code> or <code>~/.claude/skills/</code>), or keep it in
                the Export ZIP next to DESIGN.md.
              </li>
              <li>
                <strong>Read order.</strong> The skill tells the agent to use DESIGN.md, captured copy, tokens, layout,
                assets, and screenshots when those files exist — and to skip anything that was not captured.
              </li>
              <li>
                <strong>Hard rules.</strong> Use exported asset paths and exact copy. Do not rewrite headlines or add
                testimonials, logos, or stock images. If a resource failed, omit it and mention the gap.
              </li>
              <li>
                <strong>Refresh to update.</strong> Refresh rescans the tab. Both DESIGN.md and SKILL.md regenerate
                together so the playbook still matches the spec.
              </li>
            </ol>
          </>
        )}
      </div>
    </section>
  )
}
