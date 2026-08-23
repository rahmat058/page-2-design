import type { NormalizedDesign } from '../shared/types';
import { escapeMarkdown } from '../normalize/markdown-escape';

export function generateAgentsMarkdown(design: NormalizedDesign): string {
  return `# Agent instructions

This repository export describes **${escapeMarkdown(design.metadata.title || design.metadata.hostname)}**.

## Before coding

1. Read \`DESIGN.md\` first.
2. Inspect the target project. Keep its framework, routing, and styling approach.
3. Reuse files in \`assets/\` instead of redownloading remote URLs.
4. Use exact copy from \`references/CONTENT.md\`.

## While implementing

- Build reusable components only when they preserve measured visual fidelity.
- Do not replace captured content with generated marketing copy.
- Do not add dependencies unless the target project already requires them or a gap cannot be closed otherwise.
- Distinguish measured facts from inferred token names.

## After implementing

- Run the target project's lint, type-check, test, and build commands.
- Validate at every captured viewport: ${
    design.responsive
      .filter((item) => item.captured)
      .map((item) => `${item.label ?? 'viewport'} ${item.viewportWidth}×${item.viewportHeight}`)
      .join(', ') || `${design.page.viewportWidth}×${design.page.viewportHeight}`
  }.
- Compare \`screenshots/viewport.png\` and \`screenshots/full-page.png\` when those files exist.
- Report inaccessible or uncertain details honestly. Never invent a visual-match percentage.
`;
}

export function generateClaudeMarkdown(design: NormalizedDesign): string {
  return `# Claude Code instructions

Recreate the scanned page **${escapeMarkdown(design.metadata.title || design.metadata.hostname)}**.

- Read \`DESIGN.md\`, then \`references/\`, then any files in \`screenshots/\`.
- Keep the target project's stack.
- Use exported assets and exact captured copy.
- Follow \`prompts/BUILD_PAGE.md\` for implementation and \`prompts/VALIDATE_PAGE.md\` for correction.
- Captured viewports: ${
    design.responsive
      .filter((item) => item.captured)
      .map((item) => `${item.viewportWidth}×${item.viewportHeight}`)
      .join(', ') || `${design.page.viewportWidth}×${design.page.viewportHeight}`
  }.
- Do not invent missing sections, assets, or testimonials.
`;
}

export function generateCursorRule(design: NormalizedDesign): string {
  return `---
description: Recreate the scanned reference page from this export package. Apply only when implementing or repairing that captured page.
globs:
  - "**/*.{html,css,scss,js,jsx,ts,tsx,vue,svelte}"
alwaysApply: false
---

# Recreate scanned reference page

When the user is recreating the page described in this export:

1. Read \`DESIGN.md\` and \`references/CONTENT.md\` before editing.
2. Use assets from \`assets/\` and tokens from \`references/design-tokens.json\`.
3. Do not invent copy, sections, or imagery.
4. Compare against \`screenshots/viewport.png\` and \`screenshots/full-page.png\` when those files exist.
5. Use every captured viewport in \`references/layout.json\`. Primary measured viewport: ${design.page.viewportWidth}×${design.page.viewportHeight}.
6. This rule is scoped to reference-page recreation. Do not apply it to unrelated work.

Schema version is recorded in \`references/scan.json\`.
`;
}
