import { SCHEMA_VERSION } from '../shared/constants'
import { PKG, publicUrlFromAssetPath } from '../export/package-paths'
import type { NormalizedDesign, NormalizedSection } from '../shared/types'
import { escapeMarkdown, escapeTableCell, mdTable } from '../normalize/markdown-escape'
import { coverageSummary } from '../validation/coverage'

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
    heading(2, '5. Landmarks: header, nav, sections, footer'),
    'Recreate landmarks in document order. Use semantic tags. Do not merge, skip, or restyle a captured header/nav/footer as a generic template.',
    mdTable(
      ['Landmark', 'Section', 'Tag hint', 'Bounds', 'Layout', 'Background', 'Summary'],
      design.sections.map((section) => [
        landmarkFor(section),
        section.name,
        section.provenance,
        `${section.bounds.width}×${section.bounds.height} at ${section.bounds.x},${section.bounds.y}`,
        section.layoutMode,
        section.background,
        section.contentSummary,
      ]),
    ),
    landmarkReconstruction(design),
    heading(2, '6. Content hierarchy'),
    `Exact copy is listed in \`${PKG.content}\`. Do not invent missing copy.`,
    heading(2, '7. Images and icons — size must match'),
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
      design.components.map((c) => [c.name, c.kind, String(c.confidence), String(c.elementIds.length), c.notes]),
    ),
    buttonMatchNotes(design),
    heading(2, '12. Motion'),
    motionBlock(design),
    heading(2, '13. Container and layout measurements'),
    `Document ${design.page.documentWidth}×${design.page.documentHeight}. Viewport ${design.page.viewportWidth}×${design.page.viewportHeight}.`,
    heading(2, '14. Viewport behavior'),
    design.responsive
      .map(
        (item) =>
          `- ${item.label ?? 'viewport'} ${item.viewportWidth}×${item.viewportHeight}: ${item.captured ? 'captured' : 'not captured'}. ${item.notes}`,
      )
      .join('\n'),
    design.responsive.some((r) => r.mediaQueries.length)
      ? mdTable(
          ['Media query', 'Readable', 'Notes'],
          design.responsive.flatMap((r) => r.mediaQueries.map((q) => [q.raw, q.readable ? 'yes' : 'no', q.notes])),
        )
      : '_No readable media queries were captured._',
    heading(2, '15. Tailwind, semantics, accessibility, speed'),
    [
      '- Keep the target stack (React, Next.js, or Vite). Prefer Tailwind arbitrary values that copy measured CSS.',
      `- Document \`lang="${m.language}"\` dir="${m.direction}".`,
      `- Headings captured: ${design.content.filter((c) => c.kind === 'heading').length}. Keep order.`,
      `- Image alt texts captured: ${design.content.filter((c) => c.kind === 'image-alt').length}. Use empty alt only when decorative.`,
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
    'Fix remaining diffs in this order: type → geometry → **image size** → **button color** → spacing → **shadow** → motion → decoration.',
    heading(2, '18. Acceptance criteria'),
    '- Header, nav, sections, and footer exist as landmarks in captured order.',
    '- Button colors, radii, and shadows match measured tokens.',
    '- Images use public URLs and rendered width/height.',
    '- Captured content appears in document order.',
    '- Missing screenshots or failed assets are reported, not faked.',
    `- Coverage snapshot: ${escapeMarkdown(coverageSummary(design.coverage))}`,
  ]
  return (
    sections
      .filter((line) => line !== undefined)
      .join('\n\n')
      .trim() + '\n'
  )
}

function heading(level: number, text: string): string {
  return `${'#'.repeat(level)} ${escapeMarkdown(text)}`
}

function dim(width: number | null, height: number | null): string {
  if (width == null && height == null) return 'not measured'
  return `${width ?? '?'}×${height ?? '?'}`
}

function landmarkFor(section: NormalizedSection): string {
  const name = section.name.toLowerCase()
  if (/\b(nav|navbar|menu)\b/.test(name)) return 'nav'
  if (/\b(header|masthead|topbar)\b/.test(name)) return 'header'
  if (/\b(footer|colophon)\b/.test(name)) return 'footer'
  if (/\b(hero|banner)\b/.test(name)) return 'hero'
  if (section.provenance === 'semantic' && /main/.test(name)) return 'main'
  return 'section'
}

function semanticTag(landmark: string): string {
  if (landmark === 'nav') return 'nav'
  if (landmark === 'header') return 'header'
  if (landmark === 'footer') return 'footer'
  if (landmark === 'hero' || landmark === 'main') return 'main'
  return 'section'
}

function landmarkReconstruction(design: NormalizedDesign): string {
  if (design.sections.length === 0) return '_No sections were captured._'
  const colorById = new Map(design.tokens.colors.map((token) => [token.id, token]))
  const typeById = new Map(design.tokens.typography.map((token) => [token.id, token]))
  const assetById = new Map(design.assets.map((asset) => [asset.id, asset]))
  const copy = design.content.filter((block) => block.text.trim())

  return design.sections
    .map((section) => {
      const landmark = landmarkFor(section)
      const colors = section.colorTokenIds
        .map((id) => colorById.get(id))
        .filter((token): token is NonNullable<typeof token> => Boolean(token))
        .map((token) => `${token.hex} (${token.role})`)
      const types = section.typographyTokenIds
        .map((id) => typeById.get(id))
        .filter((token): token is NonNullable<typeof token> => Boolean(token))
        .map(
          (token) =>
            `${escapeTableCell(token.fontFamily)} ${token.fontSize}/${token.lineHeight} weight ${token.fontWeight}`,
        )
      const images = section.assetIds
        .map((id) => assetById.get(id))
        .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset))
        .map((asset) => {
          const src = publicUrlFromAssetPath(asset.localPath)
          return `${src} rendered ${dim(asset.renderedWidth, asset.renderedHeight)} (file ${dim(asset.intrinsicWidth, asset.intrinsicHeight)}); alt="${asset.alt || ''}"`
        })
      const excerpts = copy
        .filter((block) => block.sectionId === section.id)
        .slice(0, 8)
        .map((block) => `${block.kind}: ${escapeTableCell(block.text).slice(0, 120)}`)
      return [
        `### ${escapeMarkdown(section.name)} (\`${landmark}\`)`,
        `- Recreate as \`<${semanticTag(landmark)}>\`. Provenance ${section.provenance}. Layout ${section.layoutMode}. Container ${section.containerWidth ?? 'full'}px.`,
        `- Bounds ${section.bounds.width}×${section.bounds.height} at ${section.bounds.x},${section.bounds.y}. Background: ${section.background}.`,
        colors.length ? `- Colors: ${colors.join('; ')}.` : '- Colors: use page tokens; do not invent a palette.',
        types.length ? `- Type: ${types.join('; ')}.` : '- Type: inherit captured typography tokens.',
        images.length
          ? `- Images: ${images.join('; ')}. Use those **rendered** sizes, not the file size.`
          : '- Images: none captured in this landmark.',
        excerpts.length ? `- Captured copy: ${excerpts.join(' | ')}.` : `- Summary: ${section.contentSummary}.`,
      ].join('\n')
    })
    .join('\n\n')
}

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
  for (const [signature, style] of Object.entries(design.styleRegistry)) {
    const property = style['transition-property']
    const duration = style['transition-duration']
    const animation = style['animation-name']
    const animationDuration = style['animation-duration']
    const hasTransition = Boolean(property && property !== 'none')
    const hasAnimation = Boolean(animation && animation !== 'none')
    if (!hasTransition && !hasAnimation) continue
    rows.push([
      signature.slice(0, 8),
      property || 'none',
      duration || '',
      animation || 'none',
      animationDuration || '',
    ])
  }
  if (rows.length === 0) {
    return '_No transition or animation names were captured on sampled elements. Do not invent motion._'
  }
  return mdTable(['Style id', 'transition-property', 'transition-duration', 'animation-name', 'animation-duration'], rows)
}
