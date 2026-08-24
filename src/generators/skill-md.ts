import type { NormalizedDesign } from '../shared/types'
import { escapeMarkdown } from '../normalize/markdown-escape'

export function generateSkillMarkdown(design: NormalizedDesign): string {
  const title = design.metadata.title || design.metadata.hostname
  const body = `---
name: recreate-scanned-page
description: Recreate and visually validate this scanned reference page using its captured design specification, content, assets, tokens, layouts, and screenshots. Use when implementing or repairing the exported reference interface in a frontend project.
---

# Recreate ${escapeMarkdown(title)}

## Read first

1. \`DESIGN.md\`
2. \`references/CONTENT.md\`
3. \`references/design-tokens.json\`
4. \`references/layout.json\`
5. \`references/asset-manifest.json\`
6. \`references/limitations.json\`
7. \`screenshots/\` if present

Do not invent page-specific details that are absent from those files.

## Hard rules

- Use the supplied assets at their exported local paths.
- Use the exact captured copy. Do not rewrite headlines, labels, or link text.
- Treat token **names** as inferred and token **values** as measured unless labeled otherwise.
- Do not add sections, testimonials, metrics, logos, or images that were not captured.
- If a resource failed to download, omit it and mention the gap. Do not substitute stock art.

## Implementation order

1. Inspect the target repository and keep its framework.
2. Recreate document structure from the captured sections, in order.
3. Apply measured typography and color tokens.
4. Place images, icons, and SVG using exported files.
5. Apply spacing, radius, and shadow tokens.
6. Recreate inferred component patterns without renaming captured content.
7. Validate visually.

## Facts vs inferences

- Measured: viewport, bounds, computed colors, type sizes, captured copy.
- Inferred: token names, section names without semantics, component pattern labels.
- Not captured: other breakpoints, hover/focus visuals unless recorded, source components, backend logic.

## Responsive validation

Use every captured viewport in \`references/layout.json\`. Primary scan viewport: ${design.page.viewportWidth}×${design.page.viewportHeight}.

## Screenshot checking

If \`screenshots/viewport.png\` or \`screenshots/full-page.png\` exist, compare against them. Do not infer visual similarity from code review alone.

## Fix order for visual diffs

1. Font loading and typography
2. Viewport and container geometry
3. Section height and layout
4. Spacing and alignment
5. Image/icon size and crop
6. Colors and gradients
7. Borders, radius, and shadows
8. Responsive behavior
9. Interaction states
10. Minor decoration

Detailed measurements stay in \`DESIGN.md\` and \`references/\`. Do not duplicate them here.
`
  return body.trim() + '\n'
}
