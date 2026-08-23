import type { NormalizedDesign } from '../shared/types';

export function generateBuildPrompt(design: NormalizedDesign): string {
  return `# Build the scanned page

Implement the page captured as **${design.metadata.title || design.metadata.hostname}**.

## Required steps

1. Inspect the target repository before writing code.
2. Determine the existing framework and styling approach. Stay on that stack.
3. Read \`DESIGN.md\`, \`SKILL.md\`, \`references/CONTENT.md\`, \`references/design-tokens.json\`, \`references/layout.json\`, and \`references/asset-manifest.json\`.
4. Implement the page in captured content order.
5. Use local files from \`assets/\`. Do not hotlink the original site unless an asset failed and is documented.
6. Match recorded geometry and token values.
7. Validate against \`prompts/VALIDATE_PAGE.md\` instead of stopping after the first compile.

Captured viewports: ${
    design.responsive
      .filter((item) => item.captured)
      .map((item) => `${item.viewportWidth}×${item.viewportHeight}`)
      .join(', ') || `${design.page.viewportWidth}×${design.page.viewportHeight}`
  }.
`;
}

export function generateValidatePrompt(design: NormalizedDesign): string {
  return `# Validate the recreated page

Visual similarity cannot be inferred from code inspection alone.

Captured viewports: ${
    design.responsive
      .filter((item) => item.captured)
      .map((item) => `${item.viewportWidth}×${item.viewportHeight}`)
      .join(', ') || `${design.page.viewportWidth}×${design.page.viewportHeight}`
  }. Compare with \`screenshots/viewport.png\` and \`screenshots/full-page.png\` when those files exist.

## Fix differences in this order

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

Do not invent a percentage match score. Report remaining gaps, failed assets, and uncaptured breakpoints honestly.
`;
}
