import { SCHEMA_VERSION } from '../shared/constants';
import type { NormalizedDesign } from '../shared/types';
import { escapeMarkdown, escapeTableCell, mdTable } from '../normalize/markdown-escape';
import { coverageSummary } from '../validation/coverage';

export function generateDesignMarkdown(design: NormalizedDesign): string {
  const m = design.metadata;
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
        [
          'Viewport',
          `${m.viewportWidth}×${m.viewportHeight} @${m.devicePixelRatio}dppx`,
          'measured',
        ],
        ['Document size', `${m.scrollWidth}×${m.scrollHeight}`, 'measured'],
        ['Document background', m.documentBackground, 'measured'],
        ['Color scheme', m.colorScheme, 'observed'],
      ],
    ),
    heading(2, '2. Capture scope and limitations'),
    coverageSummary(design.coverage),
    '',
    ...design.limitations.map(
      (item) =>
        `- **${item.code}** (${item.severity}${item.inferred ? ', inferred' : ''}): ${item.message}`,
    ),
    design.limitations.length === 0 ? '- No scanner limitations were recorded.' : '',
    heading(2, '3. Visual direction'),
    visualDirection(design),
    heading(2, '4. Page and section structure'),
    mdTable(
      ['Section', 'Provenance', 'Confidence', 'Bounds', 'Layout', 'Background', 'Summary'],
      design.sections.map((section) => [
        section.name,
        section.provenance,
        String(section.confidence),
        `${section.bounds.width}×${section.bounds.height} at ${section.bounds.x},${section.bounds.y}`,
        section.layoutMode,
        section.background,
        section.contentSummary,
      ]),
    ),
    heading(2, '5. Content hierarchy'),
    'Exact copy is listed in `references/CONTENT.md`. Do not invent missing copy.',
    heading(2, '6. Assets'),
    mdTable(
      ['ID', 'Type', 'Local path', 'Original URL', 'Status', 'License review'],
      design.assets.map((asset) => [
        asset.id,
        asset.type,
        asset.localPath,
        asset.resolvedUrl,
        asset.downloadStatus,
        asset.licenseReviewRequired ? 'required' : 'not flagged',
      ]),
    ),
    heading(2, '7. Color tokens'),
    mdTable(
      ['Name', 'HEX', 'RGBA', 'Role', 'Count', 'Inferred'],
      design.tokens.colors.map((token) => [
        token.name,
        token.hex,
        token.rgba,
        token.role,
        String(token.count),
        token.roleInferred ? 'yes' : 'no',
      ]),
    ),
    heading(2, '8. Typography tokens'),
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
    heading(2, '9. Spacing, radius, and shadow tokens'),
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
        ...design.tokens.radii.map((t) => [
          'radius',
          t.name,
          t.value,
          String(t.count),
          t.nameInferred ? 'yes' : 'no',
        ]),
        ...design.tokens.shadows.map((t) => [
          'shadow',
          t.name,
          t.value,
          String(t.count),
          t.nameInferred ? 'yes' : 'no',
        ]),
      ],
    ),
    heading(2, '10. Container and layout measurements'),
    `Document ${design.page.documentWidth}×${design.page.documentHeight}. Viewport ${design.page.viewportWidth}×${design.page.viewportHeight}.`,
    heading(2, '11. Component patterns'),
    mdTable(
      ['Name', 'Kind', 'Confidence', 'Count', 'Notes'],
      design.components.map((c) => [
        c.name,
        c.kind,
        String(c.confidence),
        String(c.elementIds.length),
        c.notes,
      ]),
    ),
    heading(2, '12. Viewport behavior'),
    design.responsive
      .map(
        (item) =>
          `- ${item.label ?? 'viewport'} ${item.viewportWidth}×${item.viewportHeight}: ${item.captured ? 'captured' : 'not captured'}. ${item.notes}`,
      )
      .join('\n'),
    design.responsive.some((r) => r.mediaQueries.length)
      ? mdTable(
          ['Media query', 'Readable', 'Notes'],
          design.responsive.flatMap((r) =>
            r.mediaQueries.map((q) => [q.raw, q.readable ? 'yes' : 'no', q.notes]),
          ),
        )
      : '_No readable media queries were captured._',
    heading(2, '13. Observed interactions'),
    'Interaction states such as hover and focus were not executed. Only element affordances were recorded.',
    heading(2, '14. Accessibility observations'),
    `- Language: ${m.language}`,
    `- Direction: ${m.direction}`,
    `- Headings captured: ${design.content.filter((c) => c.kind === 'heading').length}`,
    `- Image alt texts captured: ${design.content.filter((c) => c.kind === 'image-alt').length}`,
    heading(2, '15. Implementation rules'),
    '- Use exported assets and exact captured copy.',
    '- Treat token names as inferred; keep measured values exact.',
    '- Do not invent sections, testimonials, metrics, or images.',
    '- Do not claim source-code recovery. This package contains rendered-page facts.',
    heading(2, '16. Visual validation procedure'),
    'Compare the implementation against `screenshots/viewport.png` and `screenshots/full-page.png` when those files exist. Use every captured viewport in `references/layout.json`.',
    heading(2, '17. Acceptance criteria'),
    '- Captured content appears in document order.',
    '- Measured colors, type, spacing, and radii match this specification.',
    '- Missing screenshots or failed assets are reported, not faked.',
    `- Coverage snapshot: ${escapeMarkdown(coverageSummary(design.coverage))}`,
  ];
  return (
    sections
      .filter((line) => line !== undefined)
      .join('\n\n')
      .trim() + '\n'
  );
}

function heading(level: number, text: string): string {
  return `${'#'.repeat(level)} ${escapeMarkdown(text)}`;
}

function visualDirection(design: NormalizedDesign): string {
  const topColors = design.tokens.colors.slice(0, 5).map((c) => `${c.hex} (${c.role})`);
  const topType = design.tokens.typography[0];
  const lines = [
    'Direction below is derived only from captured evidence.',
    topColors.length
      ? `Dominant observed colors: ${topColors.join(', ')}.`
      : 'No dominant colors were captured.',
    topType
      ? `Primary observed type: ${escapeTableCell(topType.fontFamily)} ${topType.fontSize}/${topType.lineHeight} weight ${topType.fontWeight}.`
      : 'No typography tokens were captured.',
  ];
  return lines.join('\n\n');
}
