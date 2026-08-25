/**
 * Generates docs/DESIGN.md — the primary rebuild specification covering
 * structure, tokens, assets, media stand-ins, and acceptance notes.
 */
import { SCHEMA_VERSION } from '../shared/constants'
import { PKG, publicUrlFromAssetPath } from '../export/package-paths'
import type { NormalizedDesign } from '../shared/types'
import { sectionComposition } from '../normalize/layout-pattern'
import { escapeMarkdown, escapeTableCell, mdTable } from '../normalize/markdown-escape'
import { coverageSummary } from '../validation/coverage'

// ---------------------------------------------------------------------------
// DESIGN.md assembly
// ---------------------------------------------------------------------------

export function generateDesignMarkdown(design: NormalizedDesign): string {
  const m = design.metadata
  const sections = [
    heading(1, `${m.title || m.hostname} — design specification`),
    `_Schema ${SCHEMA_VERSION}. Generated from a local page scan. Values are measured or inferred as labeled._`,
    heading(2, '1. Source and scan metadata'),
    mdTable(
      ['Field', 'Value', 'Provenance'],
      [
        ['Title', m.title, 'observed'],
        ['URL', m.url, m.urlRedacted ? 'observed, sensitive query redacted' : 'observed'],
        ['Hostname', m.hostname, 'observed'],
        ['Language / direction', `${m.language} / ${m.direction}`, 'observed'],
        ['Scanned at', m.scannedAt, 'observed'],
        ['Viewport', `${m.viewportWidth}×${m.viewportHeight} @${m.devicePixelRatio}dppx`, 'measured'],
        ['Document size', `${m.scrollWidth}×${m.scrollHeight}`, 'measured'],
        ['Document background', m.documentBackground, 'measured'],
        ['Color scheme', m.colorScheme, 'observed'],
      ],
    ),
    heading(2, '2. Capture scope and limitations'),
    coverageSummary(design.coverage),
    '',
    ...design.limitations.map(
      (item) => `- **${item.code}** (${item.severity}${item.inferred ? ', inferred' : ''}): ${item.message}`,
    ),
    design.limitations.length === 0 ? '- No scanner limitations were recorded.' : '',
    heading(2, '3. Package layout and asset serving'),
    [
      'Root (do not nest): `AGENTS.md`, `CLAUDE.md`, `SKILL.md`, `.cursor/`, `assets/`.',
      'Docs: `docs/DESIGN.md`, `docs/prompts/`, `docs/references/`, `docs/screenshots/`.',
      'Copy `assets/` into the app `public/` folder (Vite, CRA, Next.js). Then use the Public URL column below.',
    ].join('\n\n'),
    heading(2, '4. Visual direction'),
    visualDirection(design),
    heading(2, '5. Page structure — match this first'),
    [
      '**Structure is the first acceptance check.** The outline below is the *real captured markup* of the page: actual tags, actual class names, actual text, actual image sizes. Header, footer, and every section use the same captured tree — keep the scanned tags (the inner header wrapper is often a `div`, not a guessed `<nav>`). Rebuild the DOM to match it.',
      'Port this tree node for node. Keep the same nesting depth, the same element order, and the same wrapper elements. Do not merge regions, do not skip a region, and do not replace the page with a generic SaaS or marketing template.',
      'The `class` values are the source page’s own classes, and they split into two kinds. **Stock Tailwind utilities** (`flex`, `px-6`, `max-w-[1140px]`, `lg:grid-cols-3`) resolve in any Tailwind project — copy them verbatim, arbitrary values included. **Project-defined names** (`main-container`, `btn-xl`, `bg-background-9`, `text-heading-1`) resolve to nothing in a fresh project: pasted as-is they silently drop the container width, button, or theme colour, which is the usual reason a rebuild looks close but sits at the wrong width. Every one of them is listed with its measured CSS below — define those rules, or replace the class with equivalent Tailwind arbitrary values.',
      'Motion is optional and must never cover copy, buttons, or mockups. If an animation would overlay the layout, omit it and keep the static structure.',
      'Where the page used `<video>`, `<canvas>`, `<iframe>`, or `<cal-inline>`, the outline already shows the static stand-in to build instead — a still image or a sized placeholder. Keep the stand-in; do not restore the live element or rebuild an embed’s interior. Section 7 lists every one.',
    ].join('\n\n'),
    documentOutlineBlock(design),
    utilityClassBlock(design),
    classRecipeBlock(design),
    pageSkeleton(design),
    mdTable(
      ['#', 'Role', 'Pattern', 'Cols', 'Align', 'Bounds', 'Background'],
      design.sections.map((section, index) => [
        String(index + 1),
        sectionComposition(section).role,
        sectionComposition(section).pattern,
        String(sectionComposition(section).columns),
        sectionComposition(section).align,
        `${section.bounds.width}×${section.bounds.height} at ${section.bounds.x},${section.bounds.y}`,
        section.background,
      ]),
    ),
    landmarkReconstruction(design),
    heading(2, '6. Content hierarchy'),
    `Exact copy is listed in \`${PKG.content}\`. Do not invent missing copy.`,
    heading(2, '7. Images, media, and embeds — size must match'),
    'Use **rendered** width and height in layout. Intrinsic size is the file. Set HTML `width` and `height` to the rendered values to prevent layout shift.',
    mdTable(
      ['ID', 'Type', 'ZIP path', 'Public URL', 'Rendered', 'Intrinsic', 'Alt', 'Status'],
      design.assets.map((asset) => [
        asset.id,
        asset.type,
        asset.localPath,
        publicUrlFromAssetPath(asset.localPath),
        dim(asset.renderedWidth, asset.renderedHeight),
        dim(asset.intrinsicWidth, asset.intrinsicHeight),
        asset.alt || '',
        asset.downloadStatus,
      ]),
    ),
    mediaSubstitutionBlock(design),
    heading(2, '8. Color tokens'),
    'Use these HEX/CSS values exactly (Tailwind: `bg-[#HEX]`, `text-[#HEX]`). Do not substitute a nearby brand color.',
    mdTable(
      ['Name', 'HEX', 'CSS', 'Role', 'Count', 'Inferred'],
      design.tokens.colors.map((token) => [
        token.name,
        token.hex,
        token.css || token.hex,
        token.role,
        String(token.count),
        token.roleInferred ? 'yes' : 'no',
      ]),
    ),
    heading(2, '9. Typography tokens'),
    mdTable(
      ['Name', 'Family', 'Size', 'Weight', 'Line height', 'Count', 'License review'],
      design.tokens.typography.map((token) => [
        token.name,
        token.fontFamily,
        token.fontSize,
        token.fontWeight,
        token.lineHeight,
        String(token.count),
        token.licenseReviewRequired ? 'required' : 'not flagged',
      ]),
    ),
    heading(2, '10. Spacing, radius, and shadow'),
    'Shadows and radii are measured CSS. Apply with Tailwind arbitrary properties, e.g. `[box-shadow:0_12px_30px_rgba(18,32,51,0.12)]`. Do not use a generic `shadow-lg`.',
    mdTable(
      ['Kind', 'Name', 'Value', 'Count', 'Inferred'],
      [
        ...design.tokens.spacing.map((t) => [
          'spacing',
          t.name,
          t.value,
          String(t.count),
          t.nameInferred ? 'yes' : 'no',
        ]),
        ...design.tokens.radii.map((t) => ['radius', t.name, t.value, String(t.count), t.nameInferred ? 'yes' : 'no']),
        ...design.tokens.shadows.map((t) => [
          'shadow',
          t.name,
          t.value,
          String(t.count),
          t.nameInferred ? 'yes' : 'no',
        ]),
      ],
    ),
    heading(2, '11. Buttons and controls'),
    mdTable(
      ['Name', 'Kind', 'Confidence', 'Count', 'Notes'],
      design.components.map((c) => [
        c.name,
        c.kind,
        String(c.confidence),
        String(c.elementIds?.length ?? 0),
        c.notes ?? '',
      ]),
    ),
    buttonMatchNotes(design),
    heading(2, '12. Motion'),
    motionBlock(design),
    heading(2, '13. Container and layout measurements'),
    `Document ${design.page.documentWidth}×${design.page.documentHeight}. Viewport ${design.page.viewportWidth}×${design.page.viewportHeight}.`,
    heading(2, '14. Viewport behavior'),
    design.responsive
      ?.map(
        (item) =>
          `- ${item.label ?? 'viewport'} ${item.viewportWidth}×${item.viewportHeight}: ${item.captured ? 'captured' : 'not captured'}. ${item.notes ?? ''}`,
      )
      .join('\n') ?? '_No viewport snapshots were captured._',
    (design.responsive ?? []).some((r) => r.mediaQueries?.length)
      ? mdTable(
          ['Media query', 'Readable', 'Notes'],
          (design.responsive ?? []).flatMap((r) =>
            (r.mediaQueries ?? []).map((q) => [q.raw, q.readable ? 'yes' : 'no', q.notes]),
          ),
        )
      : '_No readable media queries were captured._',
    heading(2, '15. Tailwind, semantics, accessibility, speed'),
    [
      '- Keep the target stack (React, Next.js, or Vite). Prefer Tailwind arbitrary values that copy measured CSS.',
      `- Document \`lang="${m.language}"\` dir="${m.direction}".`,
      `- Headings captured: ${(design.content ?? []).filter((c) => c.kind === 'heading').length}. Keep order.`,
      `- Image alt texts captured: ${(design.content ?? []).filter((c) => c.kind === 'image-alt').length}. Use empty alt only when decorative.`,
      '- Visible focus on controls. Do not remove outlines without an equivalent ring from this spec.',
      '- Local `public/` assets only. Width/height attributes on images. Lazy-load below-the-fold media.',
    ].join('\n'),
    tailwindSnippets(design),
    heading(2, '16. Implementation rules'),
    '- Use exported assets and exact captured copy.',
    '- Treat token names as inferred; keep measured values exact.',
    '- Do not invent sections, testimonials, metrics, or images.',
    '- Do not claim source-code recovery. This package contains rendered-page facts.',
    heading(2, '17. Visual validation'),
    `Compare against \`${PKG.screenshotViewport}\` and \`${PKG.screenshotFull}\` when those files exist. Use every captured viewport in \`${PKG.layout}\`.`,
    'Fix remaining diffs in this order: **section count and composition** → **project CSS classes that resolve to nothing** → header/nav/footer internals → type → geometry → **image size** → **button color** → spacing → **shadow** → motion (last; never covering content).',
    'When a container, button, or coloured surface is the wrong size or plain white, check the project CSS block in section 5 first: the class is almost certainly present in the markup but undefined in the target project.',
    heading(2, '18. Acceptance criteria'),
    '- Every captured region exists in order with the listed role, pattern, and column count.',
    '- The rebuilt DOM matches the captured markup in section 5: same tags, same nesting, same order — not a substitute layout.',
    '- Every project-defined class in section 5 is either defined with its measured CSS or replaced by equivalent utilities. No class name is left inert.',
    '- Button colors, radii, and shadows match measured tokens.',
    '- Images use public URLs and rendered width/height.',
    '- Every `<video>` and `<canvas>` is a static image; every `<iframe>` and `<cal-inline>` is a sized placeholder with no rebuilt embed UI.',
    '- Captured content appears in document order inside the correct region.',
    '- Motion does not cover copy or mockups. Missing screenshots or failed assets are reported, not faked.',
    `- Coverage snapshot: ${escapeMarkdown(coverageSummary(design.coverage))}`,
  ]
  return (
    sections
      .filter((line) => line !== undefined)
      .join('\n\n')
      .trim() + '\n'
  )
}

// ---------------------------------------------------------------------------
// Markdown helpers
// ---------------------------------------------------------------------------

function heading(level: number, text: string): string {
  return `${'#'.repeat(level)} ${escapeMarkdown(text)}`
}

function dim(width: number | null, height: number | null): string {
  if (width == null && height == null) return 'not measured'
  return `${width ?? '?'}×${height ?? '?'}`
}

// ---------------------------------------------------------------------------
// Structure and markup blocks
// ---------------------------------------------------------------------------

function mediaSubstitutionBlock(design: NormalizedDesign): string {
  const media = design.media ?? []
  if (media.length === 0) return ''

  const rules = [
    '### Video and embeds — never rebuild them live',
    '',
    '- **`<video>`:** render a static `<img>` using the captured poster or still frame. Do not autoplay, loop, or ship a video file.',
    '- **`<iframe>` and `<cal-inline>`:** do **not** recreate the embedded UI (calendar skeleton, booking widget, or iframe children). Render a placeholder box at the measured size, keeping the surrounding layout intact.',
    '- **`<canvas>`:** render the captured pixels as an image. Do not reimplement the drawing code.',
    '- Every stand-in keeps the measured width, height, and aspect ratio so nothing below it shifts.',
    '- Give each placeholder an accessible name (`alt`, or `aria-label` on the box).',
  ].join('\n')

  const table = mdTable(
    ['Element', 'Kind', 'Region', 'Rendered', 'Aspect', 'Replace with', 'Label'],
    media.map((item) => [
      item.elementId,
      item.kind,
      item.sectionId ?? '—',
      `${Math.round(item.bounds.width)}×${Math.round(item.bounds.height)}`,
      item.aspectRatio,
      item.kind === 'iframe' || item.kind === 'embed'
        ? `placeholder box${item.origin ? ` (${item.origin})` : ''}`
        : (item.posterSrc ?? 'placeholder box (no frame captured)'),
      item.label,
    ]),
  )

  return [rules, '', table].join('\n')
}

function documentOutlineBlock(design: NormalizedDesign): string {
  const outline = design.documentOutline?.trim()
  if (!outline) return '_No document outline was captured. Use the per-region markup below._'
  return ['Captured document markup:', '', '```html', outline, '```'].join('\n')
}

function utilityClassBlock(design: NormalizedDesign): string {
  const classes = design.utilityClasses ?? []
  if (classes.length === 0) return ''
  return [
    `Most frequent class names on the page (${classes.length} shown). Reuse these rather than inventing new ones:`,
    '',
    '```text',
    classes.join(' '),
    '```',
  ].join('\n')
}

/**
 * The source project's own class names carry real styling that no fresh Tailwind install provides.
 * Emitting the measured CSS lets the rebuild recreate containers, buttons, and theme tokens exactly.
 */
function classRecipeBlock(design: NormalizedDesign): string {
  const recipes = design.classRecipes ?? []
  if (recipes.length === 0) return ''
  const rules = recipes.map((recipe) => {
    const declarations = Object.entries(recipe.declarations).map(([property, value]) => `  ${property}: ${value};`)
    const usage = `/* ${recipe.uses}× on ${recipe.sampleTags.join(', ') || 'elements'} */`
    return [`.${recipe.className} { ${usage}`, ...declarations, '}'].join('\n')
  })
  return [
    `**Project CSS the markup above depends on (${recipes.length} classes).** These names are defined by the source project, not by Tailwind, so the outline’s classes only work once these rules exist. Add them as a stylesheet (or a Tailwind \`@layer components\` block) before porting the markup, or inline each rule as arbitrary utilities on the element.`,
    '',
    'Each rule is measured from every element carrying that class, so it reflects what the class actually renders — including responsive values already resolved at the scanned viewport.',
    '',
    '```css',
    rules.join('\n\n'),
    '```',
  ].join('\n')
}

function pageSkeleton(design: NormalizedDesign): string {
  if (design.sections.length === 0) return '_No regions were captured._'
  const rows = design.sections.map((section, index) => {
    const c = sectionComposition(section)
    return `${index + 1}. **${escapeMarkdown(section.name)}** — \`${c.role}\` / \`${c.pattern}\` / ${c.columns} col / ${c.align}`
  })
  return [`Captured regions, in document order (${design.sections.length}):`, ...rows].join('\n')
}

function landmarkReconstruction(design: NormalizedDesign): string {
  if (design.sections.length === 0) return '_No sections were captured._'
  const colorById = new Map((design.tokens.colors ?? []).map((token) => [token.id, token]))
  const typeById = new Map((design.tokens.typography ?? []).map((token) => [token.id, token]))

  return design.sections
    .map((section, index) => {
      const c = sectionComposition(section)
      const colors = (section.colorTokenIds ?? [])
        .map((id) => colorById.get(id))
        .filter((token): token is NonNullable<typeof token> => Boolean(token))
        .map((token) => `${token.hex} (${token.role})`)
      const types = (section.typographyTokenIds ?? [])
        .map((id) => typeById.get(id))
        .filter((token): token is NonNullable<typeof token> => Boolean(token))
        .map(
          (token) =>
            `${escapeTableCell(token.fontFamily)} ${token.fontSize}/${token.lineHeight} weight ${token.fontWeight}`,
        )
      const blockLines = (c.blocks ?? []).slice(0, 20).map((block) => {
        if (block.kind === 'image') {
          return `  - image ${block.publicSrc || ''} ${block.bounds?.width ?? '?'}×${block.bounds?.height ?? '?'} alt="${escapeTableCell(block.text)}"`
        }
        return `  - ${block.kind}: ${escapeTableCell(block.text).slice(0, 140)}`
      })
      return [
        `### ${index + 1}. ${escapeMarkdown(section.name)}`,
        `- Role \`${c.role}\` (inferred). Pattern \`${c.pattern}\` (inferred). Align \`${c.align}\`. Columns ${c.columns}, rows ${c.rows}.`,
        '- Port the captured markup below. Header, footer, and every section use the same captured tree — keep the tags as scanned.',
        `- Bounds ${section.bounds.width}×${section.bounds.height} at ${section.bounds.x},${section.bounds.y}. Background: ${section.background}.`,
        `- Display \`${c.display}\`${c.flexDirection ? `, flex-direction \`${c.flexDirection}\`` : ''}${c.gridTemplateColumns ? `, grid-template-columns \`${c.gridTemplateColumns}\`` : ''}${c.gap ? `, gap \`${c.gap}\`` : ''}${c.textAlign ? `, text-align \`${c.textAlign}\`` : ''}.`,
        colors.length
          ? `- Colors: ${colors.join('; ')}.`
          : '- Colors: use page tokens only where this region needs them.',
        types.length ? `- Type: ${types.join('; ')}.` : '- Type: inherit captured typography tokens.',
        c.utilityClasses.length ? `- Classes used here: \`${c.utilityClasses.join(' ')}\`` : '',
        `- Blocks (${c.blocks.length}):`,
        ...(blockLines.length ? blockLines : ['  - none captured']),
        ...(c.domOutline
          ? ['- Captured markup for this region — port it node for node:', '```html', c.domOutline, '```']
          : []),
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n\n')
}

// ---------------------------------------------------------------------------
// Component and style notes
// ---------------------------------------------------------------------------

function buttonMatchNotes(design: NormalizedDesign): string {
  const fills = design.tokens.colors
    .filter((token) => token.properties.some((prop) => /background/i.test(prop)))
    .slice(0, 6)
    .map((token) => `${token.hex} (${token.role})`)
  const radii = design.tokens.radii.slice(0, 4).map((token) => token.value)
  const shadows = design.tokens.shadows.slice(0, 4).map((token) => token.value)
  const lines = [
    'For `button` and `nav-link` patterns, match **fill, text color, radius, padding, and shadow**. Do not restyle them as a default primary button.',
    fills.length ? `Measured fills: ${fills.join('; ')}.` : '',
    radii.length ? `Measured radii: ${radii.join('; ')}.` : '',
    shadows.length ? `Measured shadows: ${shadows.join('; ')}.` : '',
  ]
  return lines.filter(Boolean).join('\n\n')
}

function tailwindSnippets(design: NormalizedDesign): string {
  const lines = ['Exact Tailwind mappings from this scan. Spaces in CSS become underscores in arbitrary properties.']
  for (const token of design.tokens.colors.slice(0, 8)) {
    lines.push(`- ${token.hex} (${token.role}): \`bg-[${token.hex}]\` / \`text-[${token.hex}]\``)
  }
  const type = design.tokens.typography[0]
  if (type) {
    lines.push(
      `- Type: \`text-[${type.fontSize}] leading-[${type.lineHeight}] font-[${type.fontWeight}]\` with family ${escapeTableCell(type.fontFamily)}.`,
    )
  }
  for (const token of design.tokens.radii.slice(0, 4)) {
    lines.push(`- Radius ${token.value}: \`rounded-[${token.value}]\``)
  }
  for (const token of design.tokens.shadows.slice(0, 4)) {
    lines.push(`- Shadow: \`[box-shadow:${token.value.replace(/\s+/g, '_')}]\``)
  }
  for (const asset of design.assets.filter((item) => item.renderedWidth && item.renderedHeight).slice(0, 8)) {
    const src = publicUrlFromAssetPath(asset.localPath)
    lines.push(
      `- ${src}: \`<img src="${src}" width="${asset.renderedWidth}" height="${asset.renderedHeight}" alt="${asset.alt || ''}" class="w-[${asset.renderedWidth}px] h-[${asset.renderedHeight}px]" />\``,
    )
  }
  for (const space of design.tokens.spacing.slice(0, 4)) {
    lines.push(`- Spacing ${space.value}: \`p-[${space.value}]\` / \`gap-[${space.value}]\``)
  }
  return lines.join('\n')
}

function visualDirection(design: NormalizedDesign): string {
  const topColors = design.tokens.colors.slice(0, 5).map((c) => `${c.hex} (${c.role})`)
  const topType = design.tokens.typography[0]
  const lines = [
    'Direction below is derived only from captured evidence.',
    topColors.length ? `Dominant observed colors: ${topColors.join(', ')}.` : 'No dominant colors were captured.',
    topType
      ? `Primary observed type: ${escapeTableCell(topType.fontFamily)} ${topType.fontSize}/${topType.lineHeight} weight ${topType.fontWeight}.`
      : 'No typography tokens were captured.',
  ]
  return lines.join('\n\n')
}

function motionBlock(design: NormalizedDesign): string {
  const rows: string[][] = []
  for (const [signature, style] of Object.entries(design.styleRegistry ?? {})) {
    const property = style['transition-property']
    const duration = style['transition-duration']
    const animation = style['animation-name']
    const animationDuration = style['animation-duration']
    const hasTransition = Boolean(property && property !== 'none')
    const hasAnimation = Boolean(animation && animation !== 'none')
    if (!hasTransition && !hasAnimation) continue
    rows.push([signature.slice(0, 8), property || 'none', duration || '', animation || 'none', animationDuration || ''])
  }
  if (rows.length === 0) {
    return '_No transition or animation names were captured on sampled elements. Do not invent motion._'
  }
  return mdTable(
    ['Style id', 'transition-property', 'transition-duration', 'animation-name', 'animation-duration'],
    rows,
  )
}
