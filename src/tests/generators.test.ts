import { describe, expect, it } from 'vitest';
import { generateDesignMarkdown } from '../generators/design-md';
import { generateSkillMarkdown } from '../generators/skill-md';
import {
  generateAgentsMarkdown,
  generateClaudeMarkdown,
  generateCursorRule,
} from '../generators/agents-md';
import { generateContentMarkdown } from '../generators/content-md';
import { generateBuildPrompt, generateValidatePrompt } from '../generators/prompts';
import { assetManifestJson, prettyJson } from '../generators/json-refs';
import { buildExportZip } from '../export/zip-exporter';
import { normalizeScan } from '../normalize/normalize-scan';
import { containsSensitiveValue } from '../validation/scan-validator';
import { sampleDesign, sampleScan } from './fixtures';

describe('markdown generators', () => {
  const design = sampleDesign();

  it('writes page-specific DESIGN.md without fake observations', () => {
    const md = generateDesignMarkdown(design);
    expect(md).toContain('Page2Design fixture');
    expect(md).toContain('#1D4ED8');
    expect(md).not.toMatch(/make it modern|pixel perfect|95% design match/i);
    expect(md).toContain('assets/images/asset_1.png');
  });

  it('keeps SKILL.md procedural and under 500 lines', () => {
    const md = generateSkillMarkdown(design);
    expect(md.startsWith('---')).toBe(true);
    expect(md).toContain('name: recreate-scanned-page');
    expect(md.split('\n').length).toBeLessThan(500);
  });

  it('generates agent, claude, cursor, content, and prompt files', () => {
    expect(generateAgentsMarkdown(design)).toContain('Read `DESIGN.md` first');
    expect(generateClaudeMarkdown(design)).toContain('Claude Code');
    expect(generateCursorRule(design)).toContain('alwaysApply: false');
    expect(generateContentMarkdown(design.content)).toContain('Measured design, not guessed style');
    expect(generateBuildPrompt(design)).toContain('Inspect the target repository');
    expect(generateValidatePrompt(design)).toContain('Font loading and typography');
  });
});

describe('zip paths', () => {
  it('creates a single archive with safe paths', async () => {
    const design = sampleDesign();
    const zip = await buildExportZip({
      raw: sampleScan(),
      design,
      assetFiles: new Map(),
      screenshot: { viewport: new Uint8Array([1, 2, 3]), fullPage: new Uint8Array([4, 5, 6]) },
    });
    expect(zip.filename).toMatch(/\.zip$/);
    expect(zip.paths.every((path) => !path.includes('..'))).toBe(true);
    expect(zip.paths.some((path) => path.endsWith('DESIGN.md'))).toBe(true);
    expect(zip.paths.some((path) => path.endsWith('screenshots/viewport.png'))).toBe(true);
    expect(zip.paths.some((path) => path.endsWith('screenshots/full-page.png'))).toBe(true);
    expect(prettyJson(assetManifestJson(design))).toContain('asset_1');
  });
});

describe('normalization and privacy', () => {
  it('normalizes deterministically and omits secrets', () => {
    const a = normalizeScan(sampleScan());
    const b = normalizeScan(sampleScan());
    expect(a.tokens.colors[0]?.hex).toBe(b.tokens.colors[0]?.hex);
    expect(containsSensitiveValue(a, ['super-secret-password-123', 'hidden-auth-token'])).toBe(
      false,
    );
  });
});
