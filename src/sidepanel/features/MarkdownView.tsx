import { useState } from 'react'
import { CircleHelp, Copy, Download, RefreshCw } from 'lucide-react'
import { generateAgentsMarkdown, generateClaudeMarkdown, generateCursorRule } from '../../generators/agents-md'
import { generateContentMarkdown } from '../../generators/content-md'
import { generateDesignMarkdown } from '../../generators/design-md'
import {
  assetManifestJson,
  designTokensJson,
  layoutJson,
  limitationsJson,
  prettyJson,
  scanJson,
} from '../../generators/json-refs'
import { generateBuildPrompt, generateValidatePrompt } from '../../generators/prompts'
import { generateSkillMarkdown } from '../../generators/skill-md'
import { Button } from '../components/Button'
import { ScanPrompt } from '../components/CopyButton'
import { startScan } from '../scan-flow'
import { useScanStore } from '../store/useScanStore'
import { useToastStore } from '../toast'
import type { NormalizedDesign, PageScan } from '../../shared/types'

const STROKE = { size: 14, strokeWidth: 1.75 } as const

interface Pack {
  design: NormalizedDesign
  raw: PageScan | null
}

const FILES = [
  { id: 'agents', path: 'AGENTS.md', hint: 'Start here', build: (p: Pack) => generateAgentsMarkdown(p.design) },
  { id: 'design', path: 'DESIGN.md', hint: 'Spec', build: (p: Pack) => generateDesignMarkdown(p.design) },
  { id: 'skill', path: 'SKILL.md', hint: 'Playbook', build: (p: Pack) => generateSkillMarkdown(p.design) },
  { id: 'claude', path: 'CLAUDE.md', hint: 'Claude', build: (p: Pack) => generateClaudeMarkdown(p.design) },
  {
    id: 'cursor',
    path: '.cursor/rules/recreate-reference-page.mdc',
    hint: 'Cursor',
    build: (p: Pack) => generateCursorRule(p.design),
  },
  { id: 'build', path: 'prompts/BUILD_PAGE.md', hint: 'Build', build: (p: Pack) => generateBuildPrompt(p.design) },
  {
    id: 'validate',
    path: 'prompts/VALIDATE_PAGE.md',
    hint: 'Check',
    build: (p: Pack) => generateValidatePrompt(p.design),
  },
  {
    id: 'content',
    path: 'references/CONTENT.md',
    hint: 'Copy',
    build: (p: Pack) => generateContentMarkdown(p.design.content),
  },
  {
    id: 'tokens',
    path: 'references/design-tokens.json',
    hint: 'Tokens',
    build: (p: Pack) => prettyJson(designTokensJson(p.design)),
  },
  {
    id: 'layout',
    path: 'references/layout.json',
    hint: 'Layout',
    build: (p: Pack) => prettyJson(layoutJson(p.design)),
  },
  {
    id: 'scan',
    path: 'references/scan.json',
    hint: 'Scan',
    build: (p: Pack) => (p.raw ? prettyJson(scanJson(p.raw)) : 'Scan JSON is available after a completed scan.\n'),
  },
  {
    id: 'manifest',
    path: 'references/asset-manifest.json',
    hint: 'Assets',
    build: (p: Pack) => prettyJson(assetManifestJson(p.design)),
  },
  {
    id: 'limits',
    path: 'references/limitations.json',
    hint: 'Gaps',
    build: (p: Pack) => prettyJson(limitationsJson(p.design)),
  },
] as const

type FileId = (typeof FILES)[number]['id']

export function MarkdownView() {
  const design = useScanStore((s) => s.design)
  const raw = useScanStore((s) => s.raw)
  const phase = useScanStore((s) => s.phase)
  const tabRestricted = useScanStore((s) => s.tabRestricted)
  const [fileId, setFileId] = useState<FileId>('agents')
  const [infoOpen, setInfoOpen] = useState(false)
  const busy = ['preparing', 'lazy-loading', 'scanning', 'normalizing', 'validating'].includes(phase)
  const selected = FILES.find((file) => file.id === fileId) ?? FILES[0]

  if (!design && !busy) return <ScanPrompt afterScan="Scan this page to generate the export markdown files." />

  const markdown = design ? selected.build({ design, raw }) : 'Refreshing from the page…'

  return (
    <div className="md-wrap">
      <div className="md-files" role="tablist" aria-label="Export files in read order">
        {FILES.map((file, index) => {
          const on = file.id === selected.id
          return (
            <button
              key={file.id}
              type="button"
              role="tab"
              className={on ? 'md-file on' : 'md-file'}
              aria-selected={on}
              onClick={() => setFileId(file.id)}>
              <span className="md-file-num">{index + 1}</span>
              <span className="md-file-name">{file.path}</span>
              <span className="md-file-hint">{file.hint}</span>
            </button>
          )
        })}
      </div>
      {infoOpen && design ? <MarkdownInfoPanel onClose={() => setInfoOpen(false)} /> : null}
      <div className="md-frame">
        <div className="md-toolbar">
          <button
            type="button"
            className="icon-btn md-tool"
            aria-label="Copy to clipboard"
            disabled={!design}
            onClick={() => void copyMarkdown(markdown, selected.path)}>
            <Copy {...STROKE} aria-hidden="true" />
            <span className="tip tip-below tip-end">Copy</span>
          </button>
          <button
            type="button"
            className="icon-btn md-tool"
            aria-label="Download file"
            disabled={!design}
            onClick={() => void downloadMarkdown(markdown, fileName(selected.path))}>
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
  )
}

function fileName(path: string): string {
  return path.split('/').pop() || path
}

async function copyMarkdown(markdown: string, path: string): Promise<void> {
  await navigator.clipboard.writeText(markdown)
  useToastStore.getState().showToast(`${path} copied`)
}

async function downloadMarkdown(markdown: string, filename: string): Promise<void> {
  const type = filename.endsWith('.json') ? 'application/json' : 'text/markdown;charset=utf-8'
  const blob = new Blob([markdown], { type })
  const url = URL.createObjectURL(blob)
  await chrome.downloads.download({ url, filename, saveAs: true })
  URL.revokeObjectURL(url)
  useToastStore.getState().showToast(`${filename} downloaded`)
}

async function refreshMarkdown(): Promise<void> {
  useToastStore.getState().showToast('Refreshing from page…')
  await startScan()
}

function MarkdownInfoPanel({ onClose }: { onClose: () => void }) {
  return (
    <section className="md-howto" aria-label="How to use the export files">
      <header className="md-howto-head">
        <h3>How to use the files</h3>
        <Button variant="secondary" size="sm" className="md-howto-close" onClick={onClose}>
          Close
        </Button>
      </header>
      <div className="md-howto-body">
        <p>
          The numbered list above matches the Export ZIP. Start at <strong>AGENTS.md</strong>, then open files in that
          order. <code>references/</code> is the measured data the spec points at.
        </p>
        <ol>
          <li>
            <strong>AGENTS.md</strong> — start here. Then <code>DESIGN.md</code>, <code>SKILL.md</code>,{' '}
            <code>CLAUDE.md</code>, the Cursor rule, and the prompts.
          </li>
          <li>
            <strong>references/CONTENT.md</strong> — exact captured copy. Do not invent missing text.
          </li>
          <li>
            <strong>references/design-tokens.json</strong> — colors, type, spacing, radius, shadows.
          </li>
          <li>
            <strong>references/layout.json</strong> — page geometry, sections, components, viewports.
          </li>
          <li>
            <strong>references/scan.json</strong> — raw scan metadata and coverage.
          </li>
          <li>
            <strong>references/asset-manifest.json</strong> — local paths for files in <code>assets/</code>.
          </li>
          <li>
            <strong>references/limitations.json</strong> — gaps. Do not invent a visual-match percentage.
          </li>
        </ol>
      </div>
    </section>
  )
}
