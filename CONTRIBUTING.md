# Contributing to Page2Design

Thanks for helping improve this local-only Chrome extension. By participating,
you agree to follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## How to help

- **Bugs and limits** — open an [issue](https://github.com/rahmat058/page-2-design/issues) with Chrome version, the page you scanned (or `fixtures/reference-page.html`), and what you expected vs what you got.
- **Docs** — README and [ARCHITECTURE.MD](./ARCHITECTURE.MD) stay in sync: install and test in README, pipeline and folders in architecture.
- **Code** — small, focused pull requests are easier to review than large redesigns.

Do not send captured page content, passwords, or private ZIP exports in issues or PRs.

## Development setup

You need **Node.js 18+** and current Chrome.

```bash
git clone https://github.com/rahmat058/page-2-design.git
cd page-2-design
npm install
npm test
npm run typecheck
npm run lint
npm run build
```

Load the unpacked extension from the **`dist`** folder (`chrome://extensions` → Developer mode → Load unpacked). Everyday steps, fixture checks, and export verification are in [README.md](./README.md).

During work:

```bash
npm run dev
```

Reload the extension card after each rebuild, then refresh the scanned tab (and the side panel if it is open).

## Before you open a pull request

1. Run `npm test`, `npm run typecheck`, and `npm run lint`.
2. Format with `npm run format` if you touched files Prettier covers.
3. Smoke-test with `fixtures/reference-page.html`: Identify tab, Scan page, Overview (including CSS Information), and a ZIP export. Password and hidden fixture values must not appear in the inspector or ZIP.
4. If you change scan, messages, storage, or ZIP layout, update [ARCHITECTURE.MD](./ARCHITECTURE.MD) and add a note under **Unreleased** in [CHANGELOG.md](./CHANGELOG.md).

## Git hooks

`npm install` runs Husky (`prepare`). Hooks:

- **pre-commit** — lint-staged on `src/**/*.{ts,tsx,js,jsx}` (`npm run lint`, then `npm run format`)
- **commit-msg** — [Conventional Commits](https://www.conventionalcommits.org/) plus a `PROJ-` issue id in the footer
- **pre-push** — `npm run lint && npm run format`

Fix lint locally with `npm run lint:fix`.

## Commit messages

The `commit-msg` hook rejects messages that are not conventional or that omit a
`PROJ-` reference. Use this shape:

```text
<type>(optional-scope): short summary in lowercase

Optional body: what changed and why.

PROJ-123
```

- **Header** — `type` is required; `scope` is optional; summary is imperative and about 72 characters or less
- **Footer** — at least one `PROJ-` id (for example `PROJ-1`). GitHub `#12` is not enough for this rule
- **Breaking change** — add `!` after the type (or type+scope), and a `BREAKING CHANGE:` footer when the public API or ZIP layout changes

### Types

| Type | When to use |
| ---- | ----------- |
| `feat` | User-facing behavior (scan, inspector, export) |
| `fix` | Bug fix |
| `docs` | README, architecture, license, contributing, changelog, code of conduct |
| `style` | Formatting only (Prettier, no logic change) |
| `refactor` | Internal change with no feature or fix |
| `perf` | Performance |
| `test` | Tests only |
| `build` | Vite, TypeScript, npm dependencies used to build the extension |
| `ci` | Hooks, Commitlint, lint-staged, GitHub Actions |
| `chore` | Maintenance that does not fit the types above |
| `revert` | Revert a previous commit |

Optional scopes: `overlay`, `sidepanel`, `background`, `content`, `scan`, `export`, `docs`.

### Community files (`docs`)

```text
docs: add mit license

PROJ-1
```

```text
docs: add contributor covenant code of conduct

PROJ-1
```

```text
docs: add contributing guide and changelog

PROJ-1
```

```text
docs: document conventional commit examples

PROJ-1
```

### Other examples

```text
feat(sidepanel): show css information on overview

PROJ-2
```

```text
feat(export): include limitations.json in the zip

Capture gaps instead of inventing missing assets.

PROJ-3
```

```text
fix(scan): skip password and hidden field values

PROJ-4
```

```text
fix(overlay): restore window size after extra viewport capture

PROJ-5
```

```text
style(sidepanel): apply prettier to overview view

PROJ-6
```

```text
refactor(background): split message router from scan orchestrator

PROJ-7
```

```text
perf(content): walk visible nodes in smaller chunks

PROJ-8
```

```text
test: cover zip paths and redacted query params

PROJ-9
```

```text
build: bump vite and lock chrome types

PROJ-10
```

```text
ci: add husky lint-staged and commitlint

PROJ-11
```

```text
chore: ignore editor folders in git

PROJ-12
```

```text
revert: revert "feat(export): include limitations.json in the zip"

PROJ-3
```

```text
feat(export)!: drop unused fonts folder from the zip

BREAKING CHANGE: agents must read assets from assets/images, assets/icons, and assets/svg only.

PROJ-13
```

### Rejected by Commitlint

```text
Updated code of conduct
```

Missing type and missing `PROJ-` footer.

```text
feat: add code of conduct
```

Missing `PROJ-` footer.

```text
Feat: add code of conduct

PROJ-1
```

Type must be lowercase (`feat`, not `Feat`).

## Pull requests

- Branch from `main` (or the default branch).
- Keep the change scoped: one concern per PR when you can.
- Describe **why**, not only what files changed.
- Do not commit `dist`, `node_modules`, or personal scan data.

## Project map

| Area | Path |
| ---- | ---- |
| Service worker | `src/background/` |
| Content script / overlay host | `src/content/` |
| Inspector UI | `src/sidepanel/` |
| Shared types and messages | `src/shared/` |
| ZIP generators | `src/generators/`, `src/export/` |
| Tests | `src/tests/` |

Scan stays on-device. Do not add a backend, analytics, or network calls that upload page content.

## License

Contributions are licensed under the [MIT License](./LICENSE).
