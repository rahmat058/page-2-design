# Page2Design — Architecture

Chrome **Manifest V3** extension that scans the **active tab** in-page, normalizes what was **observed**, and exports one **agent-ready ZIP**. There is **no backend**. Capture, storage, and ZIP build all stay on the device.

The ZIP describes the **rendered** page so Cursor, Claude Code, and similar agents can recreate it. It does not recover original source, React trees, or private form values.

For install, test, and everyday use — see **[README.md](./README.md)**.

---

## High-level map

```
  Toolbar icon
       │
       ├─ http(s) tab ──► content overlay (inspector UI)
       └─ chrome:// etc. ──► Chrome side panel (same UI)
                │
                ▼
     ┌──────────────────────────────────────┐
     │         background.js                │
     │  message router · scan orchestrator  │
     │  CSS inspect · screenshots · ZIP     │
     └──────────────────────────────────────┘
           │              │              │
           ▼              ▼              ▼
     content.js      IndexedDB      sidepanel.html
     (DOM scan)     (scan cache)    (React inspector)
```

| Area            | Runs in                       | Role                                                                 |
| --------------- | ----------------------------- | -------------------------------------------------------------------- |
| Overlay / panel | `sidepanel.html` in iframe/SW | React UI — scan, inspect, generate markdown, export                  |
| Content script  | Isolated world on the page    | DOM walk, overlay host, inspect mode, chunked `PageScan`             |
| Service worker  | `background.js`               | Orchestrate scan, assemble chunks, normalize, screenshots, downloads |
| Shared          | imported by all three bundles | Types, messages, constants, redaction, viewport helpers              |

---

## Project structure

```
Page2Design/
├── LICENSE                    # MIT
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── CHANGELOG.md
├── SECURITY.md
├── PRIVACY.md                 # Local-only data handling (store listing URL)
├── README.md
├── ARCHITECTURE.MD
├── commitlint.config.ts       # Conventional commits + type emojis
├── .husky/                    # pre-commit, commit-msg, pre-push
├── public/
│   ├── manifest.json          # MV3 manifest (copied to dist)
│   ├── inspect-css.js         # Injected into the tab for CSS Information
│   └── icons/                 # Toolbar icons you supply (16 / 32 / 48 / 128)
├── fixtures/                  # Local HTML fixture for first-run tests
├── scripts/
│   ├── build.mjs              # Vite: sidepanel + background + content
│   ├── cz-commitlint-emoji.mjs
│   └── prepend-commit-emoji.mjs
├── src/
│   ├── background/            # Service worker
│   │   ├── service-worker.ts  # Action click, message listener
│   │   ├── message-router.ts  # Typed message switch
│   │   ├── scan-orchestrator.ts
│   │   ├── read-tab-css.ts    # Live CSS Information (CSS Peeper-style)
│   │   └── device-emulation.ts # Leftover CDP helpers (UI uses iframe preview; no debugger permission)
│   ├── content/               # Injected page scanner + overlay
│   │   ├── scan-entry.ts      # Message handlers in the tab
│   │   ├── scan-page.ts       # Full-page scan pipeline
│   │   ├── overlay-host.ts    # Floating inspector iframe
│   │   ├── inspect-mode.ts    # Click-to-inspect
│   │   └── *scanner.ts        # DOM, color, type, assets, content, …
│   ├── sidepanel/             # React inspector (overlay + side panel)
│   │   ├── App.tsx            # Shell only — wires chrome, views, hooks
│   │   ├── main.tsx
│   │   ├── hooks/             # Shared hooks (runtime, overlay, busy, …)
│   │   ├── lib/               # Non-React helpers (view titles, panel actions)
│   │   ├── store/             # Zustand (`useScanStore`, toast)
│   │   ├── features/          # Overview, Design System, Typography, Assets, Responsive, Export, Developer, …
│   │   └── components/        # Folder-per-component when logic is non-trivial
│   │       ├── PanelChrome/   # index + lib/ (overlay drag)
│   │       ├── BottomNav/     # index + lib/ (nav items)
│   │       ├── Segmented/     # + hooks/use-segmented-indicator
│   │       ├── VirtualList/   # + LazyMount
│   │       └── …             # Button, Switch, Toast, …
│   ├── normalize/             # PageScan → NormalizedDesign
│   ├── generators/            # AGENTS.md, DESIGN.md, prompts, JSON refs
│   ├── export/                # ZIP layout, asset download, filenames
│   ├── validation/            # Coverage + scan sanity
│   ├── storage/               # IndexedDB scans + blobs
│   ├── shared/                # Types, messages, constants, CSS format, device presets
│   └── tests/                 # Vitest unit tests
├── vite.config.ts             # Side panel / overlay UI
├── vite.background.config.ts
└── vite.content.config.ts
```

There is **no** icon generator — place PNGs under `public/icons/` yourself. Build copies them into `dist` only.

Three Vite builds write into `dist/`:

| Config                      | Output                       |
| --------------------------- | ---------------------------- |
| `vite.config.ts`            | `sidepanel.html` + UI assets |
| `vite.background.config.ts` | `background.js`              |
| `vite.content.config.ts`    | `content.js` (IIFE)          |

`npm run build` typechecks, then runs all three. Load **`dist`**, not the repo root, in `chrome://extensions`.

---

## Runtime surfaces

| Surface        | When                                                        | Shell                                    |
| -------------- | ----------------------------------------------------------- | ---------------------------------------- |
| Overlay        | Toolbar click on a normal `http(s)` page                    | Iframe hosted by `overlay-host.ts`       |
| Side panel     | Restricted URLs, or **Open side panel** from overlay chrome | `chrome.sidePanel` → `sidepanel.html`    |
| Content script | Injected with `chrome.scripting.executeScript` (all frames) | Isolated world; top frame owns full scan |

Overlay width is `OVERLAY_WIDTH` (336px). Generate Markdown widens to `OVERLAY_WIDE_WIDTH` (560px). **Responsive** adds a Mac-style preview to the left of the overlay; host width becomes panel + `OVERLAY_FLYOUT_GAP` + preview width (phones stay compact; tablets cap at 1024px CSS; desktops at 1280px; overlay `maxHeight` 760px). The live tab is not resized.

Restricted URLs (`chrome:`, `edge:`, `about:`, Web Store) cannot be scanned. The action falls back to the side panel.

---

## Scan pipeline

```
START_SCAN
    │
    ▼
content.js  runPageScan()
    │  fonts ready → optional lazy scroll → DOM walk
    │  colors / type / spacing / assets / sections
    │  SCAN_CHUNK × N  (meta, sections, elements, styles, assets, tokens, content)
    ▼
background  assembleScan(chunks)
    │  merge cross-origin frames
    │  optional extra viewport snapshots
    │  live CSS Information (inspect-css.js)
    │  normalizeScan() → NormalizedDesign
    │  IndexedDB putScan()
    ▼
SCAN_COMPLETE (assembled: true)
    │
    ▼
sidepanel  loadScan() → Zustand store → Overview / Design System / …
```

### Content scan (`src/content/scan-page.ts`)

| Step           | Module                                | Notes                                             |
| -------------- | ------------------------------------- | ------------------------------------------------- |
| Lazy content   | `lazy-load.ts`                        | Optional; capped by `MAX_LAZY_LOAD_MS` (12s)      |
| DOM + styles   | `dom-scanner.ts`                      | Allowlisted computed styles; max `MAX_ELEMENTS`   |
| Filters        | `scan-filters.ts`                     | Skip noise, embeds, hidden flatten                |
| Colors / type  | `color-scanner`, `typography-scanner` | Frequency + area                                  |
| Layout numbers | `layout-scanner.ts`                   | Spacing, radius, shadow                           |
| Assets         | `asset-scanner.ts`                    | Images, icons, SVG, fonts; blob materialize       |
| Content blocks | `content-scanner.ts`                  | Headings, text, links — no password/hidden values |
| Sections       | `section-detector.ts`                 | Header / main / footer from captured tags         |
| CSS variables  | `readCssVariables()`                  | `:root` custom properties                         |
| Media queries  | `readMediaQueries()`                  | From readable `cssRules`                          |
| Transport      | `chunkScan()`                         | 40 elements per chunk (`ELEMENT_CHUNK_SIZE`)      |

Default options (`DEFAULT_SCAN_OPTIONS`): lazy content **on**, nav/footer **on**, extra viewports **on**, hidden structure **off**.

### Background assemble (`src/background/scan-orchestrator.ts`)

1. `assembleScan` stitches chunks into `PageScan`
2. `mergeFrameScan` folds compact iframe scans into the parent
3. Extra viewports: infer breakpoints from media queries (window is **not** resized for the default overlay scan)
4. `readTabCssInformation` injects `inspect-css.js` into the **top frame** and fetches CORS stylesheets (same counters as CSS Peeper: top-level `cssRules.length`, `document.styleSheets.length`, network bytes, sum of resource `duration`)
5. `normalizeScan` builds tokens, sections, class recipes, document outline, media substitutions
6. Coverage is capture coverage, not a visual-match score

### Normalization (`src/normalize/`)

| Module                   | Output                                          |
| ------------------------ | ----------------------------------------------- |
| `colors.ts`              | Color tokens, roles, near-duplicates, gradients |
| `typography.ts`          | Grouped type tokens                             |
| `spacing.ts`             | Frequency spacing / radius tokens               |
| `sections.ts`            | Named regions + composition                     |
| `components.ts`          | Repeated component patterns                     |
| `class-recipes.ts`       | Project class names + measured CSS              |
| `dom-outline.ts`         | Captured markup tree for `DESIGN.md` section 5  |
| `media-substitutions.ts` | Video / iframe / canvas → static stand-ins      |

---

## Inspector UI

React 19 + Zustand (`useScanStore`). Same bundle for overlay and side panel.

### Bottom nav

| View              | Feature module                                   | Purpose                                                                |
| ----------------- | ------------------------------------------------ | ---------------------------------------------------------------------- |
| Overview          | `OverviewView.tsx`                               | Intro, type pair, palette, contrast, CSS info                          |
| Content           | `ContentView.tsx`                                | Grouped text / links                                                   |
| Design System     | `DesignSystemView.tsx` / `DesignSystemPanel.tsx` | Color ramps, type, components, tokens, CSS/Tailwind/shadcn/JSON export |
| Typography        | `ColorsView.tsx`                                 | Type cards                                                             |
| Assets            | `ContentView.tsx`                                | Images / icons / SVG (grid or list)                                    |
| Generate Markdown | `MarkdownView.tsx`                               | Live preview of ZIP markdown / JSON                                    |
| Export            | `ExportView.tsx`                                 | Asset picker + Download ZIP                                            |
| Developer         | `DeveloperView.tsx`                              | Author profile and repo star link                                      |
| Responsive        | `ResponsiveView.tsx`                             | Device list in-panel + Mac preview beside the overlay (not a nav tab)  |

**Inspect Mode** (chrome switch) replaces the current view with `InspectorView.tsx` — click an element on the page to see measured styles.

**Responsive** opens from **More Options**. The device list (search + Phones / Tablets / Desktop accordions) replaces the main pane; presets live in `src/shared/device-presets.ts`. The preview iframe loads the current tab URL at that CSS-pixel size so media queries apply. There is **no** `debugger` permission — picking a device does not emulate or squeeze the live page. Sites that forbid framing show a blank preview. `layout.json` is still generated for the ZIP; `LayoutView.tsx` is unused UI.

### CSS Information

Overview reads **live** tab metrics via `GET_CSS_INFO` (fallback: last scan’s `cssInformation`).

| Field       | Source                                                              |
| ----------- | ------------------------------------------------------------------- |
| Style Rules | Sum of top-level `cssRules.length` (a `@media` block counts as one) |
| CSS file    | Network `decodedBodySize` / `encodedBodySize` / `transferSize`      |
| Stylesheets | `document.styleSheets.length` on the top frame                      |
| Load Time   | Sum of CSS resource `duration` values                               |

CORS sheets: `cssRules` throws → background `fetch` + `countTopLevelCssRules`.

---

## Messages

All runtime messages are versioned (`MESSAGE_SCHEMA_VERSION`) and parsed in `src/shared/messages.ts`. Unknown or malformed payloads are dropped.

| Type                 | Direction               | Purpose                                             |
| -------------------- | ----------------------- | --------------------------------------------------- |
| `GET_ACTIVE_TAB`     | UI → SW                 | Identify the current tab                            |
| `START_SCAN`         | UI → SW → content       | Begin scan                                          |
| `CANCEL_SCAN`        | UI → SW → content       | Abort in-flight scan                                |
| `SCAN_CHUNK`         | content → SW            | Partial `PageScan`                                  |
| `SCAN_PROGRESS`      | content / SW → UI       | Phase + counts                                      |
| `SCAN_COMPLETE`      | content → SW → UI       | `assembled: true` after persist                     |
| `SCAN_FAILED`        | SW → UI                 | User-facing error                                   |
| `GET_SCAN`           | UI → SW                 | Load raw + normalized                               |
| `GET_CSS_INFO`       | UI → SW                 | Live CSS Information                                |
| `START_EXPORT`       | UI → SW                 | Build ZIP                                           |
| `CAPTURE_SCREENSHOT` | UI → SW                 | Viewport + full-page PNG                            |
| `FETCH_ASSET`        | UI / content → SW       | Bytes for ZIP / tiles                               |
| `TOGGLE_OVERLAY`     | SW → content            | Open / close floating UI                            |
| Overlay resize       | UI → page (postMessage) | Grow/shrink host for Markdown or Responsive preview |
| `DOCK_SIDE_PANEL`    | UI → SW                 | Open Chrome side panel                              |
| `SET_INSPECT_MODE`   | UI → content            | Click-to-inspect                                    |
| `INSPECT_ELEMENT`    | content → UI            | Selected element snapshot                           |
| `HIGHLIGHT_COLOR`    | UI → content            | Flash matching elements                             |

---

## Export ZIP

`src/export/zip-exporter.ts` + `src/generators/`. Paths in `src/export/package-paths.ts` (`PKG`).

```
AGENTS.md, CLAUDE.md, SKILL.md
.cursor/rules/recreate-reference-page.mdc
assets/{images,icons,svg,fonts}/
docs/DESIGN.md
docs/prompts/{BUILD_PAGE,VALIDATE_PAGE}.md
docs/references/{CONTENT.md, design-tokens.json, layout.json, scan.json, asset-manifest.json, limitations.json}
docs/screenshots/{viewport,full-page}.png
```

Missing files are omitted and listed in `limitations.json`. Agents should start at `AGENTS.md`, then `docs/DESIGN.md` (section 5 is captured markup).

Asset limits: 500 files, 8MB each, 80MB total (`MAX_ASSETS`, `MAX_ASSET_BYTES`, `MAX_TOTAL_ASSET_BYTES`).

---

## Storage

| Store          | Module                   | Contents                            |
| -------------- | ------------------------ | ----------------------------------- |
| IndexedDB      | `storage/indexed-db.ts`  | `scans` (raw + normalized), `blobs` |
| chrome.storage | `storage/preferences.ts` | UI prefs                            |

Scan records older than 24h (`STALE_SCAN_MS`) or incomplete after 1h (`INCOMPLETE_SCAN_MS`) are purged on install/startup.

---

## Privacy

Store listing and end-user policy: **[PRIVACY.md](./PRIVACY.md)**.

| Rule                   | Implementation                                                                  |
| ---------------------- | ------------------------------------------------------------------------------- |
| No remote backend      | No analytics, no upload APIs                                                    |
| Sensitive query params | `SENSITIVE_QUERY_KEYS` redacted in `shared/redact.ts`                           |
| Secrets in scan        | Password / hidden / payment-like values never stored                            |
| Host permissions       | `http://*/*` and `https://*/*` so the tab can be scanned without an extra click |

---

## Cross-cutting concerns

| Topic                 | Implementation                                                            |
| --------------------- | ------------------------------------------------------------------------- |
| **Message schema**    | `MESSAGE_SCHEMA_VERSION` — unknown / malformed messages are dropped       |
| **Chunked transport** | `ELEMENT_CHUNK_SIZE` (40) so `runtime.sendMessage` stays small            |
| **Element budget**    | `MAX_ELEMENTS` (4000); iframe scans cap at 400                            |
| **Asset budget**      | 500 files, 8MB each, 80MB total                                           |
| **Scan TTL**          | 24h stale / 1h incomplete records purged on install and startup           |
| **CSS Information**   | `public/inspect-css.js` injected into the **top frame** (not `allFrames`) |
| **Coverage**          | Capture coverage, never a visual-match percentage                         |
| **Restricted URLs**   | `chrome:`, `edge:`, `about:`, Web Store → side panel fallback, no scan    |

---

## Design patterns

Hybrid: scanners are functional collectors; the service worker is an orchestrator; the UI is a store + view map.

| Pattern             | Where                        | Purpose                                     |
| ------------------- | ---------------------------- | ------------------------------------------- |
| Orchestrator        | `scan-orchestrator.ts`       | Session, inject, assemble, persist          |
| Message facade      | `message-router.ts`          | One switch for all `ExtensionMessage` types |
| Chunked transport   | `chunkScan` / `assembleScan` | Keep `runtime.sendMessage` payloads small   |
| Normalize pipeline  | `normalizeScan`              | Raw observation → tokens + outline          |
| Generator functions | `src/generators/`            | Pure `NormalizedDesign` → markdown / JSON   |
| Zustand store       | `useScanStore`               | Phase, design, view, inspect, options       |
| Feature views       | `sidepanel/features/`        | One view per bottom-nav surface             |
| Shared hooks        | `sidepanel/hooks/`           | Runtime messages, overlay resize, busy, …   |
| Panel helpers       | `sidepanel/lib/`             | Titles/counts, clipboard, chrome actions    |
| UI components       | `sidepanel/components/`      | Folder + `lib/` / `hooks/` when non-trivial |
| Coverage, not score | `validation/coverage.ts`     | What was captured, never a % visual match   |

```
Tab DOM → content scanners → PageScan chunks
                              → assemble + normalize → NormalizedDesign
                              → generators / ZIP
                              → Zustand → inspector views
```

---

## Tests

Vitest (`src/tests/`). No Chrome required.

| File                     | Covers                                        |
| ------------------------ | --------------------------------------------- |
| `colors.test.ts`         | Color parse, contrast, grouping               |
| `design-system.test.ts`  | Ramps, semantic colors, export filenames      |
| `device-presets.test.ts` | Breakpoint set, rotate, preview window sizing |
| `generators.test.ts`     | Markdown / JSON output, privacy               |
| `scan-filters.test.ts`   | DOM noise filters, class keep rules           |
| `sections.test.ts`       | Section detection                             |
| `utilities.test.ts`      | Filenames, ZIP paths, CSS format, messages    |
| `viewports.test.ts`      | Breakpoint helpers, frame merge               |

`fixtures/reference-page.html` is the manual Chrome fixture (see README).

---

## Remaining limits

- `chrome://`, `edge://`, and Web Store pages cannot be scanned
- Tainted canvas, blocked frames, or blocked downloads become **limitations**, not invented files
- Coverage is capture coverage, not a visual-match percentage
- Extra viewport capture may briefly resize the window, then restore it
- CSS Information can differ from CSS Peeper by a few rules or ~0.1s when a sheet is unreadable in one tool and fetched in the other
- Responsive preview cannot display pages that forbid iframe embedding (`X-Frame-Options` / CSP `frame-ancestors`)
- Picking a device does not change the live tab’s viewport (no Chrome debugger emulation)
