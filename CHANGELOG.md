# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2026-08-28

Patch release after the first Chrome Web Store publish: [Page2Design](https://chromewebstore.google.com/detail/page2design/mghjckjmfhadbceeaoigeglhbojeomjc).

### Added

- Open-source community files: MIT license, code of conduct, contributing guide, security policy, and changelog.
- `PRIVACY.md` for Chrome Web Store / end-user privacy disclosure (local-only processing).
- `STORE.md` Chrome Web Store summary and description copy.
- **Design System** bottom-nav tab: accordion for Colors, Typography, Components, Tokens, and Export. Builds Primary / Secondary / Accent / Neutral ramps from the scan, plus semantic colors only when they appear on the page. Buttons and badges use those ramps (solid / outline / ghost). Export snippets as `{page-slug}.tailwind-v4.Page2Design.css`, `.shadcn.Page2Design.css`, and `.dtcg.Page2Design.json` (CSS/JSON MIME types so Chrome does not force `.txt`).
- **Responsive** breakpoint checker (More Options). Device list stays in the main panel (search + category accordions). On the overlay, a Mac-style preview window opens to the left; width follows the selected breakpoint (phones stay compact; tablets up to 1024px CSS; desktops up to 1280px). Preview is an iframe of the current page URL so media queries apply — no `debugger` permission and no “started debugging this browser” bar. While Responsive is open, session `declarativeNetRequest` rules strip `X-Frame-Options` / CSP `frame-ancestors` **only** for that preview iframe (extension-initiated `sub_frame` to the active tab host). Device set: 1 fluid size, 15 phones, 11 tablets, 12 desktops.
- Design-system-style device cards (white surface, light border, lavender hover/selected shadow) matching Typography cards.

### Changed

- Side panel code layout: shared `hooks/` and `lib/`, folder-per-component (`PanelChrome`, `BottomNav`, `Segmented`, `VirtualList`, …) with colocated helpers; `App.tsx` kept as the shell only.
- Colors is now an alias of **Design System** (bottom nav). **Layout** is no longer a panel view; section/spacing tokens still export in `docs/references/layout.json`. More Options **Layout** is **Responsive**.
- Overlay host grows with the Responsive preview (panel 336px + gap + preview width, capped to the viewport). Preview and inspector drop shadows are off while the flyout is open so the gap between cards stays clean.
- Assets **List** view is a normal stacked list inside the collection scroller (no nested virtual list), so row spacing stays even.
- Developer GitHub / LinkedIn / website rows use the same card chrome as Design System export tiles.
- Chrome Web Store listing copy (`STORE.md`) matches current product: Design System, Responsive preview, and **More Options → Clear local scan data**.

### Fixed

- Responsive preview blank on sites that send `X-Frame-Options: DENY` or CSP `frame-ancestors` (header strip limited to the extension preview iframe).
- Responsive category accordions overlapping when several groups were expanded (groups no longer flex-shrink; the list scrolls).
- Design System CSS/SCSS downloads saving as `.txt` because of a `text/plain` MIME type.

## [1.0.0] - 2026-08-25

First Chrome Web Store release: [Page2Design](https://chromewebstore.google.com/detail/page2design/mghjckjmfhadbceeaoigeglhbojeomjc) (ID `mghjckjmfhadbceeaoigeglhbojeomjc`).

### Added

- Local-only Chrome Manifest V3 extension: scan the active tab and export one agent-ready ZIP (no backend).
- Floating inspector on http(s) pages; Chrome side panel fallback on restricted pages such as `chrome://`.
- Overview (typography pair, palette, contrast, live CSS Information), Tokens, Content, Layout, inspect mode, Generate Markdown, and Export.
- IndexedDB scan cache on device; host permissions used only to read the tab and download assets.
- Privacy: sensitive query parameters redacted; password, hidden, and payment-like field values never stored.
- Unit tests (Vitest), TypeScript, ESLint, and Vite builds for side panel, background, and content scripts.

[Unreleased]: https://github.com/rahmat058/page-2-design/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/rahmat058/page-2-design/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/rahmat058/page-2-design/releases/tag/v1.0.0
