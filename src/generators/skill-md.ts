/**
 * Generates SKILL.md describing how an agent should recreate the scanned page
 * from the export package files and hard reconstruction rules.
 */
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
- Port the **captured markup** in \`${PKG.design}\` node for node: same tags, same nesting, same order. Header, footer, and every section use the same captured tree. Do not substitute a generic landing-page layout.
- Reuse the captured class names verbatim when the target project uses the same utility framework (usually Tailwind).
- The source page also defines its own classes (\`main-container\`, \`btn-xl\`, \`bg-background-9\`). Those are inert in a fresh project. Define every class listed in the project-CSS block of \`${PKG.design}\` before porting the markup, or swap it for equivalent arbitrary utilities.
- Replace \`<video>\` and \`<canvas>\` with the captured still image; replace \`<iframe>\` and \`<cal-inline>\` with a sized placeholder. Never rebuild an embed's interior and never autoplay media.
- Prefer Tailwind arbitrary values that copy measured CSS. Do not invent a parallel palette.
- Do not add sections, testimonials, metrics, logos, or images that were not captured.
- Motion is last and must not cover copy or mockups.
- If a resource failed to download, omit it and mention the gap. Do not substitute stock art.

## Implementation order

1. Inspect the target repository and keep its framework.
2. Copy \`assets/\` → \`public/\`.
3. Add the project CSS from \`${PKG.design}\` so the captured class names resolve.
4. Rebuild the DOM from the captured markup in \`${PKG.design}\` (header, footer, and every section — keep scanned tags, including inner \`div\` wrappers).
5. Place copy and images inside the correct region.
6. Apply measured typography, color, radius, and shadow.
7. Add recorded motion only if it does not cover content.
8. Validate visually against screenshots.

## Facts vs inferences

- Measured: viewport, bounds, computed colors, type sizes, image rendered size, captured copy, shadows.
- Inferred: token names, section **role/pattern** labels, component pattern names.
- Not captured: other breakpoints, hover/focus visuals unless recorded, source components, backend logic.

## Responsive validation

Use every captured viewport in \`${PKG.layout}\`. Primary scan viewport: ${design.page.viewportWidth}×${design.page.viewportHeight}.

## Screenshot checking

If \`${PKG.screenshotViewport}\` or \`${PKG.screenshotFull}\` exist, compare against them. Do not infer visual similarity from code review alone.

## Fix order for visual diffs

1. Section count, order, role, pattern, and column count
2. Project-defined classes that resolve to nothing in the target project
3. Header / nav / footer internals
4. Font loading and typography
5. Viewport and container geometry
6. Image/icon **width and height**
7. **Button color**, padding, and radius
8. Spacing and alignment
9. Shadows and borders
10. Recorded motion (must not cover content)
11. Minor decoration

Detailed measurements stay in \`${PKG.design}\` and \`docs/references/\`. Do not duplicate them here.
`
  return body.trim() + '\n'
}
