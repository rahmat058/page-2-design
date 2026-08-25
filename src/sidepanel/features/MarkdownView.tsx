import { useMemo, useState } from 'react'
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
import { PKG } from '../../export/package-paths'
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
  { value: 'docs', label: 'Docs' },
  { value: 'references', label: 'References' },
] as const

type GroupId = (typeof GROUPS)[number]['value']

const FILES = [
  {
    id: 'agents',
    group: 'guide',
    path: PKG.agents,
    name: 'AGENTS.md',
    hint: 'Start here',
    build: (p: Pack) => generateAgentsMarkdown(p.design),
  },
  {
    id: 'claude',
    group: 'guide',
    path: PKG.claude,
    name: 'CLAUDE.md',
    hint: 'Claude',
    build: (p: Pack) => generateClaudeMarkdown(p.design),
  },
  {
    id: 'skill',
    group: 'guide',
    path: PKG.skill,
    name: 'SKILL.md',
    hint: 'Playbook',
    build: (p: Pack) => generateSkillMarkdown(p.design),
  },
  {
    id: 'cursor',
    group: 'guide',
    path: PKG.cursorRule,
    name: 'recreate-reference-page.mdc',
    hint: 'Cursor',
    build: (p: Pack) => generateCursorRule(p.design),
  },
  {
    id: 'design',
    group: 'docs',
    path: PKG.design,
    name: 'DESIGN.md',
    hint: 'Spec',
    build: (p: Pack) => generateDesignMarkdown(p.design),
  },
  {
    id: 'build',
    group: 'docs',
    path: PKG.buildPrompt,
    name: 'BUILD_PAGE.md',
    hint: 'Build',
    build: (p: Pack) => generateBuildPrompt(p.design),
  },
  {
    id: 'validate',
    group: 'docs',
    path: PKG.validatePrompt,
    name: 'VALIDATE_PAGE.md',
    hint: 'Check',
    build: (p: Pack) => generateValidatePrompt(p.design),
  },
  {
    id: 'content',
    group: 'references',
    path: PKG.content,
    name: 'CONTENT.md',
    hint: 'Copy',
    build: (p: Pack) => generateContentMarkdown(p.design.content ?? [], p.design.sections ?? []),
  },
  {
    id: 'tokens',
    group: 'references',
    path: PKG.tokens,
    name: 'design-tokens.json',
    hint: 'Tokens',
    build: (p: Pack) => prettyJson(designTokensJson(p.design)),
  },
  {
    id: 'layout',
    group: 'references',
    path: PKG.layout,
    name: 'layout.json',
    hint: 'Layout',
    build: (p: Pack) => prettyJson(layoutJson(p.design)),
  },
  {
    id: 'scan',
    group: 'references',
    path: PKG.scan,
    name: 'scan.json',
    hint: 'Scan',
    build: (p: Pack) => (p.raw ? prettyJson(scanJson(p.raw)) : 'Scan JSON is available after a completed scan.\n'),
  },
  {
    id: 'manifest',
    group: 'references',
    path: PKG.manifest,
    name: 'asset-manifest.json',
    hint: 'Assets',
    build: (p: Pack) => prettyJson(assetManifestJson(p.design)),
  },
  {
    id: 'limits',
    group: 'references',
    path: PKG.limitations,
    name: 'limitations.json',
    hint: 'Gaps',
    build: (p: Pack) => prettyJson(limitationsJson(p.design)),
  },
] as const

type FileId = (typeof FILES)[number]['id']
const PREVIEW_CHARS = 120_000

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
  const selected = files.find((file) => file.id === fileId) ?? files[0] ?? FILES[0]
  const markdown = useMemo(() => {
    if (!design) return 'Refreshing from the page…'
    return buildFile(selected, { design, raw })
  }, [design, raw, selected])

  if (!design && !busy) return <ScanPrompt afterScan="Scan this page to generate the export markdown files." />

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
          <pre className="md-preview" tabIndex={0}>
            {previewText(markdown)}
          </pre>
        </div>
      </div>
    </CollectionShell>
  )
}

function buildFile(file: (typeof FILES)[number], pack: Pack): string {
  try {
    return file.build(pack)
  } catch (error) {
    const detail = error instanceof Error ? error.stack || error.message : String(error)
    return `# Could not generate ${file.path}\n\n${detail}\n`
  }
}

function previewText(markdown: string): string {
  if (markdown.length <= PREVIEW_CHARS) return markdown
  return `${markdown.slice(0, PREVIEW_CHARS)}\n\n… Preview truncated. Download the file to read the rest.\n`
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
          Unzip the Export package, then start at <strong>AGENTS.md</strong>. Specs live under <code>docs/</code>. Copy{' '}
          <code>assets/</code> into the app <code>public/</code> folder. Screenshots stay in{' '}
          <code>docs/screenshots/</code> for visual comparison.
        </p>
        <ol>
          <li>
            <strong>Guide (root).</strong> <code>AGENTS.md</code> first, then <code>CLAUDE.md</code>,{' '}
            <code>SKILL.md</code>, and <code>.cursor/rules/</code>. These stay next to <code>assets/</code>.
          </li>
          <li>
            <strong>Copy assets.</strong> Move <code>assets/images</code>, <code>icons</code>, <code>svg</code>, and{' '}
            <code>fonts</code> into <code>public/</code> (Vite, CRA, Next.js). Use <code>/images/...</code> URLs.
          </li>
          <li>
            <strong>Docs.</strong> <code>docs/DESIGN.md</code> section 5 carries the page&rsquo;s{' '}
            <em>captured markup</em> — real tags, real class names, real text. Header, footer, and every section use
            that same tree. Port it node for node (reuse Tailwind classes verbatim), then colors, type, image size, and
            motion last.
          </li>
          <li>
            <strong>Media.</strong> <code>&lt;video&gt;</code> and <code>&lt;canvas&gt;</code> are captured as still
            images; <code>&lt;iframe&gt;</code> and <code>&lt;cal-inline&gt;</code> become sized placeholders. The
            rebuild keeps those stand-ins instead of replaying media or recreating an embed&rsquo;s interior.
          </li>
          <li>
            <strong>References.</strong> Exact copy, tokens, layout, scan, asset manifest, and limitations under{' '}
            <code>docs/references/</code>.
          </li>
          <li>
            <strong>Build.</strong> Keep the stack. Prefer Tailwind. Match each section’s markup before adding
            animation. Validate with <code>docs/prompts/VALIDATE_PAGE.md</code> and screenshots.
          </li>
        </ol>
      </div>
    </section>
  )
}
