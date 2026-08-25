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
5. Add the project CSS listed in \`${PKG.design}\` section 5 so class names like \`main-container\`, \`btn-xl\`, and \`bg-background-9\` actually resolve. Tailwind does not generate them, and without these rules the container width, buttons, and theme colors silently disappear.
6. Port the captured markup in \`${PKG.design}\` section 5 node for node, reusing its class names where the stack allows. Header, footer, and every section use the same captured tree — keep scanned tags. Do not substitute a generic landing layout.
7. Keep the static stand-ins for live media: \`<video>\`/\`<canvas>\` render as the captured still image; \`<iframe>\` and \`<cal-inline>\` render as a sized placeholder with no rebuilt embed UI.
8. Match button colors and **image width/height** to the spec. Set \`width\` and \`height\` on \`<img>\`.
9. Apply captured shadows, radii, and recorded transitions only if they do not cover content. Use local \`/images/...\` paths only.
10. Meet accessibility basics: \`lang\`, heading order, alt text, visible focus.
11. Validate against \`${PKG.validatePrompt}\` instead of stopping after the first compile.

Captured viewports: ${viewports(design)}.
`
}

export function generateValidatePrompt(design: NormalizedDesign): string {
  return `# Validate the recreated page

Visual similarity cannot be inferred from code inspection alone.

Captured viewports: ${viewports(design)}. Compare with \`${PKG.screenshotViewport}\` and \`${PKG.screenshotFull}\` when those files exist.

## Fix differences in this order

1. Section count, order, role, pattern, and column count
2. Header / nav / footer internals
3. Font loading and typography
4. Viewport and container geometry
5. Image and icon **width and height**
6. **Button background, text color, padding, radius**
7. Spacing and alignment
8. Shadows, borders, and recorded motion (motion last; never covering content)
9. Responsive behavior
10. Minor decoration

Confirm no \`<video>\`, \`<iframe>\`, \`<cal-inline>\`, or \`<canvas>\` crept back in: those must stay static images or sized placeholders.

Check accessibility (heading order, alt, focus) and page speed (local assets, reserved image size, no remote hotlinks).

Do not invent a percentage match score. Report remaining gaps, failed assets, and uncaptured breakpoints honestly.
`
}
