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

`npm install` runs Husky (`prepare`). Hooks run in this order:

1. **pre-commit** — lint-staged (`eslint --fix` + Prettier on staged files), then `npm test` (Vitest). The hook reattaches `/dev/tty` when possible so Windows can show the same spinner/checkmark UI as macOS.
2. **commit-msg** — [Conventional Commits](https://www.conventionalcommits.org/)
3. **pre-push** — `npm run lint:fix` and `npm run format` on the whole repo; if anything changes, the push stops so you can commit the fixes first

If commit output still looks plain on Windows, use [Windows Terminal](https://aka.ms/terminal) and update [Git for Windows](https://git-scm.com/downloads) (2.36+ handles hook TTYs better). Your machine is on Git 2.30.1, which is also why lint-staged 17 was pinned down earlier.

## Commit messages

The `commit-msg` hook rejects messages that are not conventional. Type emojis are
optional on `git commit -m`, and included automatically when you run
`npm run commit` (`emojiInHeader`). Use this shape:

```text
✨ feat(optional-scope): short summary in lowercase

Optional body: what changed and why.
```

- **Header** — optional type emoji (trailing space), then `type`, optional `scope`, then the summary
- **Issues** — optional GitHub refs in the body/footer (for example `Closes #12`)
- **Breaking change** — add `!` after the type (or type+scope), and a `BREAKING CHANGE:` footer when the public API or ZIP layout changes
- **Prompt** — `npm run commit` after `git add` (Commitizen + Commitlint). Emojis in the type list include a trailing space so VS Code aligns the menu.

### Types

| Type       | Emoji | When to use                                                             |
| ---------- | ----- | ----------------------------------------------------------------------- |
| `feat`     | ✨    | User-facing behavior (scan, inspector, export)                          |
| `fix`      | 🐛    | Bug fix                                                                 |
| `docs`     | 📚    | README, architecture, license, contributing, changelog, code of conduct |
| `style`    | 💎    | Formatting only (Prettier, no logic change)                             |
| `refactor` | 📦    | Internal change with no feature or fix                                  |
| `perf`     | 🚀    | Performance                                                             |
| `test`     | 🚨    | Tests only                                                              |
| `build`    | 🛠️    | Vite, TypeScript, npm dependencies used to build the extension          |
| `ci`       | ⚙️    | Hooks, Commitlint, lint-staged, GitHub Actions                          |
| `chore`    | ♻️    | Maintenance that does not fit the types above                           |
| `revert`   | 🗑️    | Revert a previous commit                                                |

Optional scopes: `overlay`, `sidepanel`, `background`, `content`, `scan`, `export`, `docs`.

### Community files (`docs`)

```text
📚 docs: add mit license
```

```text
docs: add contributor covenant code of conduct
```

```text
docs: add contributing guide and changelog
```

```text
docs: document conventional commit examples
```

### Other examples

```text
✨ feat(sidepanel): show css information on overview
```

```text
feat(export): include limitations.json in the zip

Capture gaps instead of inventing missing assets.
```

```text
fix(scan): skip password and hidden field values
```

```text
fix(overlay): restore window size after extra viewport capture
```

```text
style(sidepanel): apply prettier to overview view
```

```text
refactor(background): split message router from scan orchestrator
```

```text
perf(content): walk visible nodes in smaller chunks
```

```text
test: cover zip paths and redacted query params
```

```text
build: bump vite and lock chrome types
```

```text
ci: add husky lint-staged and commitlint
```

```text
chore: ignore editor folders in git
```

```text
revert: revert "feat(export): include limitations.json in the zip"
```

```text
feat(export)!: drop unused fonts folder from the zip

BREAKING CHANGE: agents must read assets from assets/images, assets/icons, and assets/svg only.
```

### Rejected by Commitlint

```text
Updated code of conduct
```

Missing conventional `type:`.

```text
Feat: add code of conduct
```

Type must be lowercase (`feat`, not `Feat`).

## Pull requests

- Branch from `main` (or the default branch).
- Keep the change scoped: one concern per PR when you can.
- Describe **why**, not only what files changed.
- Do not commit `dist`, `node_modules`, or personal scan data.

## Project map

| Area                          | Path                             |
| ----------------------------- | -------------------------------- |
| Service worker                | `src/background/`                |
| Content script / overlay host | `src/content/`                   |
| Inspector UI                  | `src/sidepanel/`                 |
| Shared types and messages     | `src/shared/`                    |
| ZIP generators                | `src/generators/`, `src/export/` |
| Tests                         | `src/tests/`                     |

Scan stays on-device. Do not add a backend, analytics, or network calls that upload page content.

## License

Contributions are licensed under the [MIT License](./LICENSE).
