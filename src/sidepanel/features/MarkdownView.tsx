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
import { CollectionShell } from '../components/Segmented'
import { startScan } from '../scan-flow'
import { useScanStore } from '../store/useScanStore'
import { useToastStore } from '../toast'
import type { NormalizedDesign, PageScan } from '../../shared/types'

const STROKE = { size: 14, strokeWidth: 1.75 } as const

interface Pack {
  design: NormalizedDesign
  raw: PageScan | null
}

const GROUPS = [
  { value: 'guide', label: 'Guide' },
  { value: 'prompts', label: 'Prompts' },
  { value: 'references', label: 'References' },
] as const

type GroupId = (typeof GROUPS)[number]['value']

const FILES = [
  { id: 'agents', group: 'guide', path: 'AGENTS.md', name: 'AGENTS.md', hint: 'Start here', build: (p: Pack) => generateAgentsMarkdown(p.design) },
  { id: 'design', group: 'guide', path: 'DESIGN.md', name: 'DESIGN.md', hint: 'Spec', build: (p: Pack) => generateDesignMarkdown(p.design) },
  { id: 'skill', group: 'guide', path: 'SKILL.md', name: 'SKILL.md', hint: 'Playbook', build: (p: Pack) => generateSkillMarkdown(p.design) },
  { id: 'claude', group: 'guide', path: 'CLAUDE.md', name: 'CLAUDE.md', hint: 'Claude', build: (p: Pack) => generateClaudeMarkdown(p.design) },
  {
    id: 'cursor',
    group: 'guide',
    path: '.cursor/rules/recreate-reference-page.mdc',
    name: 'recreate-reference-page.mdc',
    hint: 'Cursor',
    build: (p: Pack) => generateCursorRule(p.design),
  },
  { id: 'build', group: 'prompts', path: 'prompts/BUILD_PAGE.md', name: 'BUILD_PAGE.md', hint: 'Build', build: (p: Pack) => generateBuildPrompt(p.design) },
  {
    id: 'validate',
    group: 'prompts',
    path: 'prompts/VALIDATE_PAGE.md',
    name: 'VALIDATE_PAGE.md',
    hint: 'Check',
    build: (p: Pack) => generateValidatePrompt(p.design),
  },
  {
    id: 'content',
    group: 'references',
    path: 'references/CONTENT.md',
    name: 'CONTENT.md',
    hint: 'Copy',
    build: (p: Pack) => generateContentMarkdown(p.design.content),
  },
  {
    id: 'tokens',
    group: 'references',
    path: 'references/design-tokens.json',
    name: 'design-tokens.json',
    hint: 'Tokens',
    build: (p: Pack) => prettyJson(designTokensJson(p.design)),
  },
  {
    id: 'layout',
    group: 'references',
    path: 'references/layout.json',
    name: 'layout.json',
    hint: 'Layout',
    build: (p: Pack) => prettyJson(layoutJson(p.design)),
  },
  {
    id: 'scan',
    group: 'references',
    path: 'references/scan.json',
    name: 'scan.json',
    hint: 'Scan',
    build: (p: Pack) => (p.raw ? prettyJson(scanJson(p.raw)) : 'Scan JSON is available after a completed scan.\n'),
  },
  {
    id: 'manifest',
    group: 'references',
    path: 'references/asset-manifest.json',
    name: 'asset-manifest.json',
    hint: 'Assets',
    build: (p: Pack) => prettyJson(assetManifestJson(p.design)),
  },
  {
    id: 'limits',
    group: 'references',
    path: 'references/limitations.json',
    name: 'limitations.json',
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
  const [group, setGroup] = useState<GroupId>('guide')
  const [fileId, setFileId] = useState<FileId>('agents')
  const [infoOpen, setInfoOpen] = useState(false)
  const busy = ['preparing', 'lazy-loading', 'scanning', 'normalizing', 'validating'].includes(phase)
  const files = FILES.filter((file) => file.group === group)
  const selected = FILES.find((file) => file.id === fileId) ?? FILES[0]

  if (!design && !busy) return <ScanPrompt afterScan="Scan this page to generate the export markdown files." />

  const markdown = design ? selected.build({ design, raw }) : 'Refreshing from the page…'

  return (
    <CollectionShell
      value={group}
      options={GROUPS}
      label="Export folders"
      onChange={(next) => {
        setGroup(next)
        const first = FILES.find((file) => file.group === next)
        if (first) setFileId(first.id)
      }}>
      <div className="md-wrap">
        <div className="md-files" role="tablist" aria-label={group}>
          {files.map((file) => {
            const on = file.id === selected.id
            return (
              <button
                key={file.id}
                type="button"
                role="tab"
                className={on ? 'md-file on' : 'md-file'}
                aria-selected={on}
                onClick={() => setFileId(file.id)}>
                <span className="md-file-name">{file.name}</span>
                <span className="md-file-hint">{file.hint}</span>
              </button>
            )
          })}
        </div>
        {infoOpen && design ? <MarkdownInfoPanel onClose={() => setInfoOpen(false)} /> : null}
        <p className="md-path">{selected.path}</p>
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
              onClick={() => void downloadMarkdown(markdown, selected.name)}>
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
          Folders match the Export ZIP. Open them in this order, starting at <strong>AGENTS.md</strong> in Guide.
        </p>
        <ol>
          <li>
            <strong>Guide</strong> — <code>AGENTS.md</code> first, then <code>DESIGN.md</code>, <code>SKILL.md</code>,{' '}
            <code>CLAUDE.md</code>, and the Cursor rule.
          </li>
          <li>
            <strong>Prompts</strong> — <code>BUILD_PAGE.md</code> while implementing, <code>VALIDATE_PAGE.md</code> after.
          </li>
          <li>
            <strong>References</strong> — measured data: copy, tokens, layout, scan, asset paths, and limitations.
          </li>
        </ol>
      </div>
    </section>
  )
}
