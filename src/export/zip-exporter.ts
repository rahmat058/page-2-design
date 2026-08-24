import JSZip from 'jszip'
import type { NormalizedDesign, PageScan } from '../shared/types'
import { generateAgentsMarkdown, generateClaudeMarkdown, generateCursorRule } from '../generators/agents-md'
import { generateContentMarkdown } from '../generators/content-md'
import { generateDesignMarkdown } from '../generators/design-md'
import {
  assetManifestJson,
  designTokensJson,
  layoutJson,
  limitationsJson,
  prettyJson,
  scanJson,
} from '../generators/json-refs'
import { generateBuildPrompt, generateValidatePrompt } from '../generators/prompts'
import { generateSkillMarkdown } from '../generators/skill-md'
import { assertSafeZipPath, exportFolderName, zipDownloadName } from './filename'

export interface ZipInput {
  raw: PageScan
  design: NormalizedDesign
  assetFiles: Map<string, Uint8Array>
  screenshot?: { viewport?: Uint8Array | null; fullPage?: Uint8Array | null }
}

export interface ZipResult {
  blob: Blob
  filename: string
  folder: string
  paths: string[]
}

export async function buildExportZip(input: ZipInput): Promise<ZipResult> {
  const folder = exportFolderName(input.design.metadata.hostname, input.design.metadata.scannedAt)
  const zip = new JSZip()
  const root = zip.folder(folder)
  if (!root) throw new Error('Could not create export folder')
  const paths: string[] = []

  const add = (path: string, content: string | Uint8Array) => {
    const safe = assertSafeZipPath(path)
    root.file(safe, content)
    paths.push(`${folder}/${safe}`)
  }

  add('DESIGN.md', generateDesignMarkdown(input.design))
  add('AGENTS.md', generateAgentsMarkdown(input.design))
  add('CLAUDE.md', generateClaudeMarkdown(input.design))
  add('SKILL.md', generateSkillMarkdown(input.design))
  add('.cursor/rules/recreate-reference-page.mdc', generateCursorRule(input.design))
  add('prompts/BUILD_PAGE.md', generateBuildPrompt(input.design))
  add('prompts/VALIDATE_PAGE.md', generateValidatePrompt(input.design))
  add('references/CONTENT.md', generateContentMarkdown(input.design.content))
  add('references/design-tokens.json', prettyJson(designTokensJson(input.design)))
  add('references/layout.json', prettyJson(layoutJson(input.design)))
  add('references/scan.json', prettyJson(scanJson(input.raw)))
  add('references/asset-manifest.json', prettyJson(assetManifestJson(input.design)))
  add('references/limitations.json', prettyJson(limitationsJson(input.design)))

  if (input.screenshot?.viewport) {
    add('screenshots/viewport.png', input.screenshot.viewport)
  }
  if (input.screenshot?.fullPage) {
    add('screenshots/full-page.png', input.screenshot.fullPage)
  }

  for (const [path, bytes] of input.assetFiles) {
    add(path, bytes)
  }

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  return {
    blob,
    filename: zipDownloadName(input.design.metadata.hostname, input.design.metadata.scannedAt),
    folder,
    paths,
  }
}
