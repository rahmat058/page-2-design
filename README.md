# Page2Design (Chrome Extension)

Scan a live webpage and export one **agent-ready** design package — local-only, no backend.

[![Page2Design](./public/icons/icon128.png)](https://github.com/rahmat058/page-2-design)

<div>
<img src="https://img.shields.io/badge/Chrome_MV3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white">
<img src="https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black">
<img src="https://img.shields.io/badge/TypeScript_5.9-007ACC?style=for-the-badge&logo=typescript&logoColor=white">
<img src="https://img.shields.io/badge/Vite_7-646CFF?style=for-the-badge&logo=vite&logoColor=white">
<img src="https://img.shields.io/badge/Node.js_24-339933?style=for-the-badge&logo=nodedotjs&logoColor=white">
<img src="https://img.shields.io/badge/Zustand-000000?style=for-the-badge&logo=react&logoColor=white">
<img src="https://img.shields.io/badge/JSZip-37AEE2?style=for-the-badge&logo=zip&logoColor=white">
<img src="https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white">
<img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge">
</div>

The ZIP helps Cursor, Claude Code, and similar coding agents recreate the **observed** page. It does not recover original source, React trees, or private form values.

Deep dive: **[ARCHITECTURE.MD](./ARCHITECTURE.MD)** · Releases: **[CHANGELOG.md](./CHANGELOG.md)**

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Notes                       |
| ----------- | --------------------------- |
| **Node.js** | 24+ (npm)                   |
| **Chrome**  | Current stable, Manifest V3 |

### Local setup

```bash
git clone https://github.com/rahmat058/page-2-design.git
cd page-2-design
npm install
npm test
npm run build
```

`npm run build` writes the loadable extension into **`dist`**.

### Load the unpacked extension

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select the project **`dist`** folder (not the repo root)
5. Pin **Page2Design**
6. Open a normal `http(s)` site and click the toolbar icon — the floating inspector opens on the right

Chrome will ask for site access (`http://*/*`, `https://*/*`) so the extension can scan the tab and download assets. Do not test on `chrome://`, `edge://`, or the Chrome Web Store.

### Development

```bash
npm run dev
```

`dist` rebuilds on save. After each change: **Reload** the extension card, then refresh the page (and the side panel if it is open).

---

## 🎯 What you get

- **Local-only scan** — click **Scan page**; nothing is uploaded; IndexedDB stays on device
- **Floating inspector** — overlay on normal sites; Chrome side panel on restricted pages
- **Overview** — typography pair, palette, contrast, live **CSS Information**
- **Design System** — color ramps, type scale, component previews, spacing/radius/shadow tokens, and CSS / Tailwind / shadcn / JSON export
- **Typography & assets** — type cards; images, icons, and SVG in grid or list
- **Content** — visible copy only; passwords, hidden, and payment-like fields are never stored
- **Responsive** — More Options device picker plus a Mac-style breakpoint preview beside the overlay (iframe at CSS-pixel size; no page debugger)
- **Generate Markdown** — preview the same files that go in the ZIP
- **Agent-ready export** — one ZIP with `AGENTS.md`, `docs/DESIGN.md`, prompts, references, screenshots, and `assets/`
- **Privacy-aware** — sensitive query params redacted; gaps listed in `limitations.json`, never invented

---

## 🤖 Agent-ready ZIP

Unzip the archive, open that folder (or copy it into a target repo), and ask the agent to follow `AGENTS.md`. Copy `assets/` into the app `public/` folder. Spec: `docs/DESIGN.md`. Build / validate prompts: `docs/prompts/`.

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

### Everyday scan & export

1. Open a regular http(s) website tab
2. Open the Page2Design inspector
3. Leave lazy content and extra viewports on (defaults)
4. Click **Scan page**
5. Review Overview, Content, Assets, Design System, and Typography
6. Optionally open **More Options → Responsive** and pick a device to preview the page at that breakpoint
7. On **Export**, choose assets and download one ZIP

---

## 📁 Project structure

```text
Page2Design/
├── public/
│   ├── manifest.json          # MV3 manifest (copied to dist)
│   ├── inspect-css.js         # Injected for CSS Information
│   └── icons/                 # Toolbar icons you supply (16 / 32 / 48 / 128)
├── fixtures/                  # Local HTML fixture for first-run tests
├── scripts/build.mjs          # Vite: sidepanel + background + content
├── src/
│   ├── background/            # Service worker (scan, CSS, ZIP)
│   ├── content/               # DOM scan + overlay host
│   ├── sidepanel/             # React inspector UI
│   │   ├── App.tsx            # Shell: chrome, views, hooks
│   │   ├── hooks/             # Shared React hooks
│   │   ├── lib/               # View helpers, overlay, panel actions
│   │   ├── components/        # UI primitives (folder + lib/hooks)
│   │   ├── features/          # Overview, Design System, Typography, Assets, Responsive, …
│   │   └── store/             # Zustand scan store
│   ├── normalize/             # PageScan → NormalizedDesign
│   ├── generators/            # AGENTS.md, DESIGN.md, prompts, JSON refs
│   ├── export/                # ZIP layout and asset download
│   ├── storage/               # IndexedDB
│   ├── shared/                # Types, messages, redaction, device presets
│   └── tests/                 # Vitest
├── ARCHITECTURE.MD            # Pipeline, messages, privacy, limits
├── PRIVACY.md                 # Chrome Web Store privacy policy
├── CONTRIBUTING.md
└── LICENSE
```

More detail: **[ARCHITECTURE.MD](./ARCHITECTURE.MD#project-structure)**.

---

## ⚡ Built with

- [Chrome Manifest V3](https://developer.chrome.com/docs/extensions/mv3) — extension host
- [TypeScript](https://www.typescriptlang.org/) — typed messages and scan models
- [React 19](https://react.dev/) — inspector UI (overlay + side panel)
- [Vite 7](https://vitejs.dev/) — sidepanel, background, and content bundles
- [Zustand](https://zustand-demo.pmnd.rs/) — inspector state
- [JSZip](https://stuk.github.io/jszip/) — agent package export
- [Vitest](https://vitest.dev/) · [ESLint](https://eslint.org/) · [Prettier](https://prettier.io/) · [Husky](https://typicode.github.io/husky/) · [Commitlint](https://commitlint.js.org/)

---

## 🛠️ Scripts

| Command                           | Description                                     |
| --------------------------------- | ----------------------------------------------- |
| `npm run dev`                     | Watch-build `dist`                              |
| `npm run build`                   | Typecheck, then production `dist`               |
| `npm run typecheck`               | `tsc --noEmit`                                  |
| `npm run lint` / `lint:fix`       | ESLint                                          |
| `npm test` / `test:watch`         | Vitest                                          |
| `npm run format` / `format:check` | Prettier                                        |
| `npm run commit`                  | Commitizen prompt (emoji + conventional header) |

---

## 🧪 How to test

### Automated (no Chrome)

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run build
```

### Fixture (best first Chrome test)

1. Open `fixtures/reference-page.html` in Chrome
2. Identify tab → should show `Page2Design fixture`
3. **Scan page** (lazy content + extra viewports on)

| View          | Expect                                                           |
| ------------- | ---------------------------------------------------------------- |
| Overview      | Hostname, phase `ready`, counts, CSS Information                 |
| Content       | **Measured design, not guessed style**                           |
| Assets        | Hero graphic / diamond icon (grid or list)                       |
| Design System | Color ramps, type scale, tokens, export cards                    |
| Typography    | Georgia-style heading cards                                      |
| Responsive    | More Options → pick a phone and a desktop; preview width changes |

**Privacy:** `super-secret-password-123` and `hidden-auth-token` must **not** appear in the inspector or ZIP.

### Export check

Download ZIP → unzip → confirm `AGENTS.md`, `.cursor/rules/`, `assets/`, `docs/DESIGN.md`, prompts, references, screenshots.

### Extension icons

Place launcher PNGs in `public/icons/` yourself: `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`. Build copies them into `dist`; nothing regenerates them.

---

## ⚠️ Remaining limits

- `chrome://`, `edge://`, and Web Store pages cannot be scanned
- Tainted canvas, blocked frames, or failed downloads are recorded as limitations — not invented
- Coverage is capture coverage, not a visual-match percentage
- Extra viewport capture may briefly resize the browser window, then restore it
- Responsive preview is an iframe of the current URL. Framing headers (`X-Frame-Options` / CSP `frame-ancestors`) are removed **only for that preview iframe** while Responsive is open. A few sites still block with JavaScript frame-busting or third-party cookie rules.
- The live tab is **not** resized or debugger-emulated when you pick a device

Details: **[ARCHITECTURE.MD](./ARCHITECTURE.MD#remaining-limits)**.

---

## 🧹 Troubleshooting

If the inspector looks wrong, stuck, or out of date, **do not scan the page first**. Clear the stored scan, then scan again.

Stale IndexedDB data from a previous tab, a failed scan, or an extension reload can linger in the overlay. Scanning on top of that often keeps the bad result.

1. Open the Page2Design inspector on the tab
2. Click **More Options** (the ⋮ menu in the top chrome)
3. Click **Clear local scan data**
4. Confirm the panel is empty (no leftover Overview / Assets / Design System)
5. Then click **Scan page**

Use this whenever a scan fails, the wrong site’s tokens still show, Responsive or Design System looks empty after a successful scan, or you just reloaded the unpacked extension.

Clearing data only wipes **local** scans on this device. It does not change the live webpage.

---

## 🤝 Contributing

We welcome issues and pull requests. Please read **[CONTRIBUTING.md](./CONTRIBUTING.md)** and the **[Code of Conduct](./CODE_OF_CONDUCT.md)** before opening a PR.

- [Report a bug or request a feature](https://github.com/rahmat058/page-2-design/issues)
- [Security policy](./SECURITY.md)
- [Privacy policy](./PRIVACY.md)
- [Changelog](./CHANGELOG.md)

---

## 📄 License

Published under the [MIT](./LICENSE) license © 2026 [Kazi Rahamatullah](https://github.com/rahmat058).

---

## 👤 Made by

**[Kazi Rahamatullah](https://www.kazi-rahamatullah.com/)** ([@rahmat058](https://github.com/rahmat058)) — Frontend & JAMstack developer based in Dhaka, Bangladesh.

- [GitHub](https://github.com/rahmat058)
- [LinkedIn](https://www.linkedin.com/in/rahmat058/)
- [Website](https://www.kazi-rahamatullah.com/)
