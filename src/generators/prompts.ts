import type { NormalizedDesign } from '../shared/types'
import { PKG } from '../export/package-paths'

function viewports(design: NormalizedDesign): string {
  const captured = design.responsive
    .filter((item) => item.captured)
    .map((item) => `${item.viewportWidth}×${item.viewportHeight}`)
  return captured.join(', ') || `${design.page.viewportWidth}×${design.page.viewportHeight}`
}

export function generateBuildPrompt(design: NormalizedDesign): string {
  return `# Build the scanned page

Implement the page captured as **${design.metadata.title || design.metadata.hostname}**.

## Required steps

1. Inspect the target repository before writing code. Keep React, Next.js, or Vite as found.
2. Prefer Tailwind CSS with arbitrary values for measured tokens. Do not invent a second palette.
3. Copy \`assets/\` into \`public/\` (\`images/\`, \`icons/\`, \`svg/\`, \`fonts/\`).
4. Read \`${PKG.design}\`, \`${PKG.skill}\`, \`${PKG.content}\`, \`${PKG.tokens}\`, \`${PKG.layout}\`, and \`${PKG.manifest}\`.
5. Implement header, nav, sections, and footer in captured order using semantic HTML.
6. Match button colors and **image width/height** to the spec. Set \`width\` and \`height\` on \`<img>\`.
7. Apply captured shadows, radii, and recorded transitions. Use local \`/images/...\` paths only.
8. Meet accessibility basics: \`lang\`, heading order, alt text, visible focus.
9. Validate against \`${PKG.validatePrompt}\` instead of stopping after the first compile.

Captured viewports: ${viewports(design)}.
`
}

export function generateValidatePrompt(design: NormalizedDesign): string {
  return `# Validate the recreated page

Visual similarity cannot be inferred from code inspection alone.

Captured viewports: ${viewports(design)}. Compare with \`${PKG.screenshotViewport}\` and \`${PKG.screenshotFull}\` when those files exist.

## Fix differences in this order

1. Font loading and typography
2. Viewport and container geometry
3. Header / nav / footer landmarks
4. Image and icon **width and height**
5. **Button background, text color, padding, radius**
6. Spacing and alignment
7. Shadows, borders, and recorded motion
8. Responsive behavior
9. Interaction states
10. Minor decoration

Check accessibility (heading order, alt, focus) and page speed (local assets, reserved image size, no remote hotlinks).

Do not invent a percentage match score. Report remaining gaps, failed assets, and uncaptured breakpoints honestly.
`
}
