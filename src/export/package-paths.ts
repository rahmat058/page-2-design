/**
 * Canonical paths inside the export package (docs, prompts, assets) and the
 * public URL rewrite used after copying assets into an app `public/` folder.
 */
export const PKG = {
  agents: 'AGENTS.md',
  claude: 'CLAUDE.md',
  skill: 'SKILL.md',
  cursorRule: '.cursor/rules/recreate-reference-page.mdc',
  design: 'docs/DESIGN.md',
  buildPrompt: 'docs/prompts/BUILD_PAGE.md',
  validatePrompt: 'docs/prompts/VALIDATE_PAGE.md',
  content: 'docs/references/CONTENT.md',
  tokens: 'docs/references/design-tokens.json',
  layout: 'docs/references/layout.json',
  scan: 'docs/references/scan.json',
  manifest: 'docs/references/asset-manifest.json',
  limitations: 'docs/references/limitations.json',
  screenshotViewport: 'docs/screenshots/viewport.png',
  screenshotFull: 'docs/screenshots/full-page.png',
} as const

/** `assets/images/x.png` → `/images/x.png` after copying `assets/` into `public/`. */
export function publicUrlFromAssetPath(localPath: string): string {
  const stripped = localPath.replace(/^assets\//, '').replace(/^\/+/, '')
  return `/${stripped}`
}
