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
import { PKG } from './package-paths'

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

  add(PKG.agents, generateAgentsMarkdown(input.design))
  add(PKG.claude, generateClaudeMarkdown(input.design))
  add(PKG.skill, generateSkillMarkdown(input.design))
  add(PKG.cursorRule, generateCursorRule(input.design))
  add(PKG.design, generateDesignMarkdown(input.design))
  add(PKG.buildPrompt, generateBuildPrompt(input.design))
  add(PKG.validatePrompt, generateValidatePrompt(input.design))
  add(PKG.content, generateContentMarkdown(input.design.content))
  add(PKG.tokens, prettyJson(designTokensJson(input.design)))
  add(PKG.layout, prettyJson(layoutJson(input.design)))
  add(PKG.scan, prettyJson(scanJson(input.raw)))
  add(PKG.manifest, prettyJson(assetManifestJson(input.design)))
  add(PKG.limitations, prettyJson(limitationsJson(input.design)))

  if (input.screenshot?.viewport) {
    add(PKG.screenshotViewport, input.screenshot.viewport)
  }
  if (input.screenshot?.fullPage) {
    add(PKG.screenshotFull, input.screenshot.fullPage)
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
