import type { NormalizedDesign } from '../shared/types'
import { PKG } from '../export/package-paths'
import { escapeMarkdown } from '../normalize/markdown-escape'

export function generateSkillMarkdown(design: NormalizedDesign): string {
  const title = design.metadata.title || design.metadata.hostname
  const body = `---
name: recreate-scanned-page
description: Recreate and visually validate this scanned reference page using its captured design specification, content, assets, tokens, layouts, and screenshots. Use when implementing or repairing the exported reference interface in a frontend project.
---

# Recreate ${escapeMarkdown(title)}

## Read first

1. \`${PKG.agents}\`
2. \`${PKG.design}\`
3. \`${PKG.content}\`
4. \`${PKG.tokens}\`
5. \`${PKG.layout}\`
6. \`${PKG.manifest}\`
7. \`${PKG.limitations}\`
8. \`docs/screenshots/\` if present

Do not invent page-specific details that are absent from those files.

## Hard rules

- Copy \`assets/\` into \`public/\` (Vite, CRA, Next.js). Serve images as \`/images/...\`, icons as \`/icons/...\`, SVG as \`/svg/...\`.
- Use exact captured copy. Do not rewrite headlines, labels, or link text.
- Treat token **names** as inferred and token **values** as measured unless labeled otherwise.
- Match **button fill, text color, radius, and shadow**. Match **image width and height** to rendered sizes.
- Recreate header, nav, every captured section, and footer in order with semantic landmarks.
- Prefer Tailwind arbitrary values that copy measured CSS. Do not invent a parallel palette.
- Do not add sections, testimonials, metrics, logos, or images that were not captured.
- If a resource failed to download, omit it and mention the gap. Do not substitute stock art.

## Implementation order

1. Inspect the target repository and keep its framework.
2. Copy \`assets/\` → \`public/\`.
3. Recreate document structure from captured sections, in order (\`header\`, \`nav\`, \`main\`, \`footer\`).
4. Apply measured typography and color tokens.
5. Place images with exact rendered width and height.
6. Apply spacing, radius, and shadow tokens, then recorded motion.
7. Validate visually against screenshots.

## Facts vs inferences

- Measured: viewport, bounds, computed colors, type sizes, image rendered size, captured copy, shadows.
- Inferred: token names, section names without semantics, component pattern labels.
- Not captured: other breakpoints, hover/focus visuals unless recorded, source components, backend logic.

## Responsive validation

Use every captured viewport in \`${PKG.layout}\`. Primary scan viewport: ${design.page.viewportWidth}×${design.page.viewportHeight}.

## Screenshot checking

If \`${PKG.screenshotViewport}\` or \`${PKG.screenshotFull}\` exist, compare against them. Do not infer visual similarity from code review alone.

## Fix order for visual diffs

1. Font loading and typography
2. Viewport and container geometry
3. Header / nav / footer structure
4. Image/icon **width and height**
5. **Button color**, padding, and radius
6. Spacing and alignment
7. Shadows and borders
8. Recorded motion
9. Responsive behavior
10. Minor decoration

Detailed measurements stay in \`${PKG.design}\` and \`docs/references/\`. Do not duplicate them here.
`
  return body.trim() + '\n'
}
