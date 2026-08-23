# Cursor Master Prompt — Page Design Scanner Chrome Extension

## Your role

Act as a senior Chrome Extension engineer, frontend architect, and design-system extraction specialist. Build a production-quality, local-only Chrome extension that scans a webpage after an explicit user action and exports an agent-ready design reference package.

Work autonomously, but do not guess about missing repository facts. Inspect the existing project before modifying it. Preserve useful existing code and conventions. If the repository is empty, initialize the project according to this specification.

Do not build a backend, API server, authentication system, or cloud database. Node.js may be used only as the local development/build environment.

## Product objective

Create a Chrome Manifest V3 extension that lets a user open a webpage, click **Scan Page**, inspect the captured design information, and download one ZIP containing the page’s content, assets, screenshots, design tokens, and instructions for AI coding agents.

The exported package must help Cursor, Claude Code, VS Code agents, Antigravity, and similar coding agents recreate the reference page as accurately as technically possible.

The extension must capture observable design facts. It must not claim that the original source code, React components, business logic, or inaccessible resources were recovered.

## Required technology

- Chrome Extension Manifest V3
- React
- TypeScript with strict mode
- Vite
- Zustand for side-panel UI state
- IndexedDB for large temporary scan results and blobs
- `chrome.storage.local` for small preferences only
- `chrome.scripting` for user-triggered page scanning
- `chrome.downloads` for exports
- `chrome.sidePanel` for the main UI
- JSZip for a single downloadable archive
- Vitest for unit tests
- ESLint and Prettier

Use lightweight dependencies. Do not introduce MongoDB, Mongoose, Express, NestJS, Firebase, Supabase, or another remote service.

## Mandatory engineering principles

1. Keep capture, normalization, generation, export, and validation as independent modules.
2. Keep the extension local-first and private by default.
3. Run a scan only after a direct user action.
4. Request the minimum permissions needed.
5. Use `activeTab` instead of permanent access to every website.
6. Never collect password, payment, token, cookie, or hidden form values.
7. Do not use `eval`, remotely hosted code, or unsafe HTML injection.
8. Sanitize filenames and all HTML/SVG previews.
9. Do not store large scans in Zustand or `chrome.storage.local`.
10. Process large scans in chunks to avoid blocking the page or exceeding extension message limits.
11. Record extraction failures and limitations instead of silently inventing missing information.
12. Generate Markdown deterministically from normalized data. Do not require an AI API.

## Initial repository inspection

Before implementation:

1. Inspect the repository tree, package manager, configuration, and existing source files.
2. Check for project instructions such as `AGENTS.md`, `CLAUDE.md`, or Cursor rules and follow them.
3. Determine whether the project already has a working Manifest V3/Vite/React foundation.
4. Report a concise implementation plan based on what exists.
5. Implement in small, testable milestones.

Do not delete or replace unrelated user code.

## Target architecture

Use this conceptual flow:

```text
Side panel UI
    ↓ command/progress messages
Manifest V3 service worker
    ↓ programmatic injection
Content-script scanner
    ↓ chunked raw scan
Temporary IndexedDB storage
    ↓
Normalizer and token inference
    ↓
Markdown/JSON generators
    ↓
ZIP exporter and chrome.downloads
```

Suggested source structure:

```text
src/
├── background/
│   ├── service-worker.ts
│   ├── scan-orchestrator.ts
│   └── message-router.ts
├── content/
│   ├── scan-entry.ts
│   ├── dom-scanner.ts
│   ├── content-scanner.ts
│   ├── asset-scanner.ts
│   ├── color-scanner.ts
│   ├── typography-scanner.ts
│   ├── layout-scanner.ts
│   ├── pseudo-scanner.ts
│   ├── section-detector.ts
│   └── lazy-load.ts
├── sidepanel/
│   ├── App.tsx
│   ├── components/
│   ├── features/
│   └── store/
├── storage/
│   ├── indexed-db.ts
│   └── preferences.ts
├── normalize/
│   ├── normalize-scan.ts
│   ├── colors.ts
│   ├── typography.ts
│   ├── spacing.ts
│   ├── sections.ts
│   └── components.ts
├── generators/
│   ├── design-md.ts
│   ├── skill-md.ts
│   ├── agents-md.ts
│   ├── claude-md.ts
│   ├── cursor-rule.ts
│   ├── content-md.ts
│   └── prompts.ts
├── export/
│   ├── zip-exporter.ts
│   ├── asset-downloader.ts
│   └── filename.ts
├── validation/
│   ├── scan-validator.ts
│   └── coverage.ts
├── shared/
│   ├── messages.ts
│   ├── constants.ts
│   ├── errors.ts
│   └── types.ts
└── tests/
```

Adjust paths when the existing project has an established structure, but preserve the module boundaries.

## Manifest requirements

Create a Manifest V3 configuration with only the necessary base permissions:

```json
{
  "manifest_version": 3,
  "permissions": ["activeTab", "scripting", "downloads", "storage", "sidePanel"]
}
```

Requirements:

- Register a module service worker.
- Configure the extension action and side panel.
- Avoid `<all_urls>` in the first release.
- Do not add `debugger` in the MVP.
- Do not add `pageCapture` unless a later milestone explicitly uses and tests it.
- Provide extension icons and accessible labels.

## Core data contracts

Define strict serializable TypeScript types. Do not pass DOM objects, CSSStyleDeclaration instances, or non-cloneable values between extension contexts.

At minimum, create types equivalent to:

```ts
export interface PageScan {
  schemaVersion: string;
  metadata: PageMetadata;
  page: PageGeometry;
  sections: PageSection[];
  elements: ScannedElement[];
  assets: AssetRecord[];
  colors: ColorUsage[];
  typography: TypographyUsage[];
  spacing: NumericUsage[];
  radii: NumericUsage[];
  shadows: ShadowUsage[];
  cssVariables: CssVariableRecord[];
  interactions: InteractionRecord[];
  limitations: ScanLimitation[];
  coverage: ScanCoverage;
}

export interface NormalizedDesign {
  schemaVersion: string;
  metadata: PageMetadata;
  sections: NormalizedSection[];
  components: ComponentPattern[];
  tokens: {
    colors: ColorToken[];
    typography: TypographyToken[];
    spacing: DesignToken[];
    radii: DesignToken[];
    shadows: DesignToken[];
  };
  assets: AssetRecord[];
  responsive: ResponsiveObservation[];
  content: ContentBlock[];
  limitations: ScanLimitation[];
  coverage: ScanCoverage;
}
```

Every generated file must include the schema version or reference a JSON file that does.

## Scan lifecycle

Implement the following state machine:

```text
idle → preparing → lazy-loading → scanning → normalizing
     → validating → ready → exporting → complete
```

Also support `cancelled` and `failed` states.

The side panel must show:

- Current hostname
- Current phase
- Progress indicator
- Counts for elements, text blocks, images, colors, and typography styles
- Warnings and inaccessible items
- Cancel control when cancellation is safe
- Rescan control
- Export control only after a usable scan exists

Never display a fabricated percentage. Derive progress from completed phases and known chunk counts.

## Capture requirements

### Page metadata

Capture:

- Page URL with sensitive query values redacted
- Page title
- Language and text direction
- Scan timestamp
- Viewport width and height
- Device pixel ratio
- Scroll width and height
- Document background
- Current color-scheme preference
- Current scroll position so it can be restored

### Lazy-loaded content

Before scanning, offer a **Load lazy content** option enabled by default.

- Incrementally scroll through the document.
- Use animation-frame-aware delays rather than one large blocking loop.
- Stop at a configurable maximum height and duration.
- Detect likely infinite-scroll growth and stop safely.
- Restore the original scroll position.
- Wait for `document.fonts.ready` and a short image-settling period.
- Report when the scan was truncated.

### DOM and layout

Scan the rendered DOM, not only `outerHTML`.

For each relevant element capture:

- Stable generated element ID
- Parent ID and child order
- Tag name
- Safe attributes
- ID and class names
- Semantic role
- Visible/hidden status and reason
- Bounding rectangle in document coordinates
- Relevant computed-style allowlist
- Direct text only, without duplicating all descendant text
- Section association
- Asset associations

Exclude extension-owned UI from the scan.

Use a computed-style allowlist covering:

- Display and positioning
- Width, height, min/max sizes
- Margin, padding, gap
- Flexbox and grid properties
- Background color/image
- Text color
- Borders and radii
- Shadows and opacity
- Typography properties
- Overflow
- Transform
- Z-index
- Object fit and object position
- Transitions and animation metadata

Do not serialize every computed property for every element. Deduplicate style signatures.

### Content

Capture semantic and visible content:

- Heading hierarchy
- Paragraphs
- Lists
- Links and resolved destinations
- Buttons
- Navigation labels
- Form labels and non-sensitive placeholders
- Tables
- Image alternative text
- ARIA labels required to understand the visible interface
- Header, main, section, aside, and footer relationships

Never capture input values. Never capture password, hidden, payment, token, or authentication fields.

Provide content modes:

- Visible content only
- Main content when detectable
- Include navigation and footer
- Include hidden structural elements, disabled by default

### Images and assets

Discover and deduplicate:

- `img.src` and `img.currentSrc`
- `srcset` candidates
- `picture source` candidates
- CSS `background-image`
- CSS masks
- CSS `content: url(...)`
- Inline SVG
- External SVG
- Favicons
- Video poster images
- Open Graph image metadata
- Common lazy-image attributes such as `data-src`

Resolve relative URLs against `document.baseURI`. Keep the original URL and the resolved URL. Hash normalized asset identities to deduplicate them.

For every asset record include:

- Type
- Source URL
- Local exported path
- MIME type when known
- Intrinsic and rendered dimensions when known
- Element/section usages
- Download status
- Failure reason
- Whether licensing or redistribution may require review

Do not fail the complete export because one asset cannot be downloaded.

### Inline SVG

- Serialize safe inline SVG markup.
- Remove scripts, event-handler attributes, and unsafe external references.
- Preserve viewBox, fill, stroke, gradients, masks, and IDs where safe.
- Give each exported SVG a deterministic filename.

### Typography

Wait for `document.fonts.ready` before the main typography pass.

Capture text-bearing elements with:

- Font family stack
- Font size
- Font weight
- Font style
- Line height
- Letter spacing
- Font stretch
- Text transform
- Text decoration
- Text alignment
- Font feature settings
- Font variation settings

Group repeated combinations into tokens and include usage counts and representative selectors/elements.

Do not automatically redistribute proprietary font files. Export font metadata and discovered source URLs. Mark font downloads as requiring license review unless clearly safe.

### Colors

Extract colors from:

- Text
- Backgrounds
- Borders
- Outlines
- Shadows
- SVG fill and stroke
- Gradients
- Pseudo-elements
- CSS custom properties

Normalize solid colors to canonical RGBA and HEX with alpha. Preserve gradient definitions and stops. Exclude fully transparent values unless they are semantically relevant.

Group exact duplicates. Optionally suggest near-duplicate relationships, but never merge perceptually similar colors without recording that it was inferred.

Each color token must include:

- Canonical value
- Original representations
- Usage count
- Properties in which it appears
- Representative element usages
- Suggested semantic role marked as inferred

The side panel must support copying HEX, RGB, HSL, OKLCH, CSS variables, and a Tailwind-compatible color object.

### Spacing, radius, shadows, and layout

Collect repeated values from rendered styles and infer reusable tokens based on frequency.

- Preserve raw measurements.
- Separate observed values from inferred token names.
- Do not force values into a fabricated scale.
- Detect containers, columns, grids, common gaps, card patterns, and button patterns using deterministic heuristics.
- Record confidence for inferred sections and components.

### Pseudo-elements

Inspect `::before` and `::after` for relevant elements. Capture visible generated content, geometry-relevant styles, colors, backgrounds, and assets.

### Sections

Prefer semantic page elements. Otherwise infer sections from top-level geometry, backgrounds, spacing breaks, and repeated groups.

For each section include:

- Stable ID
- Suggested name marked as inferred
- DOM range or root element ID
- Bounds
- Background
- Container geometry
- Layout mode
- Content summary
- Associated assets
- Typography and color usages
- Confidence

## Responsive limitations

The local MVP scans the current rendered viewport. It must not pretend that it has recovered every responsive breakpoint.

Record:

- Current viewport observations as measured facts
- Accessible media-query information when safely readable
- Responsive values as observations or inferences with provenance

Generate instructions asking the coding agent to validate desktop, tablet, and mobile screenshots. If the extension captures only one viewport, clearly label other viewport rules as not captured.

Design the data model so multi-viewport scans can be added later without breaking the schema.

## Screenshot requirements

For the MVP:

- Capture at least the visible viewport using a supported Chrome API from the service worker flow.
- Add full-page capture only when implemented reliably through controlled scrolling and stitching.
- Pause CSS animations and transitions only during screenshot capture, then restore them.
- Record viewport dimensions and device pixel ratio with each screenshot.
- Never claim a full-page screenshot when only the viewport was captured.

## Normalization requirements

Normalization must be deterministic and independently testable.

Implement:

1. URL and filename normalization.
2. Asset deduplication.
3. Color parsing and canonicalization.
4. Typography signature grouping.
5. Style signature deduplication.
6. Repeated spacing/radius/shadow frequency analysis.
7. Section association.
8. Component-pattern inference.
9. Content ordering.
10. Coverage calculation.

Keep both observed raw values and inferred semantic results. Every inference must be identifiable as inferred and may include a confidence score.

## Coverage validation

Before export, calculate scan coverage—not recreation similarity.

Include metrics such as:

- Relevant elements scanned
- Visible text blocks captured
- Discovered images/assets
- Assets successfully downloaded
- Text-bearing elements with typography records
- Styled elements with normalized style signatures
- Sections successfully associated
- Screenshot availability

Do not label this value as “95% design match.” The extension cannot measure recreation similarity before another tool implements the page.

Create warnings for:

- Cross-origin iframe content
- Closed or inaccessible Shadow DOM
- Canvas/WebGL content
- Failed authenticated assets
- Unreadable cross-origin stylesheets
- Infinite-scroll truncation
- Unsupported CSS color syntax
- Proprietary font files
- Missing screenshots

## Side-panel interface

Build a polished, accessible side panel with these views:

1. **Overview** — URL, scan status, counts, coverage, limitations
2. **Content** — ordered text/semantic blocks with copy controls
3. **Images** — previews, dimensions, usage, selection, status
4. **Icons & SVG** — safe previews and export selection
5. **Colors** — swatches, values, usage, copy formats
6. **Typography** — token preview, values, usage
7. **Layout** — sections, containers, spacing, radius, shadows
8. **Export** — formats, included assets, validation summary

Requirements:

- Keyboard accessible
- Clear focus indicators
- Semantic controls and labels
- WCAG-aware contrast
- Virtualize long lists when necessary
- Never render untrusted page HTML directly
- Allow selecting/deselecting individual assets
- Allow copying individual values and complete token formats

## Export package

Generate one sanitized ZIP folder named from the hostname and scan timestamp:

```text
<hostname>-design-export/
├── DESIGN.md
├── AGENTS.md
├── CLAUDE.md
├── SKILL.md
├── .cursor/
│   └── rules/
│       └── recreate-reference-page.mdc
├── prompts/
│   ├── BUILD_PAGE.md
│   └── VALIDATE_PAGE.md
├── references/
│   ├── CONTENT.md
│   ├── design-tokens.json
│   ├── layout.json
│   ├── scan.json
│   ├── asset-manifest.json
│   └── limitations.json
├── screenshots/
│   ├── viewport.png
│   └── full-page.png
└── assets/
    ├── images/
    ├── icons/
    ├── svg/
    └── fonts/
```

Omit files that were not actually produced and explain their absence in `limitations.json` and `DESIGN.md`. Do not create fake placeholder screenshots or assets.

## `DESIGN.md` generation contract

Generate a readable, page-specific design specification containing:

1. Source and scan metadata
2. Capture scope and limitations
3. Visual direction based only on observed evidence
4. Page and section structure
5. Exact content hierarchy or a link to `references/CONTENT.md`
6. Asset table with local paths and original usage
7. Color tokens
8. Typography tokens
9. Spacing, radius, border, shadow, and gradient tokens
10. Container and layout measurements
11. Component patterns
12. Current viewport behavior
13. Observed interaction information
14. Accessibility observations
15. Implementation rules
16. Visual validation procedure
17. Acceptance criteria

Use tables where exact mappings are helpful. Clearly label measured, observed, and inferred information.

Do not use vague instructions such as “make it modern,” “make it pixel perfect,” or “use a clean style” without measured supporting details.

## `SKILL.md` generation contract

Generate a concise agent skill with YAML frontmatter containing only:

```yaml
---
name: recreate-scanned-page
description: Recreate and visually validate this scanned reference page using its captured design specification, content, assets, tokens, layouts, and screenshots. Use when implementing or repairing the exported reference interface in a frontend project.
---
```

The body must be procedural and under 500 lines. It must:

- Tell the agent which references to read.
- Require use of supplied assets and exact supplied content.
- Define implementation order.
- Separate measured facts from inferences.
- Prohibit invented sections, copy, metrics, testimonials, or assets.
- Require responsive validation.
- Require screenshot-based checking when screenshots exist.
- Define the order in which visual differences should be fixed.
- Refer detailed page data to `DESIGN.md` and `references/` instead of duplicating it.

## `AGENTS.md` generation contract

Generate repository-oriented instructions that tell an agent to:

- Read `DESIGN.md` first.
- Inspect the target project before coding.
- Preserve the target framework and conventions.
- Reuse exported assets.
- Build reusable components without losing visual fidelity.
- Avoid replacing exact content with generated copy.
- Avoid adding dependencies unless justified.
- Run the target project’s lint, type-check, test, and build commands.
- Validate at recorded viewport sizes.
- Report inaccessible or uncertain details honestly.

## `CLAUDE.md` generation contract

Generate concise Claude Code project instructions referencing the same `DESIGN.md`, screenshots, assets, and validation workflow. Avoid duplicating the entire design specification.

## Cursor rule generation contract

Generate `.cursor/rules/recreate-reference-page.mdc` with valid frontmatter and scoped implementation rules. It must not always apply to unrelated work. It should tell Cursor to read the exported design references whenever recreating the captured page.

## Build and validation prompts

Generate `prompts/BUILD_PAGE.md` with a direct implementation task. It must require the receiving agent to:

- Inspect the target repository.
- Determine the framework and styling approach.
- Read all required references.
- Implement the page in content order.
- Use local assets.
- Match recorded geometry and design tokens.
- Validate rather than stop after initial coding.

Generate `prompts/VALIDATE_PAGE.md` with a correction workflow that prioritizes:

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

It must state that visual similarity cannot be inferred from code inspection alone.

## Asset download and ZIP behavior

- Prefer one ZIP download rather than many browser downloads.
- Use bounded concurrency for network requests.
- Add reasonable asset count, byte-size, page-height, and timeout limits.
- Preserve file extensions based on validated MIME type or URL.
- Prevent path traversal and invalid filenames.
- Use deterministic collision handling.
- Include failed assets in the manifest.
- Revoke object URLs after use.
- Clear temporary blobs after a completed or cancelled export.
- Allow export without failed assets.

## IndexedDB usage

Use IndexedDB only for temporary local data:

- Raw scan chunks
- Normalized scan
- Image and screenshot blobs
- Current export session

Add a retention policy that deletes stale incomplete scans. Provide **Clear local scan data** in settings. Do not implement permanent cloud-style project history in the MVP.

## Messaging requirements

Create a discriminated-union message protocol between the side panel, service worker, and content script.

Requirements:

- Schema/version field
- Request ID and scan ID
- Explicit message types
- Typed payloads
- Progress events
- Chunk sequence and total when known
- Cancellation
- Structured errors
- Sender validation where applicable
- No giant monolithic response

Test message parsing and rejection of malformed messages.

## Error handling

- Use typed domain errors.
- Present actionable user messages.
- Preserve partial results when safe.
- Never expose private page data in console logs in production.
- Avoid logging raw DOM, content, tokens, or asset URLs unless development logging is explicitly enabled.
- Record warnings separately from fatal errors.

## Testing requirements

Add unit tests for:

- Color parsing and normalization
- CSS URL extraction
- `srcset` parsing
- Filename sanitization
- Asset deduplication
- Typography signature grouping
- Spacing frequency analysis
- Content ordering
- Markdown escaping
- Every Markdown generator
- ZIP path generation
- Coverage calculation
- Message validation

Add at least one controlled fixture page containing:

- Semantic sections
- Responsive layout
- Images and `srcset`
- Inline SVG
- CSS background image
- Gradients
- Pseudo-elements
- Multiple typography styles
- CSS variables
- Lazy-loaded image
- A sensitive form field that must not be captured

Use the fixture for an integration test or documented manual verification flow.

## Quality gates

Before declaring a milestone complete, run the relevant commands. Before final completion, ensure all of the following pass:

- Dependency installation
- TypeScript type checking
- ESLint
- Unit tests
- Production build
- Manifest validation
- Extension loading as an unpacked extension
- Scan of the controlled fixture
- ZIP export
- Inspection that generated Markdown references valid exported paths
- Verification that sensitive form values are absent

Do not say a check passed unless it was actually run successfully. If Chrome UI interaction cannot be automated in the environment, state the exact manual steps still required.

## Milestone plan

Implement in this order.

### Milestone 1 — Extension shell

- Vite + React + TypeScript foundation
- Manifest V3
- Service worker
- Side panel
- Zustand UI state
- Typed messaging foundation
- Basic lint, type-check, test, and build

Acceptance: the unpacked extension opens a working side panel and can identify the active tab after a user action.

### Milestone 2 — Core page scan

- Page metadata
- DOM geometry
- Selected computed styles
- Visible content
- Basic image discovery
- Typography usage
- Color usage
- Chunked transport
- Scan progress and cancellation

Acceptance: scanning the fixture produces valid typed JSON without sensitive field values.

### Milestone 3 — Normalization and review UI

- Token grouping
- Asset deduplication
- Section detection
- Coverage report
- Overview, content, image, color, typography, and layout views
- Copy controls

Acceptance: the same fixture scan produces deterministic normalized output and usable UI previews.

### Milestone 4 — Agent file generation

- `DESIGN.md`
- `SKILL.md`
- `AGENTS.md`
- `CLAUDE.md`
- Cursor rule
- Build and validation prompts
- JSON references

Acceptance: generator tests pass and generated documents contain no fake observations.

### Milestone 5 — Asset and ZIP export

- Safe asset fetching
- Inline SVG export
- Screenshot support
- JSZip archive
- Asset manifest
- Failed-resource handling
- Download through `chrome.downloads`

Acceptance: one ZIP downloads, opens correctly, uses safe paths, and all document links refer to existing files or explicitly documented missing resources.

### Milestone 6 — Hardening

- Lazy-load scan
- Large-page limits
- IndexedDB cleanup
- Performance improvements
- Accessibility review
- Privacy review
- Error and cancellation recovery
- Fixture integration verification

Acceptance: the extension remains responsive on a large fixture and clears temporary data correctly.

Do not implement advanced debugger/CDP capture until the MVP is stable and the user explicitly approves that permission expansion.

## Definition of done

The MVP is complete only when:

1. The extension works without a backend or database.
2. A user can scan the active webpage from the side panel.
3. The scan includes content, relevant computed styles, typography, colors, spacing, layout, images, SVG, assets, and limitations.
4. Sensitive form values are never captured.
5. The user can inspect and copy major design values.
6. The user can export one agent-ready ZIP.
7. The ZIP contains valid page-specific Markdown and JSON files.
8. Generated files distinguish observed facts from inferences.
9. Failed resources are reported without stopping the export.
10. Type-checking, linting, tests, and the production build pass.
11. The extension does not claim a visual-match percentage that it has not measured.
12. The final handoff documents how to load the extension, scan a page, export a package, and use that package inside Cursor or Claude Code.

## How to communicate while implementing

- Lead with completed outcomes and current blockers.
- Keep progress updates concise.
- Explain meaningful architectural decisions.
- Ask only when a missing decision materially affects the product.
- When blocked, preserve completed work and provide the exact next action.
- At the end, list changed files, commands run, test/build results, known limitations, and manual Chrome verification steps.

## Start now

Inspect the repository and existing instructions. Then provide a concise milestone plan tailored to the current codebase and begin Milestone 1. Continue through the milestones while safe and feasible; do not stop after merely generating a plan.
