import { describe, expect, it } from 'vitest'
import { generateDesignMarkdown } from '../generators/design-md'
import { generateSkillMarkdown } from '../generators/skill-md'
import { generateAgentsMarkdown, generateClaudeMarkdown, generateCursorRule } from '../generators/agents-md'
import { generateContentMarkdown } from '../generators/content-md'
import { generateBuildPrompt, generateValidatePrompt } from '../generators/prompts'
import { assetManifestJson, prettyJson } from '../generators/json-refs'
import { buildExportZip } from '../export/zip-exporter'
import { normalizeScan } from '../normalize/normalize-scan'
import { containsSensitiveValue } from '../validation/scan-validator'
import { sampleDesign, sampleScan } from './fixtures'

describe('markdown generators', () => {
  const design = sampleDesign()

  it('writes page-specific DESIGN.md without fake observations', () => {
    const md = generateDesignMarkdown(design)
    expect(md).toContain('Page2Design fixture')
    expect(md).toContain('#1D4ED8')
    expect(md).not.toMatch(/make it modern|pixel perfect|95% design match/i)
    expect(md).toContain('assets/images/asset_1.png')
    expect(md).toContain('/images/asset_1.png')
    expect(md).toContain('420×262')
    expect(md).toContain('w-[420px] h-[262px]')
    expect(md).toContain('Copy `assets/` into the app `public/` folder')
  })

  it('keeps SKILL.md procedural and under 500 lines', () => {
    const md = generateSkillMarkdown(design)
    expect(md.startsWith('---')).toBe(true)
    expect(md).toContain('name: recreate-scanned-page')
    expect(md.split('\n').length).toBeLessThan(500)
  })

  it('generates agent, claude, cursor, content, and prompt files', () => {
    expect(generateAgentsMarkdown(design)).toContain('Read `docs/DESIGN.md` first')
    expect(generateAgentsMarkdown(design)).toContain('assets/images/*')
    expect(generateAgentsMarkdown(design)).toContain('public/images/*')
    expect(generateSkillMarkdown(design)).toContain('docs/DESIGN.md')
    expect(generateBuildPrompt(design)).toContain('docs/prompts/VALIDATE_PAGE.md')
    expect(generateClaudeMarkdown(design)).toContain('Claude Code')
    expect(generateCursorRule(design)).toContain('alwaysApply: false')
    expect(generateContentMarkdown(design.content)).toContain('Measured design, not guessed style')
    expect(generateBuildPrompt(design)).toContain('Inspect the target repository')
    expect(generateValidatePrompt(design)).toContain('Font loading and typography')
  })
})

describe('zip paths', () => {
  it('creates a single archive with safe paths', async () => {
    const design = sampleDesign()
    const zip = await buildExportZip({
      raw: sampleScan(),
      design,
      assetFiles: new Map([['assets/images/asset_1.png', new Uint8Array([1, 2, 3])]]),
      screenshot: { viewport: new Uint8Array([1, 2, 3]), fullPage: new Uint8Array([4, 5, 6]) },
    })
    expect(zip.filename).toMatch(/\.zip$/)
    expect(zip.paths.every((path) => !path.includes('..'))).toBe(true)
    expect(zip.paths.some((path) => path.endsWith('docs/DESIGN.md'))).toBe(true)
    expect(zip.paths.some((path) => path.endsWith('AGENTS.md'))).toBe(true)
    expect(zip.paths.some((path) => path.endsWith('docs/prompts/BUILD_PAGE.md'))).toBe(true)
    expect(zip.paths.some((path) => path.endsWith('docs/screenshots/viewport.png'))).toBe(true)
    expect(zip.paths.some((path) => path.endsWith('docs/screenshots/full-page.png'))).toBe(true)
    expect(zip.paths.some((path) => path.includes('/docs/references/'))).toBe(true)
    expect(zip.paths.some((path) => path.endsWith('assets/images/asset_1.png'))).toBe(true)
    expect(zip.paths.every((path) => !path.includes('/docs/assets/'))).toBe(true)
    expect(zip.paths.every((path) => !path.includes('-design-export/prompts/'))).toBe(true)
    expect(zip.paths.every((path) => !path.includes('-design-export/references/'))).toBe(true)
    expect(zip.paths.every((path) => !path.includes('-design-export/screenshots/'))).toBe(true)
    expect(zip.paths.every((path) => !path.includes('-design-export/DESIGN.md'))).toBe(true)
    expect(prettyJson(assetManifestJson(design))).toContain('asset_1')
    expect(prettyJson(assetManifestJson(design))).toContain('"/images/asset_1.png"')
  })
})

describe('palette clustering', () => {
  it('merges near-duplicate colors and drops unused variables', () => {
    const scan = sampleScan()
    scan.colors = [
      {
        original: ['#111111'],
        canonicalRgba: 'rgba(17, 17, 17, 1)',
        canonicalHex: '#111111',
        properties: ['color'],
        count: 40,
        elementIds: ['el_1'],
        source: 'text',
      },
      {
        original: ['#121212'],
        canonicalRgba: 'rgba(18, 18, 18, 1)',
        canonicalHex: '#121212',
        properties: ['color'],
        count: 8,
        elementIds: ['el_2'],
        source: 'text',
      },
      {
        original: ['#ffffff'],
        canonicalRgba: 'rgba(255, 255, 255, 1)',
        canonicalHex: '#FFFFFF',
        properties: ['background-color'],
        count: 20,
        elementIds: ['el_3'],
        source: 'background',
      },
      {
        original: ['#1111111A'],
        canonicalRgba: 'rgba(17, 17, 17, 0.1)',
        canonicalHex: '#1111111A',
        properties: ['box-shadow'],
        count: 3,
        elementIds: ['el_4'],
        source: 'shadow',
      },
      {
        original: ['#abc'],
        canonicalRgba: 'rgba(10, 20, 30, 1)',
        canonicalHex: '#0A141E',
        properties: ['--token'],
        count: 1,
        elementIds: ['root'],
        source: 'variable',
      },
    ]
    const design = normalizeScan(scan)
    expect(design.tokens.colors.length).toBeLessThanOrEqual(3)
    expect(design.tokens.colors.some((color) => color.hex === '#111111')).toBe(true)
  })

  it('keeps computed gradients as gradient tokens', () => {
    const scan = sampleScan()
    scan.colors = [
      {
        original: ['radial-gradient(circle, rgb(255, 145, 77) 0%, rgb(255, 255, 255) 70%)'],
        canonicalRgba: 'rgba(255, 145, 77, 1)',
        canonicalHex: '#FF914D',
        properties: ['background-image'],
        count: 2,
        elementIds: ['el_1'],
        source: 'gradient',
      },
      {
        original: ['#101828'],
        canonicalRgba: 'rgba(16, 24, 40, 1)',
        canonicalHex: '#101828',
        properties: ['color'],
        count: 12,
        elementIds: ['el_2'],
        source: 'text',
      },
    ]
    const design = normalizeScan(scan)
    expect(design.tokens.colors.some((color) => color.kind === 'gradient')).toBe(true)
    expect(design.tokens.colors.find((color) => color.kind === 'gradient')?.css).toContain('radial-gradient')
  })
})

describe('normalization and privacy', () => {
  it('normalizes deterministically and omits secrets', () => {
    const a = normalizeScan(sampleScan())
    const b = normalizeScan(sampleScan())
    expect(a.tokens.colors[0]?.hex).toBe(b.tokens.colors[0]?.hex)
    expect(containsSensitiveValue(a, ['super-secret-password-123', 'hidden-auth-token'])).toBe(false)
  })
})
