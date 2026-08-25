import { useState } from 'react'
import { Copy, Download } from 'lucide-react'
import { generateDesignMarkdown } from '../../generators/design-md'
import { generateSkillMarkdown } from '../../generators/skill-md'
import { Button } from '../components/Button'
import { ScanPrompt } from '../components/CopyButton'
import { CollectionShell } from '../components/Segmented'
import { useScanStore } from '../store/useScanStore'
import { useToastStore } from '../toast'

const MD_TABS = [
  { value: 'design', label: 'DESIGN.md' },
  { value: 'skill', label: 'SKILL.md' },
] as const

export function MarkdownView() {
  const design = useScanStore((s) => s.design)
  const [tab, setTab] = useState<'design' | 'skill'>('design')
  if (!design) return <ScanPrompt afterScan="Scan this page to generate DESIGN.md and SKILL.md." />

  const filename = tab === 'design' ? 'DESIGN.md' : 'SKILL.md'
  const markdown = tab === 'design' ? generateDesignMarkdown(design) : generateSkillMarkdown(design)

  return (
    <CollectionShell value={tab} options={MD_TABS} onChange={setTab} label="Generated markdown">
      <div className="md-wrap">
        <div className="md-toolbar">
          <Button size="sm" icon={Copy} onClick={() => void copyMarkdown(markdown, filename)}>
            Copy
          </Button>
          <Button size="sm" icon={Download} onClick={() => void downloadMarkdown(markdown, filename)}>
            Download
          </Button>
        </div>
        <pre className="md-preview">{markdown}</pre>
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
