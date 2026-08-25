# Page2Design

Local-only Chrome **Manifest V3** extension that scans the active webpage after you click **Scan page** and exports one agent-ready ZIP. Nothing is sent to a backend.

The package helps Cursor, Claude Code, and similar coding agents recreate the **observed** page. It does not recover original source code, React components, or private form values.

**Repo:** [github.com/rahmat058/page-2-design](https://github.com/rahmat058/page-2-design)

Licensed under **[MIT](./LICENSE)**. How to contribute: **[CONTRIBUTING.md](./CONTRIBUTING.md)**. Conduct: **[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)**. Releases: **[CHANGELOG.md](./CHANGELOG.md)**.

For scan pipeline, folders, messages, ZIP layout, and privacy — see **[ARCHITECTURE.MD](./ARCHITECTURE.MD)**.

---

## Tech Stack

<div>
<img src="https://img.shields.io/badge/Chrome_MV3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white">
<img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white">
<img src="https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black">
<img src="https://img.shields.io/badge/Vite_7-646CFF?style=for-the-badge&logo=vite&logoColor=white">
<img src="https://img.shields.io/badge/Zustand-000000?style=for-the-badge&logo=react&logoColor=white">
<img src="https://img.shields.io/badge/Lucide-000000?style=for-the-badge&logo=lucide&logoColor=white">
<img src="https://img.shields.io/badge/JSZip-37AEE2?style=for-the-badge&logo=zip&logoColor=white">
<img src="https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white">
<img src="https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white">
<img src="https://img.shields.io/badge/Prettier-F7B93E?style=for-the-badge&logo=prettier&logoColor=black">
<img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge">
</div>

**Key pieces:** `content.js` (DOM scan + overlay) · `background.js` (orchestrator) · `sidepanel.html` (inspector UI) · IndexedDB (local scans) · generators for `AGENTS.md` / `DESIGN.md` / ZIP

---

## Features

- **Scan** — click **Scan page**; lazy content and extra breakpoints are on by default
- **Inspector** — floating overlay on normal sites; side panel on `chrome://` pages
- **Overview** — typography pair, palette, contrast, live **CSS Information**
- **Tokens** — colors, type, assets (images / icons / SVG)
- **Content** — visible copy only; passwords and hidden fields are never stored
- **Generate Markdown** — preview the same files that go in the ZIP
- **Export** — one ZIP for coding agents (`AGENTS.md`, `docs/DESIGN.md`, `assets/`)
- **Local-only** — host permissions are for the tab; nothing is uploaded

---

## Prerequisites

| Requirement | Version / notes        |
| ----------- | ---------------------- |
| **Node.js** | 18+ (repo uses npm)    |
| **Chrome**  | Current stable, MV3    |

---

## First-time setup

```bash
cd Page2Design
npm install
npm test
npm run typecheck
npm run lint
npm run build
```

`npm run build` writes the loadable extension into `dist`.

### Load the unpacked extension

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select the project **`dist`** folder, not the repo root  
   Example: `c:\Users\USER\Desktop\Page2Design\dist`
5. Pin **Page2Design**
6. Click the toolbar icon on a normal website — the **floating inspector** opens on the right (Overview, Colors, Typography, Assets). Chrome pages such as `chrome://` fall back to the side panel

Chrome will prompt for site access because the extension uses `http://*/*` and `https://*/*`. That lets it scan a tab, read extra frames, and download assets without an extra click on every page.

If you already loaded an older build, click **Reload** on the extension card. If Chrome still complains about permissions, **Remove** the extension and load `dist` again.

Do not test on `chrome://`, `edge://`, or the Chrome Web Store. Those pages cannot be scanned.

### Development

```bash
npm run dev
```

`dist` rebuilds on save. After each change: **Reload** the extension card, then refresh the page (and the side panel if it is docked).

---

## Scripts

| Command             | Description                                      |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | Watch-build `dist` (sidepanel + background + content) |
| `npm run build`     | Typecheck, then production `dist`                |
| `npm run typecheck` | `tsc --noEmit`                                   |
| `npm run lint`      | ESLint                                           |
| `npm run lint:fix`  | ESLint with `--fix`                              |
| `npm test`          | Vitest unit tests                                |
| `npm run test:watch`| Vitest watch                                     |
| `npm run format`    | Prettier                                         |
| `npm run commit`    | Commitizen prompt (emoji + conventional header)  |
| `npm run icons`     | Generate toolbar icons (does not overwrite `public/icons` on `build`) |

---

## How to test

Two layers: automated checks in the repo, then a real Chrome load of unpacked `dist`.

### 1. Automated tests (no Chrome)

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run build
```

Unit tests cover colors, filenames, generators, ZIP paths, viewport helpers, scan filters, and CSS formatting.

### 2. Controlled fixture (best first test)

1. In Chrome, open `fixtures/reference-page.html` (File → Open file, or drag the HTML onto Chrome)
2. Keep that tab selected
3. Open the Page2Design inspector and click **Identify tab**. You should see `Page2Design fixture`
4. Leave **Load lazy content** and extra viewport capture on
5. Click **Scan page**. The browser window should stay the same size

| View        | What should appear                                           |
| ----------- | ------------------------------------------------------------ |
| Overview    | Hostname, phase `ready`, element/text/color counts, coverage, CSS Information |
| Content     | Heading **Measured design, not guessed style**               |
| Images      | Hero graphic                                                 |
| Icons & SVG | Diamond icon                                                 |
| Colors      | Blue accent, paper background                                |
| Typography  | Georgia-style heading                                        |
| Layout      | Header / main / footer-style sections                        |

**Privacy check:** search the inspector (and later the ZIP) for `super-secret-password-123` and `hidden-auth-token`. Those must **not** appear. The visible placeholder `Your name` may appear.

### 3. Export check

1. Open **Export**
2. Click **Download ZIP** and save it
3. Unzip it

You should see:

- `AGENTS.md`, `CLAUDE.md`, `SKILL.md` at the root
- `.cursor/rules/recreate-reference-page.mdc`
- `assets/` (images, icons, svg)
- `docs/DESIGN.md`, `docs/prompts/`, `docs/references/`, `docs/screenshots/`

Open `AGENTS.md` first, then `docs/DESIGN.md`. Paths in the Markdown should match files that exist, or the gap should be listed in `docs/references/limitations.json`.

### 4. Real-site smoke test

Open a normal site (`https://example.com` or any public page), scan, and export again. Confirm:

- **Identify tab** shows that site without clicking the icon on the page first
- Images, colors, and typography come through
- Failed assets are listed, not invented
- The ZIP still opens

### After you change code

```bash
npm run build
```

Then **Reload** the extension card and refresh the page. During `npm run dev`, reload after each save.

### Extension icons

Toolbar icons come from `public/icons/`:

- `icon-16.png`
- `icon-32.png`
- `icon-48.png`
- `icon-128.png`

`npm run build` copies them into `dist`. It does not regenerate or overwrite them.

---

## Scan and export (everyday use)

1. Open a regular http(s) website tab
2. Open the Page2Design inspector
3. Review options (lazy content and extra viewports are on by default)
4. Click **Scan page**
5. Inspect Overview, Content, Images, Icons & SVG, Colors, Typography, and Layout
6. On **Export**, choose assets and download one ZIP

Sensitive query parameters are redacted. Password, hidden, and payment-like field values are never captured.

---

## Use the ZIP in Cursor or Claude Code

Unzip the archive, then open that folder (or copy it into the target repo) and ask the agent to follow `AGENTS.md`. Copy `assets/` into the app `public/` folder. The spec is `docs/DESIGN.md`; build and validation prompts are in `docs/prompts/`.

Typical contents:

```text
AGENTS.md, CLAUDE.md, SKILL.md
.cursor/rules/recreate-reference-page.mdc
assets/{images,icons,svg,fonts}/
docs/DESIGN.md
docs/prompts/{BUILD_PAGE,VALIDATE_PAGE}.md
docs/references/{CONTENT.md, design-tokens.json, layout.json, scan.json, asset-manifest.json, limitations.json}
docs/screenshots/{viewport,full-page}.png
```

Files that were not produced are omitted and listed in `docs/references/limitations.json`.

---

## Remaining limits

- `chrome://`, `edge://`, and Web Store pages still cannot be scanned
- A tainted canvas, a frame Chrome will not inject into, or a host that blocks the download is recorded as a limitation instead of invented
- Coverage is capture coverage, not a visual-match percentage
- Extra viewport capture may resize the browser window briefly, then restore it

Details: **[ARCHITECTURE.MD](./ARCHITECTURE.MD#remaining-limits)**.

---

## Contributing

Issues and pull requests are welcome. See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for setup, PR checks, and the local-only scan rule. Everyone in the project follows the **[Code of Conduct](./CODE_OF_CONDUCT.md)**.

## License

[MIT](./LICENSE) © 2026 [Kazi Rahamatullah](https://github.com/rahmat058).
