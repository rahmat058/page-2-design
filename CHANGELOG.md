# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Open-source community files: MIT license, code of conduct, contributing guide, security policy, and changelog.
- `PRIVACY.md` for Chrome Web Store / end-user privacy disclosure (local-only processing).

### Changed

- Side panel code layout: shared `hooks/` and `lib/`, folder-per-component (`PanelChrome`, `BottomNav`, `Segmented`, `VirtualList`, …) with colocated helpers; `App.tsx` kept as the shell only.
- Colors tab **Design System** panel: color scales, typography pair/scale, component previews, spacing/radius/shadow tokens, and export (CSS / Tailwind / SCSS / JSON / Design.md).

## [1.0.0] - 2026-08-25

### Added

- Local-only Chrome Manifest V3 extension: scan the active tab and export one agent-ready ZIP (no backend).
- Floating inspector on http(s) pages; Chrome side panel fallback on restricted pages such as `chrome://`.
- Overview (typography pair, palette, contrast, live CSS Information), Tokens, Content, Layout, inspect mode, Generate Markdown, and Export.
- IndexedDB scan cache on device; host permissions used only to read the tab and download assets.
- Privacy: sensitive query parameters redacted; password, hidden, and payment-like field values never stored.
- Unit tests (Vitest), TypeScript, ESLint, and Vite builds for side panel, background, and content scripts.

[Unreleased]: https://github.com/rahmat058/page-2-design/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/rahmat058/page-2-design/releases/tag/v1.0.0
