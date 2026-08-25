import type { NormalizedDesign } from '../shared/types'
import { PKG } from '../export/package-paths'
import { escapeMarkdown } from '../normalize/markdown-escape'

function viewports(design: NormalizedDesign): string {
  const captured = design.responsive
    .filter((item) => item.captured)
    .map((item) => `${item.label ?? 'viewport'} ${item.viewportWidth}×${item.viewportHeight}`)
  return captured.join(', ') || `${design.page.viewportWidth}×${design.page.viewportHeight}`
}

export function generateAgentsMarkdown(design: NormalizedDesign): string {
  const title = escapeMarkdown(design.metadata.title || design.metadata.hostname)
  return `# Agent instructions

This repository export describes **${title}**.

Start here. Then follow the files in order. Do not skip \`${PKG.design}\`.

## Before coding

1. Read \`${PKG.design}\` first. It is the measured spec for header, nav, sections, footer, type, color, shadow, image size, and motion.
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
- **Tailwind:** map measured values with arbitrary properties (\`bg-[#1D4ED8]\`, \`w-[420px]\`, \`h-[262px]\`, \`rounded-[16px]\`, \`[box-shadow:0_12px_30px_rgba(18,32,51,0.12)]\`). Do not round colors, radii, or image dimensions.
- **Components:** \`Header\`, \`Nav\`, \`Main\`, \`Footer\`, and one component per captured section, in document order.

## While implementing

- Recreate **navbar/header, every section, and footer** as semantic HTML: \`<header>\`, \`<nav>\`, \`<main>\`, \`<section>\`, \`<footer>\`.
- Match **button background, text color, radius, padding, and shadow** from tokens and component notes. Do not substitute a generic primary button.
- Match **image width and height** to rendered sizes in \`${PKG.design}\` and \`${PKG.manifest}\`. Set \`width\` and \`height\` attributes to avoid layout shift.
- Apply captured **box-shadow** and **border-radius** exactly. Apply **transition/animation** only when recorded in \`${PKG.design}\`.
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
- Fix remaining diffs in this order: type, geometry, image size, spacing, **button color**, **shadow**, motion, then decoration.
- Report inaccessible or uncertain details honestly. Never invent a visual-match percentage.
`
}

export function generateClaudeMarkdown(design: NormalizedDesign): string {
  const title = escapeMarkdown(design.metadata.title || design.metadata.hostname)
  return `# Claude Code instructions

Recreate the scanned page **${title}**.

1. Read \`${PKG.agents}\`, then \`${PKG.design}\`.
2. Copy \`assets/\` into \`public/\` (keep \`images/\`, \`icons/\`, \`svg/\`, \`fonts/\`).
3. Keep the target project's stack. Prefer Tailwind arbitrary values for measured tokens.
4. Use exact copy from \`${PKG.content}\` and local \`/images/...\` paths from \`${PKG.manifest}\`.
5. Semantic \`header\` / \`nav\` / \`main\` / \`footer\`. Match button color and image width/height.
6. Follow \`${PKG.buildPrompt}\`, then \`${PKG.validatePrompt}\`.
7. Captured viewports: ${viewports(design)}.
8. Do not invent missing sections, assets, or testimonials.
`
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

1. Read \`${PKG.agents}\` and \`${PKG.design}\` before editing.
2. Copy \`assets/\` into \`public/\`, then use \`/images/...\`, \`/icons/...\`, and \`/svg/...\` paths from \`${PKG.manifest}\`.
3. Use tokens from \`${PKG.tokens}\` and layout from \`${PKG.layout}\`.
4. Match header, sections, footer, button colors, shadows, and rendered image sizes. Do not invent copy or imagery.
5. Use semantic HTML, captured alt text, and Tailwind arbitrary values for measured CSS.
6. Compare against \`${PKG.screenshotViewport}\` and \`${PKG.screenshotFull}\` when those files exist.
7. Use every captured viewport in \`${PKG.layout}\`. Primary measured viewport: ${design.page.viewportWidth}×${design.page.viewportHeight}.
8. This rule is scoped to reference-page recreation. Do not apply it to unrelated work.

Schema version is recorded in \`${PKG.scan}\`.
`
}
