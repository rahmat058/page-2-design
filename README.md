# Page2Design

Local-only Chrome Manifest V3 extension that scans the active webpage after you click **Scan page** and exports one agent-ready ZIP. Nothing is sent to a backend.

The package helps Cursor, Claude Code, and similar coding agents recreate the **observed** page. It does not recover original source code, React components, or private form values.

## How to test

There are two layers: automated checks in the repo, then a real Chrome load of the unpacked `dist` folder.

### 1. Automated tests (no Chrome)

```bash
npm install
npm test
```

That runs the unit tests (colors, filenames, generators, ZIP paths, viewport helpers). Also run:

```bash
npm run typecheck
npm run lint
npm run build
```

`npm run build` writes the loadable extension into `dist`.

### 2. Load the unpacked extension in Chrome

1. Run `npm run build` if `dist` is missing or stale.
2. Open `chrome://extensions`.
3. Turn on **Developer mode**.
4. Click **Load unpacked**.
5. Select the project **`dist`** folder, not the project root.
   - Example: `c:\Users\USER\Desktop\Page2Design\dist`
6. Pin **Page2Design**.
7. Click the toolbar icon. On a normal website this opens a **floating inspector** on the right (Overview, Colors, Typography, Assets). Chrome pages such as `chrome://` fall back to the side panel.

The inspector does **not** shrink the browser window during a scan. Extra breakpoints are inferred from CSS media queries.

Chrome will prompt for access to websites because the extension uses `http://*/*` and `https://*/*` host permissions. That lets it scan a tab, read extra frames, and download assets without an extra toolbar click on every page.

If you already loaded an older build, click **Reload** on the extension card. If Chrome still complains about permissions, **Remove** the extension and load `dist` again.

Do not test on `chrome://`, `edge://`, or the Chrome Web Store. Those pages cannot be scanned.

### 3. Controlled fixture (best first test)

1. In Chrome, open `fixtures/reference-page.html` (File → Open file, or drag the HTML onto Chrome).
2. Keep that tab selected.
3. Open the Page2Design side panel and click **Identify tab**. You should see `Page2Design fixture`.
4. Leave **Load lazy content** and **Capture desktop, tablet, and mobile viewports** on.
5. Click **Scan page**. The browser window should stay the same size.

Check these side-panel views:

| View        | What should appear                                           |
| ----------- | ------------------------------------------------------------ |
| Overview    | Hostname, phase `ready`, element/text/color counts, coverage |
| Content     | Heading **Measured design, not guessed style**               |
| Images      | Hero graphic                                                 |
| Icons & SVG | Diamond icon                                                 |
| Colors      | Blue accent, paper background                                |
| Typography  | Georgia-style heading                                        |
| Layout      | Header / main / footer-style sections                        |

**Privacy check:** search the side panel (and later the ZIP) for `super-secret-password-123` and `hidden-auth-token`. Those must **not** appear. The visible placeholder `Your name` may appear.

### 4. Export check

1. Open **Export**.
2. Click **Download ZIP** and save it.
3. Unzip it.

You should see:

- `AGENTS.md`, `CLAUDE.md`, `SKILL.md` at the root
- `.cursor/rules/recreate-reference-page.mdc`
- `assets/` (images, icons, svg)
- `docs/DESIGN.md`, `docs/prompts/`, `docs/references/`, `docs/screenshots/`

Open `AGENTS.md` first, then `docs/DESIGN.md`. Paths in the Markdown should match files that exist, or the gap should be listed in `docs/references/limitations.json`.

### 5. Real-site smoke test

Open a normal site (`https://example.com` or any public page), scan, and export again. Confirm:

- **Identify tab** shows that site without clicking the icon on the page first.
- Images, colors, and typography come through.
- Failed assets are listed, not invented.
- The ZIP still opens.

### 6. After you change code

```bash
npm run build
```

Then click **Reload** on the extension card in `chrome://extensions`, and refresh the side panel.

During development you can use `npm run dev` so `dist` rebuilds on save, then reload the extension after each change.

### Extension icons

The toolbar icon comes from your files in `public/icons/`:

- `icon-16.png`
- `icon-32.png`
- `icon-48.png`
- `icon-128.png`

`npm run build` copies those files into `dist`. It does not regenerate or overwrite them. After a rebuild, click **Reload** on the extension card so Chrome picks up the new icons.

## Scan and export (everyday use)

1. Open a regular http(s) website tab.
2. Open the Page2Design side panel.
3. Review options. Lazy content and extra viewports (desktop / tablet / mobile) are on by default.
4. Click **Scan page**.
5. Inspect Overview, Content, Images, Icons & SVG, Colors, Typography, and Layout.
6. On **Export**, choose assets and download one ZIP.

Sensitive query parameters are redacted. Password, hidden, and payment-like field values are never captured.

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

## Remaining limits

- `chrome://`, `edge://`, and Web Store pages still cannot be scanned.
- A tainted canvas, a frame Chrome will not inject into, or a host that blocks the download is recorded as a limitation instead of invented.
- Coverage is capture coverage, not a visual-match percentage.
- Extra viewport capture resizes the browser window briefly, then restores it.
