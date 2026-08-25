/**
 * Builds agent-facing instruction files (AGENTS.md, CLAUDE.md, Cursor rule)
 * that steer reconstruction from the export package.
 */
import type { NormalizedDesign } from '../shared/types'
import { PKG } from '../export/package-paths'
import { escapeMarkdown } from '../normalize/markdown-escape'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function viewports(design: NormalizedDesign): string {
  const captured = design.responsive
    .filter((item) => item.captured)
    .map((item) => `${item.label ?? 'viewport'} ${item.viewportWidth}×${item.viewportHeight}`)
  return captured.join(', ') || `${design.page.viewportWidth}×${design.page.viewportHeight}`
}

// ---------------------------------------------------------------------------
// AGENTS.md
// ---------------------------------------------------------------------------

export function generateAgentsMarkdown(design: NormalizedDesign): string {
  const title = escapeMarkdown(design.metadata.title || design.metadata.hostname)
  return `# Agent instructions

This repository export describes **${title}**.

Start here. Then follow the files in order. Do not skip \`${PKG.design}\`.

## Before coding

1. Read \`${PKG.design}\` first. Section 5 contains the **captured markup of the real page** — actual tags, actual class names, actual text. Port that tree node for node. Do not substitute a generic landing-page layout.
2. Inspect the target project. Keep its framework (React, Next.js, or Vite), routing, and styling approach. Prefer **Tailwind CSS** if the project already uses it or can add it without a stack rewrite.
3. Copy every file from \`assets/\` into the app \`public/\` folder, keeping subfolders:
   - \`assets/images/*\` → \`public/images/*\`
   - \`assets/icons/*\` → \`public/icons/*\`
   - \`assets/svg/*\` → \`public/svg/*\`
   - \`assets/fonts/*\` → \`public/fonts/*\`
   Reference them as \`/images/...\`, \`/icons/...\`, \`/svg/...\`, \`/fonts/...\`. Do not redownload remote URLs.
4. Use exact copy from \`${PKG.content}\`.
5. Read \`${PKG.tokens}\`, \`${PKG.layout}\`, \`${PKG.manifest}\`, and \`${PKG.limitations}\`.

## Stack conventions

- **Vite / CRA:** static files live in \`public/\`.
- **Next.js:** static files live in \`public/\`. Prefer \`next/image\` only when width and height match the **rendered** sizes in \`${PKG.design}\`.
- **Tailwind:** the captured markup already carries the source page's class names. Stock utilities — including arbitrary values like \`max-w-[1140px]\` — **reuse verbatim** instead of writing your own layout classes. For values that are not utilities, use arbitrary properties (\`bg-[#1D4ED8]\`, \`w-[420px]\`, \`h-[262px]\`, \`rounded-[16px]\`, \`[box-shadow:0_12px_30px_rgba(18,32,51,0.12)]\`). Do not round colors, radii, or image dimensions.
- **Project-defined classes:** names like \`main-container\`, \`btn-xl\`, \`bg-background-9\`, or \`text-heading-1\` come from the source project's own stylesheet and Tailwind will not generate them. Pasted into a fresh app they do nothing, so containers land at full width and buttons lose their fill. \`${PKG.design}\` section 5 lists each one with its measured CSS — add those rules (a stylesheet or \`@layer components\`) before porting the markup, or replace each class with equivalent arbitrary utilities.
- **Non-Tailwind targets:** translate each captured utility class into equivalent CSS. Keep the same element tree either way.
- **Components:** one component per captured region, in document order (\`Header\`, hero, feature grid, splits, gallery, footer). Keep the listed column counts.

## While implementing

- Recreate **every captured region** from the markup in \`${PKG.design}\`. Keep the same nesting depth, element order, and wrapper elements.
- Do not merge sections, flatten wrappers, or invent a different page structure.
- Recreate navbar/header and footer from the same captured tree as every other region. Keep the scanned tags (the inner header wrapper is often a \`div\`, not a guessed \`<nav>\`).
- Match **button background, text color, radius, padding, and shadow** from tokens and component notes. Do not substitute a generic primary button.
- Match **image width and height** to rendered sizes in \`${PKG.design}\` and \`${PKG.manifest}\`. Set \`width\` and \`height\` attributes to avoid layout shift.
- Apply captured **box-shadow** and **border-radius** exactly.
- **Video becomes an image.** Replace every \`<video>\` and \`<canvas>\` with the captured still (\`/images/...\`) at the measured width and height. No autoplay, no video files.
- **Embeds become placeholders.** Never rebuild the inside of an \`<iframe>\` or \`<cal-inline>\`. Render a placeholder box at the measured size with an accessible label, so the layout below it keeps its position. Section 7 of \`${PKG.design}\` lists each one.
- **Motion last.** Apply transition/animation only when recorded. Never add overlays, carousels, or motion that cover copy or mockups.
- Use exact captured copy. Do not replace headlines, labels, or link text.
- Distinguish measured values from inferred token names.
- Do not add dependencies unless the target project already requires them or a gap cannot be closed otherwise.

## Accessibility, semantics, and speed

- Set \`lang\` and \`dir\` from scan metadata.
- Preserve heading order. Use captured alt text; if alt is missing, use an empty alt for decorative images.
- Keyboard-focusable controls with visible focus. Do not remove outlines without an equivalent focus ring from the spec.
- Local assets only. No remote hotlinking. Lazy-load below-the-fold images. Avoid unused font files.

## After implementing

- Run the target project's lint, type-check, test, and build commands.
- Follow \`${PKG.buildPrompt}\` then \`${PKG.validatePrompt}\`.
- Validate at every captured viewport: ${viewports(design)}.
- Compare \`${PKG.screenshotViewport}\` and \`${PKG.screenshotFull}\` when those files exist.
- Fix remaining diffs in this order: **section structure**, header/nav/footer internals, type, geometry, image size, spacing, **button color**, **shadow**, then motion (never covering content).
- Report inaccessible or uncertain details honestly. Never invent a visual-match percentage.
`
}

// ---------------------------------------------------------------------------
// CLAUDE.md
// ---------------------------------------------------------------------------

export function generateClaudeMarkdown(design: NormalizedDesign): string {
  const title = escapeMarkdown(design.metadata.title || design.metadata.hostname)
  return `# Claude Code instructions

Recreate the scanned page **${title}**.

1. Read \`${PKG.agents}\`, then \`${PKG.design}\`.
2. Copy \`assets/\` into \`public/\` (keep \`images/\`, \`icons/\`, \`svg/\`, \`fonts/\`).
3. Keep the target project's stack. Prefer Tailwind arbitrary values for measured tokens.
4. Use exact copy from \`${PKG.content}\` and local \`/images/...\` paths from \`${PKG.manifest}\`.
5. Recreate each captured region from the markup in \`${PKG.design}\`. Match button color and image width/height.
6. Follow \`${PKG.buildPrompt}\`, then \`${PKG.validatePrompt}\`.
7. Captured viewports: ${viewports(design)}.
8. Do not invent missing sections, assets, or testimonials. Do not substitute a generic landing layout.
`
}

// ---------------------------------------------------------------------------
// Cursor rule
// ---------------------------------------------------------------------------

export function generateCursorRule(design: NormalizedDesign): string {
  return `---
description: Recreate the scanned reference page from this export package. Apply only when implementing or repairing that captured page.
globs:
  - "**/*.{html,css,scss,js,jsx,ts,tsx,vue,svelte}"
alwaysApply: false
---

# Recreate scanned reference page

When the user is recreating the page described in this export:

1. Read \`${PKG.agents}\` and \`${PKG.design}\` before editing.
2. Copy \`assets/\` into \`public/\`, then use \`/images/...\`, \`/icons/...\`, and \`/svg/...\` paths from \`${PKG.manifest}\`.
3. Use tokens from \`${PKG.tokens}\` and layout from \`${PKG.layout}\`.
4. Match each captured region’s role, pattern, and column count. Then header, sections, footer, button colors, shadows, and rendered image sizes. Do not invent copy or imagery.
5. Port captured tags and nesting as scanned. Do not replace a captured \`div\` with a guessed landmark. Use captured alt text and Tailwind arbitrary values for measured CSS.
6. Compare against \`${PKG.screenshotViewport}\` and \`${PKG.screenshotFull}\` when those files exist.
7. Use every captured viewport in \`${PKG.layout}\`. Primary measured viewport: ${design.page.viewportWidth}×${design.page.viewportHeight}.
8. This rule is scoped to reference-page recreation. Do not apply it to unrelated work.

Schema version is recorded in \`${PKG.scan}\`.
`
}
